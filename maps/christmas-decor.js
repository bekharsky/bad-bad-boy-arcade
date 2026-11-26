import * as THREE from 'three';

const LIT_COLORS = ['#ffe6ac', '#ffe6ac', '#f5c15f', '#e35750', '#75a77a'];

function setInstance(mesh, index, position, quaternion, scale) {
  const object = new THREE.Object3D();
  object.position.copy(position);
  object.quaternion.copy(quaternion);
  object.scale.copy(scale);
  object.updateMatrix();
  mesh.setMatrixAt(index, object.matrix);
}

function addLights(root, strands) {
  if (!strands.length) return;
  const wireMatrices = [], bulbPositions = [], bulbColors = [];
  const yAxis = new THREE.Vector3(0, 1, 0);
  for (const strand of strands) {
    const from = new THREE.Vector3(...strand.from), to = new THREE.Vector3(...strand.to);
    const span = to.clone().sub(from), length = span.length();
    if (!length) continue;
    const sag = strand.sag ?? .7, spacing = strand.spacing ?? 1.25;
    const segments = Math.max(8, Math.ceil(length * 3));
    let previous = null;
    const pointAt = t => new THREE.Vector3(
      from.x + span.x * t,
      from.y + span.y * t - sag * 4 * t * (1 - t),
      from.z + span.z * t,
    );
    for (let step = 0; step <= segments; step++) {
      const t = step / segments, point = pointAt(t);
      if (previous) {
        const delta = point.clone().sub(previous), direction = delta.clone().normalize();
        wireMatrices.push({
          position: previous.clone().add(point).multiplyScalar(.5),
          quaternion: new THREE.Quaternion().setFromUnitVectors(yAxis, direction),
          scale: new THREE.Vector3(.014, delta.length(), .014),
        });
      }
      previous = point;
    }
    const count = Math.max(2, Math.floor(length / spacing));
    for (let bulb = 0; bulb <= count; bulb++) {
      const t = bulb / count;
      bulbPositions.push(pointAt(t));
      bulbColors.push(LIT_COLORS[bulb % LIT_COLORS.length]);
    }
  }
  if (wireMatrices.length) {
    const wires = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(1, 1, 1, 5),
      new THREE.MeshStandardMaterial({ color: '#385342', roughness: .75 }),
      wireMatrices.length,
    );
    wireMatrices.forEach((part, index) => setInstance(wires, index, part.position, part.quaternion, part.scale));
    wires.instanceMatrix.needsUpdate = true;
    wires.castShadow = false;
    wires.receiveShadow = false;
    root.add(wires);
  }
  if (bulbPositions.length) {
    const bulbs = new THREE.InstancedMesh(
      new THREE.SphereGeometry(.085, 7, 5),
      new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }),
      bulbPositions.length,
    );
    bulbPositions.forEach((position, index) => {
      setInstance(bulbs, index, position, new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
      bulbs.setColorAt(index, new THREE.Color(bulbColors[index]));
    });
    bulbs.instanceMatrix.needsUpdate = true;
    if (bulbs.instanceColor) bulbs.instanceColor.needsUpdate = true;
    bulbs.castShadow = false;
    bulbs.receiveShadow = false;
    root.add(bulbs);
  }
}

function addWreaths(root, wreaths) {
  if (!wreaths.length) return;
  const ring = new THREE.InstancedMesh(
    new THREE.TorusGeometry(.34, .085, 7, 18),
    new THREE.MeshStandardMaterial({ color: '#28603f', roughness: .9 }),
    wreaths.length,
  );
  const foliage = [], ornaments = [];
  const orientation = new THREE.Object3D();
  wreaths.forEach((wreath, index) => {
    const yaw = wreath.rotationY ?? 0;
    orientation.position.set(wreath.x, wreath.y, wreath.z);
    orientation.rotation.set(0, yaw, 0);
    orientation.updateMatrix();
    ring.setMatrixAt(index, orientation.matrix);
    for (let leaf = 0; leaf < 9; leaf++) {
      const angle = leaf / 9 * Math.PI * 2;
      const local = new THREE.Vector3(Math.cos(angle) * .35, Math.sin(angle) * .35, .015);
      local.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
      foliage.push({ position: new THREE.Vector3(wreath.x, wreath.y, wreath.z).add(local), color: leaf % 3 ? '#356d47' : '#477a4e' });
    }
    for (const [angle, color] of [[Math.PI * .72, '#d94e49'], [Math.PI, '#f1c85b'], [Math.PI * 1.28, '#d94e49']]) {
      const local = new THREE.Vector3(Math.cos(angle) * .38, Math.sin(angle) * .38, .06);
      local.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
      ornaments.push({ position: new THREE.Vector3(wreath.x, wreath.y, wreath.z).add(local), color });
    }
  });
  ring.instanceMatrix.needsUpdate = true;
  ring.castShadow = false;
  ring.receiveShadow = false;
  root.add(ring);

  const createSpheres = (instances, radius, defaultColor) => {
    if (!instances.length) return;
    const mesh = new THREE.InstancedMesh(
      new THREE.SphereGeometry(radius, 6, 4),
      new THREE.MeshStandardMaterial({ color: defaultColor, roughness: .8 }),
      instances.length,
    );
    instances.forEach(({ position, color }, index) => {
      setInstance(mesh, index, position, new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
      if (color) mesh.setColorAt(index, new THREE.Color(color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    root.add(mesh);
  };
  createSpheres(foliage, .11, '#356d47');
  createSpheres(ornaments, .085, '#ffffff');
}

export function addChristmasDecorations(root, { strands = [], wreaths = [] } = {}) {
  const decorations = new THREE.Group();
  decorations.name = 'Christmas decorations';
  addLights(decorations, strands);
  addWreaths(decorations, wreaths);
  root.add(decorations);
  return decorations;
}
