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
    this.touchStartDistance = 0;
    this.touchCurrentDistance = 0;
    this.touchState = 'none';
    this.touchPanStart = new THREE.Vector2();
    this.touchPanEnd = new THREE.Vector2();
    this.touchPanDelta = new THREE.Vector2();

    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onMouseWheel = this.onMouseWheel.bind(this);
    this.onTouchStart = this.onTouchStart.bind(this);
    this.onTouchMove = this.onTouchMove.bind(this);
    this.onTouchEnd = this.onTouchEnd.bind(this);

    this.mouseButton = -1;
    this.onInteractionEnd = null; // optional callback: () => void

    this.domElement.addEventListener('mousedown', this.onMouseDown);
    this.domElement.addEventListener('wheel', this.onMouseWheel);
    this.domElement.addEventListener('touchstart', this.onTouchStart, { passive: false });
    this.domElement.addEventListener('touchmove', this.onTouchMove, { passive: false });
    this.domElement.addEventListener('touchend', this.onTouchEnd, { passive: false });
    this.domElement.addEventListener('touchcancel', this.onTouchEnd, { passive: false });
    this.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
    this.domElement.style.touchAction = 'none';
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
    this.onInteractionEnd?.();
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
    this.onInteractionEnd?.();
  }

  getTouchDistance(touches) {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  getTouchMidpoint(touches, target) {
    if (touches.length < 2) return target.set(0, 0);
    return target.set(
      (touches[0].clientX + touches[1].clientX) / 2,
      (touches[0].clientY + touches[1].clientY) / 2
    );
  }

  onTouchStart(event) {
    if (!this.enabled) return;
    event.preventDefault();
    this.isUserInteracting = true;

    if (event.touches.length === 1) {
      this.touchState = 'rotate';
      this.rotateStart.set(event.touches[0].clientX, event.touches[0].clientY);
      return;
    }

    if (event.touches.length >= 2) {
      this.touchState = 'pan-zoom';
      this.touchStartDistance = this.getTouchDistance(event.touches);
      this.touchCurrentDistance = this.touchStartDistance;
      this.getTouchMidpoint(event.touches, this.touchPanStart);
    }
  }

  onTouchMove(event) {
    if (!this.enabled) return;
    event.preventDefault();

    if (this.touchState === 'rotate' && event.touches.length === 1) {
      this.rotateEnd.set(event.touches[0].clientX, event.touches[0].clientY);
      this.rotateDelta.subVectors(this.rotateEnd, this.rotateStart).multiplyScalar(this.rotateSpeed);
      const element = this.domElement;
      this.sphericalDelta.theta -= 2 * Math.PI * this.rotateDelta.x / element.clientHeight;
      this.sphericalDelta.phi -= 2 * Math.PI * this.rotateDelta.y / element.clientHeight;
      this.rotateStart.copy(this.rotateEnd);
      this.update();
      return;
    }

    if (this.touchState === 'pan-zoom' && event.touches.length >= 2) {
      this.touchCurrentDistance = this.getTouchDistance(event.touches);
      if (this.touchStartDistance > 0 && this.touchCurrentDistance > 0) {
        this.scale *= this.touchStartDistance / this.touchCurrentDistance;
      }

      this.getTouchMidpoint(event.touches, this.touchPanEnd);
      this.touchPanDelta
        .subVectors(this.touchPanEnd, this.touchPanStart)
        .multiplyScalar(this.panSpeed);
      this.pan(this.touchPanDelta.x, this.touchPanDelta.y);

      this.touchStartDistance = this.touchCurrentDistance;
      this.touchPanStart.copy(this.touchPanEnd);
      this.update();
    }
  }

  onTouchEnd(event) {
    if (!this.enabled) return;
    event.preventDefault();

    if (event.touches.length === 1) {
      this.touchState = 'rotate';
      this.rotateStart.set(event.touches[0].clientX, event.touches[0].clientY);
      return;
    }

    if (event.touches.length >= 2) {
      this.touchState = 'pan-zoom';
      this.touchStartDistance = this.getTouchDistance(event.touches);
      this.touchCurrentDistance = this.touchStartDistance;
      this.getTouchMidpoint(event.touches, this.touchPanStart);
      return;
    }

    this.touchState = 'none';
    this.touchStartDistance = 0;
    this.touchCurrentDistance = 0;
    this.isUserInteracting = false;
    this.onInteractionEnd?.();
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
    this.domElement.removeEventListener('touchstart', this.onTouchStart);
    this.domElement.removeEventListener('touchmove', this.onTouchMove);
    this.domElement.removeEventListener('touchend', this.onTouchEnd);
    this.domElement.removeEventListener('touchcancel', this.onTouchEnd);
    this.domElement.removeEventListener('mousemove', this.onMouseMove);
    this.domElement.removeEventListener('mouseup', this.onMouseUp);
  }
}
