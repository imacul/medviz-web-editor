import * as THREE from 'three';

export class OrbitControls {
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;
    this.enabled = true;
    this.target = new THREE.Vector3();
    this.minDistance = 3;
    this.maxDistance = 30;
    this.isUserInteracting = false;
    this.rotateSpeed = 0.5;
    this.zoomSpeed = 1.0;
    this.panSpeed = 1.0;

    this.spherical = new THREE.Spherical();
    this.sphericalDelta = new THREE.Spherical();
    this.scale = 1;
    this.panOffset = new THREE.Vector3();

    this.rotateStart = new THREE.Vector2();
    this.rotateEnd = new THREE.Vector2();
    this.rotateDelta = new THREE.Vector2();

    this.panStart = new THREE.Vector2();
    this.panEnd = new THREE.Vector2();
    this.panDelta = new THREE.Vector2();

    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onMouseWheel = this.onMouseWheel.bind(this);

    this.mouseButton = -1;

    this.domElement.addEventListener('mousedown', this.onMouseDown);
    this.domElement.addEventListener('wheel', this.onMouseWheel);
    this.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  onMouseDown(event) {
    if (!this.enabled) return;
    event.preventDefault();
    this.isUserInteracting = true;
    this.mouseButton = event.button === 0 && event.shiftKey ? 2 : event.button;

    if (this.mouseButton === 0) {
      this.rotateStart.set(event.clientX, event.clientY);
    } else if (this.mouseButton === 2 || this.mouseButton === 1) {
      this.panStart.set(event.clientX, event.clientY);
    }

    this.domElement.addEventListener('mousemove', this.onMouseMove);
    this.domElement.addEventListener('mouseup', this.onMouseUp);
  }

  onMouseMove(event) {
    if (!this.enabled) return;
    event.preventDefault();

    if (this.mouseButton === 0) {
      this.rotateEnd.set(event.clientX, event.clientY);
      this.rotateDelta.subVectors(this.rotateEnd, this.rotateStart).multiplyScalar(this.rotateSpeed);
      const element = this.domElement;
      this.sphericalDelta.theta -= 2 * Math.PI * this.rotateDelta.x / element.clientHeight;
      this.sphericalDelta.phi -= 2 * Math.PI * this.rotateDelta.y / element.clientHeight;
      this.rotateStart.copy(this.rotateEnd);
    } else if (this.mouseButton === 2 || this.mouseButton === 1) {
      this.panEnd.set(event.clientX, event.clientY);
      this.panDelta.subVectors(this.panEnd, this.panStart).multiplyScalar(this.panSpeed);
      this.pan(this.panDelta.x, this.panDelta.y);
      this.panStart.copy(this.panEnd);
    }

    this.update();
  }

  onMouseUp() {
    this.isUserInteracting = false;
    this.mouseButton = -1;
    this.domElement.removeEventListener('mousemove', this.onMouseMove);
    this.domElement.removeEventListener('mouseup', this.onMouseUp);
  }

  onMouseWheel(event) {
    if (!this.enabled) return;
    event.preventDefault();
    if (event.deltaY < 0) {
      this.scale /= 0.95;
    } else {
      this.scale *= 0.95;
    }
    this.update();
  }

  pan(deltaX, deltaY) {
    const offset = new THREE.Vector3();
    const position = this.camera.position;
    offset.copy(position).sub(this.target);
    let targetDistance = offset.length();
    targetDistance *= Math.tan((this.camera.fov / 2) * Math.PI / 180.0);

    const panLeft = new THREE.Vector3();
    const panUp = new THREE.Vector3();

    const v = new THREE.Vector3();
    v.setFromMatrixColumn(this.camera.matrix, 0);
    panLeft.copy(v);
    panLeft.multiplyScalar(-2 * deltaX * targetDistance / this.domElement.clientHeight);

    v.setFromMatrixColumn(this.camera.matrix, 1);
    panUp.copy(v);
    panUp.multiplyScalar(2 * deltaY * targetDistance / this.domElement.clientHeight);

    this.panOffset.add(panLeft).add(panUp);
  }

  update() {
    const offset = new THREE.Vector3();
    this.target.add(this.panOffset);
    offset.copy(this.camera.position).sub(this.target);
    this.spherical.setFromVector3(offset);

    this.spherical.theta += this.sphericalDelta.theta;
    this.spherical.phi += this.sphericalDelta.phi;
    this.spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.spherical.phi));
    this.spherical.radius *= this.scale;
    this.spherical.radius = Math.max(this.minDistance, Math.min(this.maxDistance, this.spherical.radius));

    offset.setFromSpherical(this.spherical);
    this.camera.position.copy(this.target).add(offset);
    this.camera.lookAt(this.target);

    this.sphericalDelta.set(0, 0, 0);
    this.panOffset.set(0, 0, 0);
    this.scale = 1;

    return true;
  }

  dispose() {
    this.domElement.removeEventListener('mousedown', this.onMouseDown);
    this.domElement.removeEventListener('wheel', this.onMouseWheel);
    this.domElement.removeEventListener('mousemove', this.onMouseMove);
    this.domElement.removeEventListener('mouseup', this.onMouseUp);
  }
}
