import * as THREE from 'three';

function isASCIISTL(arrayBuffer) {
  const view = new Uint8Array(arrayBuffer);
  const text = String.fromCharCode.apply(null, view.slice(0, 5));
  return text === 'solid';
}

function parseASCIISTL(arrayBuffer) {
  const text = new TextDecoder().decode(arrayBuffer);
  const vertices = [];
  const normals = [];

  const vertexPattern = /vertex\s+([\d.eE+-]+)\s+([\d.eE+-]+)\s+([\d.eE+-]+)/g;
  const normalPattern = /facet normal\s+([\d.eE+-]+)\s+([\d.eE+-]+)\s+([\d.eE+-]+)/g;

  let match;
  while ((match = normalPattern.exec(text)) !== null) {
    const nx = parseFloat(match[1]);
    const ny = parseFloat(match[2]);
    const nz = parseFloat(match[3]);
    normals.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);
  }

  while ((match = vertexPattern.exec(text)) !== null) {
    vertices.push(parseFloat(match[1]), parseFloat(match[2]), parseFloat(match[3]));
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  if (normals.length === vertices.length) {
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  }

  return geometry;
}

function parseBinarySTL(view) {
  const triangles = view.getUint32(80, true);
  const vertices = [];
  const normals = [];

  for (let i = 0; i < triangles; i++) {
    const offset = 84 + i * 50;

    const nx = view.getFloat32(offset, true);
    const ny = view.getFloat32(offset + 4, true);
    const nz = view.getFloat32(offset + 8, true);

    for (let j = 0; j < 3; j++) {
      const vOffset = offset + 12 + j * 12;
      vertices.push(
        view.getFloat32(vOffset, true),
        view.getFloat32(vOffset + 4, true),
        view.getFloat32(vOffset + 8, true)
      );
      normals.push(nx, ny, nz);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  return geometry;
}

export function parseSTL(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  return isASCIISTL(arrayBuffer) ? parseASCIISTL(arrayBuffer) : parseBinarySTL(view);
}
