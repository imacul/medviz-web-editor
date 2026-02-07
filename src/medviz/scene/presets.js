import * as THREE from 'three';

export function createDNAHelixScene() {
  const group = new THREE.Group();
  const radius = 1.5;
  const height = 6;
  const segments = 40;

  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 4;
    const y = (i / segments) * height - height / 2;

    const geo1 = new THREE.SphereGeometry(0.15, 32, 32);
    const mat1 = new THREE.MeshStandardMaterial({
      color: 0x4dd0e1,
      metalness: 0.3,
      roughness: 0.4,
      emissive: 0x1a5560,
      emissiveIntensity: 0.2
    });
    const sphere1 = new THREE.Mesh(geo1, mat1);
    sphere1.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
    sphere1.castShadow = true;
    group.add(sphere1);

    const geo2 = new THREE.SphereGeometry(0.15, 32, 32);
    const mat2 = new THREE.MeshStandardMaterial({
      color: 0xec407a,
      metalness: 0.3,
      roughness: 0.4,
      emissive: 0x5a1a30,
      emissiveIntensity: 0.2
    });
    const sphere2 = new THREE.Mesh(geo2, mat2);
    sphere2.position.set(Math.cos(angle + Math.PI) * radius, y, Math.sin(angle + Math.PI) * radius);
    sphere2.castShadow = true;
    group.add(sphere2);

    if (i % 3 === 0) {
      const geometry = new THREE.CylinderGeometry(0.05, 0.05, radius * 2, 8);
      const material = new THREE.MeshStandardMaterial({
        color: 0xb0bec5,
        metalness: 0.5,
        roughness: 0.5,
        transparent: true,
        opacity: 0.8
      });
      const cylinder = new THREE.Mesh(geometry, material);
      cylinder.position.y = y;
      cylinder.rotation.z = Math.PI / 2;
      cylinder.rotation.y = angle;
      cylinder.castShadow = true;
      group.add(cylinder);
    }
  }

  return group;
}

export function createHeartBeatScene() {
  const group = new THREE.Group();
  const heartShape = new THREE.Shape();
  const x = 0;
  const y = 0;
  heartShape.moveTo(x + 0.5, y + 0.5);
  heartShape.bezierCurveTo(x + 0.5, y + 0.5, x + 0.4, y, x, y);
  heartShape.bezierCurveTo(x - 0.6, y, x - 0.6, y + 0.7, x - 0.6, y + 0.7);
  heartShape.bezierCurveTo(x - 0.6, y + 1.1, x - 0.3, y + 1.54, x + 0.5, y + 1.9);
  heartShape.bezierCurveTo(x + 1.2, y + 1.54, x + 1.6, y + 1.1, x + 1.6, y + 0.7);
  heartShape.bezierCurveTo(x + 1.6, y + 0.7, x + 1.6, y, x + 1.0, y);
  heartShape.bezierCurveTo(x + 0.7, y, x + 0.5, y + 0.5, x + 0.5, y + 0.5);

  const extrudeSettings = {
    depth: 0.4,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 2,
    bevelSize: 0.1,
    bevelThickness: 0.1
  };

  const geometry = new THREE.ExtrudeGeometry(heartShape, extrudeSettings);
  const material = new THREE.MeshStandardMaterial({
    color: 0xe91e63,
    metalness: 0.2,
    roughness: 0.3,
    emissive: 0x5a0a28,
    emissiveIntensity: 0.3
  });
  const heart = new THREE.Mesh(geometry, material);
  heart.scale.set(1.8, 1.8, 1.8);
  heart.position.set(-0.9, -1.4, 0);
  heart.castShadow = true;
  heart.receiveShadow = true;
  group.add(heart);

  for (let i = 0; i < 3; i++) {
    const ringGeo = new THREE.TorusGeometry(1.2 + i * 0.6, 0.05, 16, 100);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xff4081,
      emissive: 0xff4081,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.4 - i * 0.1
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.userData.offset = i * 0.3;
    group.add(ring);
  }

  return group;
}

export function createNeuralNetworkScene() {
  const group = new THREE.Group();
  const nodes = [];
  const numNodes = 30;

  for (let i = 0; i < numNodes; i++) {
    const geometry = new THREE.SphereGeometry(0.12, 32, 32);
    const material = new THREE.MeshStandardMaterial({
      color: 0x66bb6a,
      metalness: 0.4,
      roughness: 0.3,
      emissive: 0x2e7d32,
      emissiveIntensity: 0.4
    });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.set(
      (Math.random() - 0.5) * 8,
      (Math.random() - 0.5) * 6,
      (Math.random() - 0.5) * 4
    );
    sphere.castShadow = true;
    group.add(sphere);
    nodes.push(sphere);
  }

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      if (Math.random() > 0.85) {
        const points = [nodes[i].position, nodes[j].position];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
          color: 0x4fc3f7,
          transparent: true,
          opacity: 0.3
        });
        const line = new THREE.Line(geometry, material);
        group.add(line);
      }
    }
  }

  for (let i = 0; i < 15; i++) {
    const pulseGeo = new THREE.SphereGeometry(0.06, 16, 16);
    const pulseMat = new THREE.MeshStandardMaterial({
      color: 0xffeb3b,
      emissive: 0xffeb3b,
      emissiveIntensity: 1,
      transparent: true,
      opacity: 0.9
    });
    const pulse = new THREE.Mesh(pulseGeo, pulseMat);
    pulse.position.copy(nodes[Math.floor(Math.random() * nodes.length)].position);
    pulse.userData.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 0.05,
      (Math.random() - 0.5) * 0.05,
      (Math.random() - 0.5) * 0.05
    );
    group.add(pulse);
  }

  return group;
}

export function createCellDivisionScene() {
  const group = new THREE.Group();

  const cell1Geo = new THREE.SphereGeometry(1.2, 64, 64);
  const cell1Mat = new THREE.MeshStandardMaterial({
    color: 0xff7043,
    metalness: 0.1,
    roughness: 0.6,
    transparent: true,
    opacity: 0.85,
    emissive: 0x5d1f0c,
    emissiveIntensity: 0.2
  });
  const cell1 = new THREE.Mesh(cell1Geo, cell1Mat);
  cell1.position.x = -0.3;
  cell1.castShadow = true;
  cell1.receiveShadow = true;
  group.add(cell1);

  const cell2Geo = new THREE.SphereGeometry(1.2, 64, 64);
  const cell2Mat = new THREE.MeshStandardMaterial({
    color: 0xffa726,
    metalness: 0.1,
    roughness: 0.6,
    transparent: true,
    opacity: 0.85,
    emissive: 0x663d00,
    emissiveIntensity: 0.2
  });
  const cell2 = new THREE.Mesh(cell2Geo, cell2Mat);
  cell2.position.x = 0.3;
  cell2.castShadow = true;
  cell2.receiveShadow = true;
  group.add(cell2);

  const nucleus1Geo = new THREE.SphereGeometry(0.4, 32, 32);
  const nucleus1Mat = new THREE.MeshStandardMaterial({
    color: 0x5e35b1,
    metalness: 0.3,
    roughness: 0.4,
    emissive: 0x311b92,
    emissiveIntensity: 0.3
  });
  const nucleus1 = new THREE.Mesh(nucleus1Geo, nucleus1Mat);
  nucleus1.position.x = -0.3;
  nucleus1.castShadow = true;
  group.add(nucleus1);

  const nucleus2Geo = new THREE.SphereGeometry(0.4, 32, 32);
  const nucleus2Mat = new THREE.MeshStandardMaterial({
    color: 0x7e57c2,
    metalness: 0.3,
    roughness: 0.4,
    emissive: 0x4527a0,
    emissiveIntensity: 0.3
  });
  const nucleus2 = new THREE.Mesh(nucleus2Geo, nucleus2Mat);
  nucleus2.position.x = 0.3;
  nucleus2.castShadow = true;
  group.add(nucleus2);

  for (let i = 0; i < 8; i++) {
    const chromGroup1 = new THREE.Group();
    const chromCyl1 = new THREE.CylinderGeometry(0.05, 0.05, 0.3, 8);
    const chromMat1 = new THREE.MeshStandardMaterial({
      color: 0xab47bc,
      metalness: 0.5,
      roughness: 0.3
    });
    const chromBody1 = new THREE.Mesh(chromCyl1, chromMat1);
    chromBody1.castShadow = true;
    chromGroup1.add(chromBody1);

    const chromTop1 = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), chromMat1);
    chromTop1.position.y = 0.15;
    chromTop1.castShadow = true;
    chromGroup1.add(chromTop1);

    const chromBot1 = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), chromMat1);
    chromBot1.position.y = -0.15;
    chromBot1.castShadow = true;
    chromGroup1.add(chromBot1);

    chromGroup1.position.set(
      -0.3 + (Math.random() - 0.5) * 0.6,
      (Math.random() - 0.5) * 0.6,
      (Math.random() - 0.5) * 0.6
    );
    chromGroup1.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    group.add(chromGroup1);

    const chromGroup2 = new THREE.Group();
    const chromCyl2 = new THREE.CylinderGeometry(0.05, 0.05, 0.3, 8);
    const chromMat2 = new THREE.MeshStandardMaterial({
      color: 0xce93d8,
      metalness: 0.5,
      roughness: 0.3
    });
    const chromBody2 = new THREE.Mesh(chromCyl2, chromMat2);
    chromBody2.castShadow = true;
    chromGroup2.add(chromBody2);

    const chromTop2 = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), chromMat2);
    chromTop2.position.y = 0.15;
    chromTop2.castShadow = true;
    chromGroup2.add(chromTop2);

    const chromBot2 = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), chromMat2);
    chromBot2.position.y = -0.15;
    chromBot2.castShadow = true;
    chromGroup2.add(chromBot2);

    chromGroup2.position.set(
      0.3 + (Math.random() - 0.5) * 0.6,
      (Math.random() - 0.5) * 0.6,
      (Math.random() - 0.5) * 0.6
    );
    chromGroup2.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    group.add(chromGroup2);
  }

  return group;
}
