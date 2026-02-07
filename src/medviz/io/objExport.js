import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';

export function meshToOBJ(mesh) {
  mesh.updateMatrixWorld(true);
  return new OBJExporter().parse(mesh);
}
