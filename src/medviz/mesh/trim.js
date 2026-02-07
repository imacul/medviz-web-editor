import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

function toNonIndexedGeometry(geometry) {
  return geometry.index ? geometry.toNonIndexed() : geometry.clone();
}

function buildGeometryFromTriangles(positions, normals) {
  if (positions.length === 0) return null;

  const nonIndexed = new THREE.BufferGeometry();
  nonIndexed.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

  if (normals && normals.length === positions.length) {
    nonIndexed.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  } else {
    nonIndexed.computeVertexNormals();
  }

  const indexed = mergeVertices(nonIndexed, 1e-4);
  if (indexed !== nonIndexed) {
    nonIndexed.dispose();
  }
  indexed.computeVertexNormals();
  indexed.computeBoundingBox();
  return indexed;
}

export function trimGeometryByPlane(sourceGeometry, plane, keepSide = 'positive', epsilon = 1e-4) {
  const geometry = toNonIndexedGeometry(sourceGeometry);
  const positionAttr = geometry.getAttribute('position');
  const normalAttr = geometry.getAttribute('normal');

  const positions = [];
  const normals = normalAttr ? [] : null;

  const v1 = new THREE.Vector3();
  const v2 = new THREE.Vector3();
  const v3 = new THREE.Vector3();
  const centroid = new THREE.Vector3();

  for (let i = 0; i < positionAttr.count; i += 3) {
    v1.fromBufferAttribute(positionAttr, i);
    v2.fromBufferAttribute(positionAttr, i + 1);
    v3.fromBufferAttribute(positionAttr, i + 2);

    centroid.copy(v1).add(v2).add(v3).multiplyScalar(1 / 3);
    const distance = plane.distanceToPoint(centroid);
    const keep = keepSide === 'positive' ? distance >= -epsilon : distance <= epsilon;

    if (!keep) continue;

    positions.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z, v3.x, v3.y, v3.z);

    if (normalAttr) {
      normals.push(
        normalAttr.getX(i),
        normalAttr.getY(i),
        normalAttr.getZ(i),
        normalAttr.getX(i + 1),
        normalAttr.getY(i + 1),
        normalAttr.getZ(i + 1),
        normalAttr.getX(i + 2),
        normalAttr.getY(i + 2),
        normalAttr.getZ(i + 2)
      );
    }
  }

  geometry.dispose();
  return buildGeometryFromTriangles(positions, normals);
}

export function trimGeometryByBox(sourceGeometry, box, keepInside = true) {
  const geometry = toNonIndexedGeometry(sourceGeometry);
  const positionAttr = geometry.getAttribute('position');
  const normalAttr = geometry.getAttribute('normal');

  const positions = [];
  const normals = normalAttr ? [] : null;

  const v1 = new THREE.Vector3();
  const v2 = new THREE.Vector3();
  const v3 = new THREE.Vector3();
  const centroid = new THREE.Vector3();

  for (let i = 0; i < positionAttr.count; i += 3) {
    v1.fromBufferAttribute(positionAttr, i);
    v2.fromBufferAttribute(positionAttr, i + 1);
    v3.fromBufferAttribute(positionAttr, i + 2);

    centroid.copy(v1).add(v2).add(v3).multiplyScalar(1 / 3);
    const inside = box.containsPoint(centroid);
    const keep = keepInside ? inside : !inside;

    if (!keep) continue;

    positions.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z, v3.x, v3.y, v3.z);

    if (normalAttr) {
      normals.push(
        normalAttr.getX(i),
        normalAttr.getY(i),
        normalAttr.getZ(i),
        normalAttr.getX(i + 1),
        normalAttr.getY(i + 1),
        normalAttr.getZ(i + 1),
        normalAttr.getX(i + 2),
        normalAttr.getY(i + 2),
        normalAttr.getZ(i + 2)
      );
    }
  }

  geometry.dispose();
  return buildGeometryFromTriangles(positions, normals);
}

export function makeAxisPlane(axis, position) {
  const p = Number(position);
  if (axis === 'x') return new THREE.Plane(new THREE.Vector3(1, 0, 0), -p);
  if (axis === 'z') return new THREE.Plane(new THREE.Vector3(0, 0, 1), -p);
  return new THREE.Plane(new THREE.Vector3(0, 1, 0), -p);
}
