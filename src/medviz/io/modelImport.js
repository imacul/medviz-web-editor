import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

import { simplifyGeometryToTargetTriangles } from '../mesh/optimize';
import { parseSTL } from './stlParser';

const SUPPORTED_EXTENSIONS = new Set(['stl', 'obj', 'ply']);
const LARGE_MODEL_TRIANGLES = 300000;
const SIMPLIFY_TRIANGLES_THRESHOLD = 1000000;
const SIMPLIFY_TRIANGLES_TARGET = 850000;
const HARD_TRIANGLE_LIMIT = 2500000;
const TYPED_ARRAYS = {
  Float32Array,
  Uint32Array,
  Uint16Array,
  Uint8Array,
  Int32Array,
  Int16Array,
  Int8Array,
};

function getExtension(fileName) {
  const dotIndex = fileName.lastIndexOf('.');
  if (dotIndex < 0) return '';
  return fileName.slice(dotIndex + 1).toLowerCase();
}

function ensureNonIndexedGeometry(geometry) {
  return geometry.index ? geometry.toNonIndexed() : geometry;
}

function toIndexedGeometry(geometry) {
  const nonIndexed = geometry.index ? geometry.toNonIndexed() : geometry.clone();
  const indexed = mergeVertices(nonIndexed, 1e-4);
  if (indexed !== nonIndexed) {
    nonIndexed.dispose();
  }
  indexed.computeVertexNormals();
  indexed.computeBoundingBox();
  return indexed;
}

function normalizeGeometry(geometry) {
  const result = geometry.clone();

  result.computeBoundingBox();
  const bbox = result.boundingBox;
  if (!bbox) return result;

  const center = new THREE.Vector3();
  bbox.getCenter(center);
  result.translate(-center.x, -center.y, -center.z);

  const size = new THREE.Vector3();
  bbox.getSize(size);
  const sourceBounds = {
    x: Number(size.x.toFixed(2)),
    y: Number(size.y.toFixed(2)),
    z: Number(size.z.toFixed(2)),
  };
  const maxDim = Math.max(size.x, size.y, size.z);
  const safeScale = maxDim > 0 ? 5 / maxDim : 1;
  result.scale(safeScale, safeScale, safeScale);

  result.computeBoundingBox();
  result.computeVertexNormals();

  const indexed = toIndexedGeometry(result);
  indexed.userData = {
    ...indexed.userData,
    normalizationScale: safeScale,
    sourceMaxDimension: maxDim,
    sourceBounds,
  };
  result.dispose();
  return indexed;
}

function geometryFromObjRoot(root) {
  root.updateMatrixWorld(true);
  const geometries = [];

  root.traverse((child) => {
    if (!child.isMesh || !child.geometry) return;
    const g = child.geometry.clone();
    g.applyMatrix4(child.matrixWorld);
    geometries.push(ensureNonIndexedGeometry(g));
  });

  if (geometries.length === 0) {
    throw new Error('OBJ file did not contain mesh geometry.');
  }

  if (geometries.length === 1) {
    return geometries[0];
  }

  const merged = mergeGeometries(geometries, false);
  geometries.forEach((g) => g.dispose());

  if (!merged) {
    throw new Error('Failed to merge OBJ mesh geometry.');
  }

  return merged;
}

function getGeometryStats(geometry) {
  if (!geometry.boundingBox) {
    geometry.computeBoundingBox();
  }

  const position = geometry.getAttribute('position');
  const vertices = position?.count ?? 0;
  const triangles = geometry.index ? Math.floor(geometry.index.count / 3) : Math.floor(vertices / 3);
  const bbox = geometry.boundingBox;

  return {
    vertices,
    triangles,
    bounds: bbox
      ? {
          x: Number((bbox.max.x - bbox.min.x).toFixed(2)),
          y: Number((bbox.max.y - bbox.min.y).toFixed(2)),
          z: Number((bbox.max.z - bbox.min.z).toFixed(2)),
        }
      : { x: 0, y: 0, z: 0 },
  };
}

function scaleBounds(bounds, factor) {
  return {
    x: Number((Number(bounds?.x ?? 0) * factor).toFixed(2)),
    y: Number((Number(bounds?.y ?? 0) * factor).toFixed(2)),
    z: Number((Number(bounds?.z ?? 0) * factor).toFixed(2)),
  };
}

function inferSourceUnits(sourceMaxDimension) {
  if (!Number.isFinite(sourceMaxDimension) || sourceMaxDimension <= 0) {
    return {
      sourceUnit: 'unknown',
      unitScaleToMm: null,
      unitInference: 'No reliable source dimensions were available.',
    };
  }

  if (sourceMaxDimension <= 5) {
    return {
      sourceUnit: 'm',
      unitScaleToMm: 1000,
      unitInference: 'Estimated from imported model size because STL/OBJ/PLY units are not explicit.',
    };
  }

  if (sourceMaxDimension <= 50) {
    return {
      sourceUnit: 'cm',
      unitScaleToMm: 10,
      unitInference: 'Estimated from imported model size because STL/OBJ/PLY units are not explicit.',
    };
  }

  return {
    sourceUnit: 'mm',
    unitScaleToMm: 1,
    unitInference: 'Estimated from imported model size because STL/OBJ/PLY units are not explicit.',
  };
}

function getModelMeta(geometry, fileInfo) {
  const stats = getGeometryStats(geometry);
  const normalizationScale = geometry.userData?.normalizationScale ?? 1;
  const sourceBounds =
    geometry.userData?.sourceBounds ??
    (normalizationScale > 0 ? scaleBounds(stats.bounds, 1 / normalizationScale) : stats.bounds);
  const sourceMaxDimension = geometry.userData?.sourceMaxDimension ?? Math.max(sourceBounds.x, sourceBounds.y, sourceBounds.z);
  const { sourceUnit, unitScaleToMm, unitInference } = inferSourceUnits(sourceMaxDimension);

  return {
    name: fileInfo.name,
    fileSizeBytes: fileInfo.size,
    vertices: stats.vertices,
    triangles: stats.triangles,
    normalizedBounds: stats.bounds,
    sourceBounds,
    estimatedBoundsMm: unitScaleToMm ? scaleBounds(sourceBounds, unitScaleToMm) : null,
    normalizationScale,
    sourceMaxDimension,
    sourceUnit,
    unitScaleToMm,
    unitInference,
  };
}

function createWorker() {
  return new Worker(new URL('./modelImport.worker.js', import.meta.url), { type: 'module' });
}

function normalizeSource(source) {
  if (source instanceof File) {
    return { kind: 'local', file: source };
  }

  if (source && source.kind === 'remote' && typeof source.url === 'string' && typeof source.fileName === 'string') {
    return source;
  }

  throw new Error('Unsupported model source.');
}

async function readSource(source) {
  if (source instanceof File) {
    const extension = getExtension(source.name);
    if (extension === 'obj') {
      return {
        extension,
        fileInfo: { name: source.name, size: source.size },
        payload: await source.text(),
      };
    }

    return {
      extension,
      fileInfo: { name: source.name, size: source.size },
      payload: await source.arrayBuffer(),
    };
  }

  const response = await fetch(source.url);
  if (!response.ok) {
    throw new Error('Failed to download the stored model for this case.');
  }

  const extension = getExtension(source.fileName);
  const size = Number(response.headers.get('content-length')) || source.fileSizeBytes || 0;

  if (extension === 'obj') {
    return {
      extension,
      fileInfo: { name: source.fileName, size },
      payload: await response.text(),
    };
  }

  return {
    extension,
    fileInfo: { name: source.fileName, size },
    payload: await response.arrayBuffer(),
  };
}

function parseGeometry(extension, payload) {
  if (extension === 'stl') {
    return parseSTL(payload);
  }

  if (extension === 'obj') {
    return geometryFromObjRoot(new OBJLoader().parse(payload));
  }

  if (extension === 'ply') {
    return new PLYLoader().parse(payload);
  }

  throw new Error(`Unsupported file type ".${extension}". Supported: STL, OBJ, PLY.`);
}

function reconstructGeometry(payload) {
  const geometry = new THREE.BufferGeometry();

  Object.entries(payload.attributes).forEach(([name, attribute]) => {
    const TypedArray = TYPED_ARRAYS[attribute.type] || Float32Array;
    const array = attribute.array instanceof TypedArray ? attribute.array : new TypedArray(attribute.array);
    geometry.setAttribute(
      name,
      new THREE.BufferAttribute(array, attribute.itemSize, attribute.normalized)
    );
  });

  if (payload.index) {
    const TypedArray = TYPED_ARRAYS[payload.index.type] || Uint32Array;
    const indexArray =
      payload.index.array instanceof TypedArray ? payload.index.array : new TypedArray(payload.index.array);
    geometry.setIndex(new THREE.BufferAttribute(indexArray, payload.index.itemSize, payload.index.normalized));
  }

  geometry.userData = payload.userData ?? {};
  geometry.computeBoundingBox();
  if (!geometry.getAttribute('normal')) {
    geometry.computeVertexNormals();
  }

  return geometry;
}

function runWorkerAction(action, source) {
  const worker = createWorker();

  return new Promise((resolve, reject) => {
    const id = crypto.randomUUID();

    worker.onmessage = (event) => {
      const message = event.data;
      if (message.id !== id) {
        return;
      }

      worker.terminate();

      if (message.error) {
        reject(new Error(message.error));
        return;
      }

      resolve(message.result);
    };

    worker.onerror = (event) => {
      worker.terminate();
      reject(new Error(event.message || 'Failed to process model.'));
    };

    worker.postMessage({
      id,
      action,
      source: normalizeSource(source),
    });
  });
}

async function importModelSourceFallback(source) {
  const normalizedSource = normalizeSource(source);
  const { extension, fileInfo, payload } = await readSource(
    normalizedSource.kind === 'local' ? normalizedSource.file : normalizedSource
  );

  if (!SUPPORTED_EXTENSIONS.has(extension)) {
    throw new Error(`Unsupported file type ".${extension}". Supported: STL, OBJ, PLY.`);
  }

  let geometry = parseGeometry(extension, payload);
  if (!geometry || !geometry.getAttribute('position')) {
    throw new Error('Imported file does not contain valid geometry.');
  }

  const normalized = normalizeGeometry(geometry);
  geometry.dispose();
  geometry = normalized;

  const sourceMeta = getModelMeta(geometry, fileInfo);
  if (sourceMeta.triangles > HARD_TRIANGLE_LIMIT) {
    geometry.dispose();
    throw new Error(
      `Model too large (${sourceMeta.triangles.toLocaleString()} triangles). Please simplify before importing.`
    );
  }

  let wasSimplified = false;
  if (sourceMeta.triangles > SIMPLIFY_TRIANGLES_THRESHOLD) {
    const simplified = simplifyGeometryToTargetTriangles(geometry, SIMPLIFY_TRIANGLES_TARGET);
    geometry.dispose();
    geometry = simplified;
    wasSimplified = true;
  }

  const modelMeta = getModelMeta(geometry, fileInfo);
  return {
    geometry,
    modelMeta,
    extension,
    wasSimplified,
    sourceTriangles: sourceMeta.triangles,
    shouldWarnLargeModel: !wasSimplified && modelMeta.triangles > LARGE_MODEL_TRIANGLES,
  };
}

export function isSupportedModelFile(file) {
  return Boolean(file?.name) && SUPPORTED_EXTENSIONS.has(getExtension(file.name));
}

export function isSupportedModelSource(source) {
  if (source instanceof File) {
    return isSupportedModelFile(source);
  }

  if (source && source.kind === 'remote' && typeof source.fileName === 'string') {
    return SUPPORTED_EXTENSIONS.has(getExtension(source.fileName));
  }

  return false;
}

export async function importModelSource(source) {
  try {
    const result = await runWorkerAction('import-model', source);

    return {
      geometry: reconstructGeometry(result.geometry),
      modelMeta: result.modelMeta,
      extension: result.extension,
      wasSimplified: result.wasSimplified,
      sourceTriangles: result.sourceTriangles,
      shouldWarnLargeModel: result.shouldWarnLargeModel,
    };
  } catch (error) {
    console.warn('Worker import failed, falling back to direct import.', error);
    return importModelSourceFallback(source);
  }
}

export async function importModelFile(file) {
  return importModelSource(file);
}

export async function buildOptimizedModelAsset(source) {
  const result = await runWorkerAction('build-optimized-model', source);
  return result.asset;
}
