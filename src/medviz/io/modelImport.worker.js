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

async function readSource(source) {
  if (source.kind === 'remote') {
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

  const file = source.file;
  const extension = getExtension(file.name);

  if (extension === 'obj') {
    return {
      extension,
      fileInfo: { name: file.name, size: file.size },
      payload: await file.text(),
    };
  }

  return {
    extension,
    fileInfo: { name: file.name, size: file.size },
    payload: await file.arrayBuffer(),
  };
}

function parseGeometry(extension, payload) {
  if (extension === 'stl') {
    return parseSTL(payload);
  }

  if (extension === 'obj') {
    const root = new OBJLoader().parse(payload);
    return geometryFromObjRoot(root);
  }

  if (extension === 'ply') {
    return new PLYLoader().parse(payload);
  }

  throw new Error(`Unsupported file type ".${extension}". Supported: STL, OBJ, PLY.`);
}

function serializeGeometry(geometry) {
  const attributes = {};
  const transferable = [];

  Object.entries(geometry.attributes).forEach(([name, attribute]) => {
    const clonedArray = attribute.array.slice(0);
    attributes[name] = {
      array: clonedArray,
      itemSize: attribute.itemSize,
      normalized: attribute.normalized,
      type: clonedArray.constructor.name,
    };
    transferable.push(clonedArray.buffer);
  });

  let index = null;
  if (geometry.index) {
    const indexArray = geometry.index.array.slice(0);
    index = {
      array: indexArray,
      itemSize: geometry.index.itemSize,
      normalized: geometry.index.normalized,
      type: indexArray.constructor.name,
    };
    transferable.push(indexArray.buffer);
  }

  return {
    geometry: {
      attributes,
      index,
      userData: geometry.userData ?? {},
    },
    transferable,
  };
}

function geometryToBinaryStl(geometry) {
  const source = geometry.index ? geometry.toNonIndexed() : geometry.clone();
  const position = source.getAttribute('position');
  const triangleCount = Math.floor(position.count / 3);
  const buffer = new ArrayBuffer(84 + triangleCount * 50);
  const view = new DataView(buffer);
  view.setUint32(80, triangleCount, true);

  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const cb = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const normal = new THREE.Vector3();

  let offset = 84;
  for (let i = 0; i < position.count; i += 3) {
    a.fromBufferAttribute(position, i);
    b.fromBufferAttribute(position, i + 1);
    c.fromBufferAttribute(position, i + 2);

    cb.subVectors(c, b);
    ab.subVectors(a, b);
    normal.crossVectors(cb, ab).normalize();

    view.setFloat32(offset, normal.x, true);
    view.setFloat32(offset + 4, normal.y, true);
    view.setFloat32(offset + 8, normal.z, true);

    view.setFloat32(offset + 12, a.x, true);
    view.setFloat32(offset + 16, a.y, true);
    view.setFloat32(offset + 20, a.z, true);

    view.setFloat32(offset + 24, b.x, true);
    view.setFloat32(offset + 28, b.y, true);
    view.setFloat32(offset + 32, b.z, true);

    view.setFloat32(offset + 36, c.x, true);
    view.setFloat32(offset + 40, c.y, true);
    view.setFloat32(offset + 44, c.z, true);

    view.setUint16(offset + 48, 0, true);
    offset += 50;
  }

  source.dispose();
  return buffer;
}

function toReviewFileName(fileName) {
  const dotIndex = fileName.lastIndexOf('.');
  const baseName = dotIndex >= 0 ? fileName.slice(0, dotIndex) : fileName;
  return `${baseName}-review.stl`;
}

async function importModel(source) {
  const { extension, fileInfo, payload } = await readSource(source);
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
  const serialized = serializeGeometry(geometry);
  geometry.dispose();

  return {
    kind: 'import-model-result',
    geometry: serialized.geometry,
    modelMeta,
    extension,
    wasSimplified,
    sourceTriangles: sourceMeta.triangles,
    shouldWarnLargeModel: !wasSimplified && modelMeta.triangles > LARGE_MODEL_TRIANGLES,
    transferable: serialized.transferable,
  };
}

async function buildOptimizedModel(source) {
  const { extension, fileInfo, payload } = await readSource(source);
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

  const initialMeta = getModelMeta(geometry, fileInfo);
  const shouldCreateReviewCopy = extension === 'obj' || initialMeta.triangles > LARGE_MODEL_TRIANGLES;

  if (!shouldCreateReviewCopy) {
    geometry.dispose();
    return { kind: 'build-optimized-model-result', asset: null, transferable: [] };
  }

  if (initialMeta.triangles > HARD_TRIANGLE_LIMIT) {
    geometry.dispose();
    return { kind: 'build-optimized-model-result', asset: null, transferable: [] };
  }

  let optimizedGeometry = geometry;
  let wasSimplified = false;
  if (initialMeta.triangles > SIMPLIFY_TRIANGLES_THRESHOLD) {
    optimizedGeometry = simplifyGeometryToTargetTriangles(geometry, SIMPLIFY_TRIANGLES_TARGET);
    geometry.dispose();
    wasSimplified = true;
  }

  const optimizedMeta = getModelMeta(optimizedGeometry, {
    name: toReviewFileName(fileInfo.name),
    size: 0,
  });
  const stlBuffer = geometryToBinaryStl(optimizedGeometry);
  optimizedGeometry.dispose();

  return {
    kind: 'build-optimized-model-result',
    asset: {
      fileName: toReviewFileName(fileInfo.name),
      contentType: 'model/stl',
      buffer: stlBuffer,
      wasSimplified,
      sourceTriangles: initialMeta.triangles,
      optimizedTriangles: optimizedMeta.triangles,
    },
    transferable: [stlBuffer],
  };
}

self.onmessage = async (event) => {
  const { id, action, source } = event.data;

  try {
    const result =
      action === 'build-optimized-model'
        ? await buildOptimizedModel(source)
        : await importModel(source);

    self.postMessage({ id, result }, result.transferable);
  } catch (error) {
    self.postMessage({
      id,
      error: error instanceof Error ? error.message : 'Failed to process model.',
    });
  }
};
