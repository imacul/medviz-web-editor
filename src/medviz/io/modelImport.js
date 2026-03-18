import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { parseSTL } from './stlParser';

const SUPPORTED_EXTENSIONS = new Set(['stl', 'obj', 'ply']);

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
  const maxDim = Math.max(size.x, size.y, size.z);
  const safeScale = maxDim > 0 ? 5 / maxDim : 1;
  result.scale(safeScale, safeScale, safeScale);

  result.computeBoundingBox();
  result.computeVertexNormals();

  const indexed = toIndexedGeometry(result);
  indexed.userData = {
    ...indexed.userData,
    normalizationScale: safeScale,
    sourceMaxDimension: maxDim
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

function getModelMeta(geometry, file) {
  const position = geometry.getAttribute('position');
  const vertices = position.count;
  const triangles = geometry.index ? Math.floor(geometry.index.count / 3) : Math.floor(vertices / 3);
  const bbox = geometry.boundingBox;
  const bounds = bbox
    ? {
        x: (bbox.max.x - bbox.min.x).toFixed(2),
        y: (bbox.max.y - bbox.min.y).toFixed(2),
        z: (bbox.max.z - bbox.min.z).toFixed(2)
      }
    : { x: '0.00', y: '0.00', z: '0.00' };

  return {
    name: file.name,
    fileSizeBytes: file.size,
    vertices,
    triangles,
    bounds,
    normalizationScale: geometry.userData?.normalizationScale ?? 1,
    sourceMaxDimension: geometry.userData?.sourceMaxDimension ?? null
  };
}

export function isSupportedModelFile(file) {
  return SUPPORTED_EXTENSIONS.has(getExtension(file.name));
}

export async function importModelFile(file) {
  const ext = getExtension(file.name);
  if (!SUPPORTED_EXTENSIONS.has(ext)) {
    throw new Error(`Unsupported file type ".${ext}". Supported: STL, OBJ, PLY.`);
  }

  let geometry;

  if (ext === 'stl') {
    const arrayBuffer = await file.arrayBuffer();
    geometry = parseSTL(arrayBuffer);
  } else if (ext === 'obj') {
    const text = await file.text();
    const root = new OBJLoader().parse(text);
    geometry = geometryFromObjRoot(root);
  } else if (ext === 'ply') {
    const arrayBuffer = await file.arrayBuffer();
    geometry = new PLYLoader().parse(arrayBuffer);
  }

  if (!geometry || !geometry.getAttribute('position')) {
    throw new Error('Imported file does not contain valid geometry.');
  }

  const normalized = normalizeGeometry(geometry);
  geometry.dispose();
  const modelMeta = getModelMeta(normalized, file);
  return { geometry: normalized, modelMeta, extension: ext };
}
