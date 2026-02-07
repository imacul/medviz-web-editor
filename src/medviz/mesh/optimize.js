import { SimplifyModifier } from 'three/examples/jsm/modifiers/SimplifyModifier.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const simplifier = new SimplifyModifier();

export function simplifyGeometryToTargetTriangles(sourceGeometry, targetTriangles) {
  const nonIndexed = sourceGeometry.index ? sourceGeometry.toNonIndexed() : sourceGeometry.clone();
  const position = nonIndexed.getAttribute('position');
  const currentVertices = position?.count ?? 0;
  const currentTriangles = currentVertices / 3;

  if (!position || currentTriangles <= targetTriangles) {
    return sourceGeometry.clone();
  }

  const targetVertices = Math.max(3, Math.floor(targetTriangles * 3));
  const removeCount = Math.max(0, currentVertices - targetVertices);
  const simplified = simplifier.modify(nonIndexed, removeCount);
  if (simplified !== nonIndexed) {
    nonIndexed.dispose();
  }

  const indexed = mergeVertices(simplified, 1e-4);
  if (indexed !== simplified) {
    simplified.dispose();
  }

  indexed.computeVertexNormals();
  indexed.computeBoundingBox();
  return indexed;
}
