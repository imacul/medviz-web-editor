import * as THREE from 'three';

function toNonIndexedTriangles(geometry) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
  if (!g.attributes.normal) {
    g.computeVertexNormals();
  }
  return g;
}

export function meshToBinarySTL(mesh) {
  const geometry = toNonIndexedTriangles(mesh.geometry);
  const pos = geometry.getAttribute('position');
  const triCount = pos.count / 3;
  const buffer = new ArrayBuffer(84 + triCount * 50);
  const view = new DataView(buffer);

  view.setUint32(80, triCount, true);

  const vA = new THREE.Vector3();
  const vB = new THREE.Vector3();
  const vC = new THREE.Vector3();
  const cb = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const world = mesh.matrixWorld;

  let offset = 84;
  for (let i = 0; i < pos.count; i += 3) {
    vA.fromBufferAttribute(pos, i).applyMatrix4(world);
    vB.fromBufferAttribute(pos, i + 1).applyMatrix4(world);
    vC.fromBufferAttribute(pos, i + 2).applyMatrix4(world);

    cb.subVectors(vC, vB);
    ab.subVectors(vA, vB);
    normal.crossVectors(cb, ab).normalize();

    view.setFloat32(offset, normal.x, true);
    view.setFloat32(offset + 4, normal.y, true);
    view.setFloat32(offset + 8, normal.z, true);

    view.setFloat32(offset + 12, vA.x, true);
    view.setFloat32(offset + 16, vA.y, true);
    view.setFloat32(offset + 20, vA.z, true);

    view.setFloat32(offset + 24, vB.x, true);
    view.setFloat32(offset + 28, vB.y, true);
    view.setFloat32(offset + 32, vB.z, true);

    view.setFloat32(offset + 36, vC.x, true);
    view.setFloat32(offset + 40, vC.y, true);
    view.setFloat32(offset + 44, vC.z, true);

    view.setUint16(offset + 48, 0, true);
    offset += 50;
  }

  geometry.dispose();
  return buffer;
}
