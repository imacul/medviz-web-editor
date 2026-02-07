import * as THREE from 'three';

export class TransformControls {
  constructor(camera, domElement, object) {
    this.camera = camera;
    this.domElement = domElement;
    this.object = object;
    this.mode = 'translate';
    this.enabled = false;
    this.dragging = false;
    this.onDragStateChange = null;

    this.gizmos = {
      translate: null,
      rotate: null
    };

    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);

    this.previousMouse = new THREE.Vector2();
  }

  setDragStateCallback(callback) {
    this.onDragStateChange = callback;
  }

  setMode(mode) {
    this.mode = mode;
    this.updateGizmoVisibility();
  }

  setObject(object) {
    this.object = object;
    if (object) this.syncGizmoTransform();
  }

  createGizmos(scene) {
    const translateGizmo = new THREE.Group();
    const arrowLength = 1.5;
    const arrowColors = [0xff0000, 0x00ff00, 0x0000ff];
    const directions = [
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 0, 1)
    ];

    directions.forEach((dir, i) => {
      const arrow = new THREE.ArrowHelper(dir, new THREE.Vector3(0, 0, 0), arrowLength, arrowColors[i], 0.3, 0.2);
      arrow.userData.axis = i === 0 ? 'x' : i === 1 ? 'y' : 'z';
      translateGizmo.add(arrow);
    });

    translateGizmo.visible = false;
    this.gizmos.translate = translateGizmo;
    scene.add(translateGizmo);

    const rotateGizmo = new THREE.Group();
    const torusRadius = 1.2;
    const torusTube = 0.02;

    directions.forEach((_, i) => {
      const geometry = new THREE.TorusGeometry(torusRadius, torusTube, 16, 100);
      const material = new THREE.MeshBasicMaterial({ color: arrowColors[i], transparent: true, opacity: 0.8 });
      const torus = new THREE.Mesh(geometry, material);

      if (i === 0) torus.rotation.y = Math.PI / 2;
      if (i === 2) torus.rotation.x = Math.PI / 2;

      torus.userData.axis = i === 0 ? 'x' : i === 1 ? 'y' : 'z';
      rotateGizmo.add(torus);
    });

    rotateGizmo.visible = false;
    this.gizmos.rotate = rotateGizmo;
    scene.add(rotateGizmo);

    this.configureGizmoRendering();
  }

  configureGizmoRendering() {
    const applyToGroup = (group) => {
      if (!group) return;
      group.traverse((child) => {
        child.renderOrder = 1000;
        if (!child.material) return;

        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((material) => {
          material.depthTest = false;
          material.depthWrite = false;
          material.transparent = true;
          material.toneMapped = false;
          material.needsUpdate = true;
        });
      });
    };

    applyToGroup(this.gizmos.translate);
    applyToGroup(this.gizmos.rotate);
  }

  syncGizmoTransform() {
    if (!this.object) return;
    const distance = this.camera.position.distanceTo(this.object.position);
    const scale = THREE.MathUtils.clamp(distance * 0.14, 0.6, 4.2);

    if (this.gizmos.translate) {
      this.gizmos.translate.position.copy(this.object.position);
      this.gizmos.translate.scale.setScalar(scale);
    }
    if (this.gizmos.rotate) {
      this.gizmos.rotate.position.copy(this.object.position);
      this.gizmos.rotate.scale.setScalar(scale);
    }
  }

  updateGizmoVisibility() {
    if (!this.enabled) {
      if (this.gizmos.translate) this.gizmos.translate.visible = false;
      if (this.gizmos.rotate) this.gizmos.rotate.visible = false;
      return;
    }
    if (this.gizmos.translate) this.gizmos.translate.visible = this.mode === 'translate' || this.mode === 'scale';
    if (this.gizmos.rotate) this.gizmos.rotate.visible = this.mode === 'rotate';
  }

  enable() {
    this.enabled = true;
    this.updateGizmoVisibility();
    this.syncGizmoTransform();
    this.domElement.addEventListener('mousedown', this.onMouseDown, true);
  }

  disable() {
    this.enabled = false;
    if (this.dragging) {
      this.dragging = false;
      if (this.onDragStateChange) this.onDragStateChange(false);
    }
    this.updateGizmoVisibility();
    this.domElement.removeEventListener('mousedown', this.onMouseDown, true);
    this.domElement.removeEventListener('mousemove', this.onMouseMove);
    this.domElement.removeEventListener('mouseup', this.onMouseUp);
  }

  onMouseDown(event) {
    if (event.button !== 0) return;
    if (!this.enabled || !this.object) return;
    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === 'function') {
      event.stopImmediatePropagation();
    }
    this.dragging = true;
    if (this.onDragStateChange) this.onDragStateChange(true);
    this.previousMouse.set(event.clientX, event.clientY);
    this.domElement.addEventListener('mousemove', this.onMouseMove);
    this.domElement.addEventListener('mouseup', this.onMouseUp);
  }

  onMouseMove(event) {
    if (!this.dragging || !this.object) return;
    const deltaX = event.clientX - this.previousMouse.x;
    const deltaY = event.clientY - this.previousMouse.y;

    if (this.mode === 'translate') {
      const moveFactor = 0.01;
      this.object.position.x += deltaX * moveFactor;
      this.object.position.y -= deltaY * moveFactor;
      if (this.gizmos.translate) this.gizmos.translate.position.copy(this.object.position);
    } else if (this.mode === 'rotate') {
      const rotateFactor = 0.01;
      this.object.rotation.y += deltaX * rotateFactor;
      this.object.rotation.x += deltaY * rotateFactor;
      if (this.gizmos.rotate) this.gizmos.rotate.position.copy(this.object.position);
    } else if (this.mode === 'scale') {
      const scaleFactor = 1 - deltaY * 0.01;
      const next = THREE.MathUtils.clamp(this.object.scale.x * scaleFactor, 0.1, 20);
      this.object.scale.set(next, next, next);
      if (this.gizmos.translate) {
        this.gizmos.translate.position.copy(this.object.position);
      }
    }

    this.previousMouse.set(event.clientX, event.clientY);
  }

  onMouseUp() {
    this.dragging = false;
    if (this.onDragStateChange) this.onDragStateChange(false);
    this.domElement.removeEventListener('mousemove', this.onMouseMove);
    this.domElement.removeEventListener('mouseup', this.onMouseUp);
  }

  update() {
    if (this.enabled && this.object) {
      this.syncGizmoTransform();
    }
  }

  dispose() {
    this.disable();
  }
}
