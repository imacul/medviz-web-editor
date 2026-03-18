import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

function toNonIndexedGeometry(geometry) {
  return geometry.index ? geometry.toNonIndexed() : geometry.clone();
}

function buildGeometryFromTriangles(positions) {
  if (positions.length === 0) return null;

  const nonIndexed = new THREE.BufferGeometry();
  nonIndexed.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  nonIndexed.computeVertexNormals();

  const indexed = mergeVertices(nonIndexed, 1e-4);
  if (indexed !== nonIndexed) {
    nonIndexed.dispose();
  }
  indexed.computeVertexNormals();
  indexed.computeBoundingBox();
  return indexed;
}

// Clip a polygon (given as parallel x/y/z arrays) against one half-space.
// keepPositive = true means keep where dot(n,v)+pw >= -epsilon.
// Returns new parallel arrays after clipping.
function clipPolygonByHalfSpace(vx, vy, vz, nx, ny, nz, pw, keepPositive, epsilon) {
  const n = vx.length;
  if (n < 3) return { vx: [], vy: [], vz: [] };

  const ox = [], oy = [], oz = [];

  for (let i = 0; i < n; i++) {
    const j = (i + n - 1) % n; // previous vertex

    const di = nx * vx[i] + ny * vy[i] + nz * vz[i] + pw;
    const dj = nx * vx[j] + ny * vy[j] + nz * vz[j] + pw;

    const ci = keepPositive ? di >= -epsilon : di <= epsilon;
    const pj = keepPositive ? dj >= -epsilon : dj <= epsilon;

    if (ci) {
      if (!pj) {
        // Entering: add intersection first
        const t = dj / (dj - di);
        ox.push(vx[j] + t * (vx[i] - vx[j]));
        oy.push(vy[j] + t * (vy[i] - vy[j]));
        oz.push(vz[j] + t * (vz[i] - vz[j]));
      }
      ox.push(vx[i]);
      oy.push(vy[i]);
      oz.push(vz[i]);
    } else if (pj) {
      // Leaving: add intersection only
      const t = dj / (dj - di);
      ox.push(vx[j] + t * (vx[i] - vx[j]));
      oy.push(vy[j] + t * (vy[i] - vy[j]));
      oz.push(vz[j] + t * (vz[i] - vz[j]));
    }
  }

  return { vx: ox, vy: oy, vz: oz };
}

// Fan-triangulate a clipped polygon and push triangles into `out`.
function pushPolygonTriangles(out, vx, vy, vz) {
  for (let i = 1; i < vx.length - 1; i++) {
    out.push(
      vx[0], vy[0], vz[0],
      vx[i], vy[i], vz[i],
      vx[i + 1], vy[i + 1], vz[i + 1]
    );
  }
}

export function trimGeometryByPlane(sourceGeometry, plane, keepSide = 'positive', epsilon = 1e-4) {
  const geometry = toNonIndexedGeometry(sourceGeometry);
  const positionAttr = geometry.getAttribute('position');
  const p = positionAttr.array;
  const keepPositive = keepSide === 'positive';
  const nx = plane.normal.x, ny = plane.normal.y, nz = plane.normal.z, pw = plane.constant;

  const positions = [];

  for (let i = 0; i < positionAttr.count; i += 3) {
    const i0 = i * 3, i1 = (i + 1) * 3, i2 = (i + 2) * 3;

    const d0 = nx * p[i0] + ny * p[i0 + 1] + nz * p[i0 + 2] + pw;
    const d1 = nx * p[i1] + ny * p[i1 + 1] + nz * p[i1 + 2] + pw;
    const d2 = nx * p[i2] + ny * p[i2 + 1] + nz * p[i2 + 2] + pw;

    const in0 = keepPositive ? d0 >= -epsilon : d0 <= epsilon;
    const in1 = keepPositive ? d1 >= -epsilon : d1 <= epsilon;
    const in2 = keepPositive ? d2 >= -epsilon : d2 <= epsilon;
    const cnt = (in0 ? 1 : 0) + (in1 ? 1 : 0) + (in2 ? 1 : 0);

    if (cnt === 0) continue;
    if (cnt === 3) {
      positions.push(p[i0], p[i0 + 1], p[i0 + 2], p[i1], p[i1 + 1], p[i1 + 2], p[i2], p[i2 + 1], p[i2 + 2]);
      continue;
    }

    // Partial intersection — use Sutherland-Hodgman to clip the triangle
    const poly = clipPolygonByHalfSpace(
      [p[i0], p[i1], p[i2]],
      [p[i0 + 1], p[i1 + 1], p[i2 + 1]],
      [p[i0 + 2], p[i1 + 2], p[i2 + 2]],
      nx, ny, nz, pw, keepPositive, epsilon
    );
    if (poly.vx.length >= 3) {
      pushPolygonTriangles(positions, poly.vx, poly.vy, poly.vz);
    }
  }

  geometry.dispose();
  return buildGeometryFromTriangles(positions);
}

export function trimGeometryByBox(sourceGeometry, box, keepInside = true) {
  const geometry = toNonIndexedGeometry(sourceGeometry);
  const positionAttr = geometry.getAttribute('position');
  const p = positionAttr.array;

  const positions = [];

  if (keepInside) {
    // Clip geometry to the inside of the box using all 6 half-spaces
    const planes = [
      { nx: 1, ny: 0, nz: 0, pw: -box.min.x },
      { nx: -1, ny: 0, nz: 0, pw: box.max.x },
      { nx: 0, ny: 1, nz: 0, pw: -box.min.y },
      { nx: 0, ny: -1, nz: 0, pw: box.max.y },
      { nx: 0, ny: 0, nz: 1, pw: -box.min.z },
      { nx: 0, ny: 0, nz: -1, pw: box.max.z },
    ];

    for (let i = 0; i < positionAttr.count; i += 3) {
      const i0 = i * 3, i1 = (i + 1) * 3, i2 = (i + 2) * 3;

      let poly = {
        vx: [p[i0], p[i1], p[i2]],
        vy: [p[i0 + 1], p[i1 + 1], p[i2 + 1]],
        vz: [p[i0 + 2], p[i1 + 2], p[i2 + 2]],
      };

      for (const pl of planes) {
        if (poly.vx.length < 3) break;
        poly = clipPolygonByHalfSpace(poly.vx, poly.vy, poly.vz, pl.nx, pl.ny, pl.nz, pl.pw, true, 1e-4);
      }

      if (poly.vx.length >= 3) {
        pushPolygonTriangles(positions, poly.vx, poly.vy, poly.vz);
      }
    }
  } else {
    // Keep outside: centroid-based (outside regions are bounded by the box face, not the mesh)
    const v1 = new THREE.Vector3();
    const v2 = new THREE.Vector3();
    const v3 = new THREE.Vector3();
    const centroid = new THREE.Vector3();

    for (let i = 0; i < positionAttr.count; i += 3) {
      const i0 = i * 3, i1 = (i + 1) * 3, i2 = (i + 2) * 3;
      v1.set(p[i0], p[i0 + 1], p[i0 + 2]);
      v2.set(p[i1], p[i1 + 1], p[i1 + 2]);
      v3.set(p[i2], p[i2 + 1], p[i2 + 2]);
      centroid.copy(v1).add(v2).add(v3).multiplyScalar(1 / 3);
      if (!box.containsPoint(centroid)) {
        positions.push(p[i0], p[i0 + 1], p[i0 + 2], p[i1], p[i1 + 1], p[i1 + 2], p[i2], p[i2 + 1], p[i2 + 2]);
      }
    }
  }

  geometry.dispose();
  return buildGeometryFromTriangles(positions);
}

export function makeAxisPlane(axis, position) {
  const p = Number(position);
  if (axis === 'x') return new THREE.Plane(new THREE.Vector3(1, 0, 0), -p);
  if (axis === 'z') return new THREE.Plane(new THREE.Vector3(0, 0, 1), -p);
  return new THREE.Plane(new THREE.Vector3(0, 1, 0), -p);
}
