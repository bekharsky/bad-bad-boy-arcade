import * as THREE from 'three';

const LIT_COLORS = ['#fff0ba', '#ffd76c', '#fff0ba', '#f5c65a', '#fff0ba'];

function setInstance(mesh, index, position, quaternion, scale) {
  const object = new THREE.Object3D();
  object.position.copy(position);
  object.quaternion.copy(quaternion);
  object.scale.copy(scale);
  object.updateMatrix();
  mesh.setMatrixAt(index, object.matrix);
}

function addSegment(instances, from, to, radius) {
  const delta = to.clone().sub(from);
  const length = delta.length();
  if (length < 1e-4) return;
  instances.push({
    position: from.clone().add(to).multiplyScalar(.5),
    quaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.multiplyScalar(1 / length)),
    scale: new THREE.Vector3(radius, length, radius),
  });
}

function addLights(root, strands) {
  if (!strands.length) return;
  const wireMatrices = [], bulbPositions = [], bulbColors = [], lanternPositions = [];
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
    const bulbCount = Math.max(2, Math.floor(length / spacing));
    for (let bulb = 0; bulb <= bulbCount; bulb++) {
      const t = bulb / bulbCount;
      bulbPositions.push(pointAt(t));
      bulbColors.push(LIT_COLORS[bulb % LIT_COLORS.length]);
    }

    const lanternCount = Math.max(2, Math.floor(length / (strand.lanternSpacing ?? 2.7)));
    for (let lantern = 0; lantern < lanternCount; lantern++) {
      const t = (lantern + 1) / (lanternCount + 1);
      const point = pointAt(t);
      lanternPositions.push(point);
      addSegment(wireMatrices, point, point.clone().add(new THREE.Vector3(0, -.075, 0)), .012);
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
  if (lanternPositions.length) {
    const profile = [
      [.045, 0], [.12, .025], [.17, .09], [.15, .14],
      [.105, .19], [.16, .24], [.18, .32], [.16, .39],
      [.105, .44], [.15, .48], [.12, .5], [.045, .52],
    ].map(([radius, height]) => new THREE.Vector2(radius, height));
    const lanterns = new THREE.InstancedMesh(
      new THREE.LatheGeometry(profile, 10),
      new THREE.MeshStandardMaterial({
        color: '#ffc943', emissive: '#df8b12', emissiveIntensity: .7,
        roughness: .45, metalness: .04,
      }),
      lanternPositions.length,
    );
    lanternPositions.forEach((position, index) => {
      setInstance(lanterns, index, position.clone().add(new THREE.Vector3(0, -.59, 0)), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
    });
    lanterns.instanceMatrix.needsUpdate = true;
    lanterns.castShadow = false;
    lanterns.receiveShadow = false;
    root.add(lanterns);
  }
}

function addWireFigures(root, strands) {
  const segments = [];
  for (const strand of strands) {
    if (strand.wireFigures === false) continue;
    const from = new THREE.Vector3(...strand.from), to = new THREE.Vector3(...strand.to);
    const span = to.clone().sub(from), length = span.length();
    if (!length) continue;
    const count = Math.max(1, Math.floor(length / (strand.figureSpacing ?? 6.2)));
    const direction = span.clone().normalize();
    const side = new THREE.Vector3().crossVectors(direction, new THREE.Vector3(0, 1, 0)).normalize();
    if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
    const pointAt = t => new THREE.Vector3(
      from.x + span.x * t,
      from.y + span.y * t - (strand.sag ?? .7) * 4 * t * (1 - t),
      from.z + span.z * t,
    );
    const outer = [[0, .5], [.18, .19], [.46, 0], [.18, -.19], [0, -.5], [-.18, -.19], [-.46, 0], [-.18, .19]];
    const inner = [[0, .3], [.27, 0], [0, -.3], [-.27, 0]];
    const makePoints = (center, outline, depth) => outline.map(([x, y]) => center.clone()
      .addScaledVector(side, x)
      .add(new THREE.Vector3(0, y, 0))
      .addScaledVector(direction, depth));
    const connectLoop = points => {
      for (let index = 0; index < points.length; index++) addSegment(segments, points[index], points[(index + 1) % points.length], .012);
    };

    for (let figure = 0; figure < count; figure++) {
      const anchor = pointAt((figure + (strand.figurePhase ?? .38)) / count);
      const center = anchor.clone().add(new THREE.Vector3(0, -.69, 0));
      const frontOuter = makePoints(center, outer, .11), backOuter = makePoints(center, outer, -.11);
      const frontInner = makePoints(center, inner, .11), backInner = makePoints(center, inner, -.11);
      connectLoop(frontOuter); connectLoop(backOuter);
      connectLoop(frontInner); connectLoop(backInner);
      for (const index of [0, 2, 4, 6]) {
        addSegment(segments, frontOuter[index], frontInner[index / 2], .011);
        addSegment(segments, backOuter[index], backInner[index / 2], .011);
      }
      for (let index = 0; index < outer.length; index++) addSegment(segments, frontOuter[index], backOuter[index], .011);
      for (let index = 0; index < inner.length; index++) addSegment(segments, frontInner[index], backInner[index], .011);
    }
  }
  if (!segments.length) return;
  const figures = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(1, 1, 1, 5),
    new THREE.MeshStandardMaterial({ color: '#dba938', roughness: .5, metalness: .28 }),
    segments.length,
  );
  segments.forEach((part, index) => setInstance(figures, index, part.position, part.quaternion, part.scale));
  figures.instanceMatrix.needsUpdate = true;
  figures.castShadow = false;
  figures.receiveShadow = false;
  root.add(figures);
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
  addWireFigures(decorations, strands);
  addWreaths(decorations, wreaths);
  root.add(decorations);
  return decorations;
}
