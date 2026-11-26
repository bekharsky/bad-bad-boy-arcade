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

function addLitSegment(segments, bulbs, from, to, radius = .022, bulbSpacing = .3) {
  addSegment(segments, from, to, radius);
  const length = from.distanceTo(to), count = Math.max(1, Math.ceil(length / bulbSpacing));
  for (let index = 0; index <= count; index++) bulbs.push(from.clone().lerp(to, index / count));
}

function addLitWirework(root, segments, bulbs, name, bulbRadius = .045) {
  if (segments.length) {
    const wire = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(1, 1, 1, 5),
      new THREE.MeshStandardMaterial({
        color: '#d4a447', emissive: '#a86912', emissiveIntensity: .65,
        roughness: .5, metalness: .2,
      }),
      segments.length,
    );
    wire.name = `${name} wire frame`;
    segments.forEach((part, index) => setInstance(wire, index, part.position, part.quaternion, part.scale));
    wire.instanceMatrix.needsUpdate = true;
    wire.castShadow = false; wire.receiveShadow = false;
    root.add(wire);
  }
  if (bulbs.length) {
    const lights = new THREE.InstancedMesh(
      new THREE.SphereGeometry(1, 6, 4),
      new THREE.MeshBasicMaterial({ color: '#ffe1a0', toneMapped: false }),
      bulbs.length,
    );
    lights.name = `${name} warm bulbs`;
    bulbs.forEach((position, index) => setInstance(
      lights, index, position, new THREE.Quaternion(), new THREE.Vector3(bulbRadius, bulbRadius, bulbRadius),
    ));
    lights.instanceMatrix.needsUpdate = true;
    lights.castShadow = false; lights.receiveShadow = false;
    root.add(lights);
  }
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
      if (previous && strand.wire !== false) {
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
      if (strand.wire !== false) addSegment(wireMatrices, point, point.clone().add(new THREE.Vector3(0, -.045, 0)), .009);
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
      new THREE.SphereGeometry(.06, 7, 5),
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
      setInstance(lanterns, index, position.clone().add(new THREE.Vector3(0, -.35, 0)), new THREE.Quaternion(), new THREE.Vector3(.58, .58, .58));
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

function addWireLetters(root, letters) {
  const segments = [], bulbs = [];
  for (const letter of letters) {
    const scale = letter.scale ?? 1, width = 1.8, height = 2.45, depth = .28;
    const point = (x, y, z) => new THREE.Vector3(
      letter.x + x * scale,
      (letter.y ?? 0) + y * scale,
      letter.z + z * scale,
    );
    for (const side of [-1, 1]) {
      const z = side * depth / 2;
      const apex = point(0, height, z), leftBase = point(-width / 2, 0, z), rightBase = point(width / 2, 0, z);
      addLitSegment(segments, bulbs, leftBase, apex, .026, .24);
      addLitSegment(segments, bulbs, apex, rightBase, .026, .24);
      const crossbarY = height * .43, crossbarHalf = width * .5 * (1 - crossbarY / height) * .78;
      addLitSegment(segments, bulbs, point(-crossbarHalf, crossbarY, z), point(crossbarHalf, crossbarY, z), .024, .24);
      for (const fraction of [.22, .68]) {
        const y = height * fraction, half = width * .5 * (1 - fraction) * .7;
        addLitSegment(segments, bulbs, point(-half, y, z), point(half, y, z), .016, .32);
      }
      const lowerY = height * .22, upperY = height * .43;
      addLitSegment(segments, bulbs, point(-width * .24, lowerY, z), point(width * .16, upperY, z), .016, .32);
      addLitSegment(segments, bulbs, point(width * .24, lowerY, z), point(-width * .16, upperY, z), .016, .32);
    }
    for (const [x, y] of [[-width / 2, 0], [0, height], [width / 2, 0], [-width * .16, height * .43], [width * .16, height * .43]]) {
      addLitSegment(segments, bulbs, point(x, y, -depth / 2), point(x, y, depth / 2), .016, .34);
    }
  }
  addLitWirework(root, segments, bulbs, 'Luminous A', .04);
}

function figurePoint(figure, local, scale, rotation) {
  const cosine = Math.cos(rotation), sine = Math.sin(rotation);
  const [x, y, z] = local;
  return new THREE.Vector3(
    figure.x + (x * cosine + z * sine) * scale,
    (figure.y ?? .04) + y * scale,
    figure.z + (-x * sine + z * cosine) * scale,
  );
}

function addTreeFigure(segments, bulbs, figure) {
  const scale = figure.scale ?? .72, rotation = figure.rotationY ?? 0;
  const point = (x, y, z) => figurePoint(figure, [x, y, z], scale, rotation);
  const sides = 8;
  const ring = (y, radius, depthScale = .72) => Array.from({ length: sides }, (_, index) => {
    const angle = index * Math.PI * 2 / sides;
    return point(Math.cos(angle) * radius, y, Math.sin(angle) * radius * depthScale);
  });
  const tiers = [[.3, 1.12, 1.22], [1.02, .88, 1.92], [1.72, .64, 2.62], [2.42, .39, 3.32]];
  addLitSegment(segments, bulbs, point(0, .06, 0), point(0, 3.55, 0), .027, .36);
  for (const [baseY, radius, tipY] of tiers) {
    const base = ring(baseY, radius), tip = ring(tipY, .055);
    for (let index = 0; index < sides; index++) {
      const next = (index + 1) % sides;
      addLitSegment(segments, bulbs, base[index], base[next], .021, .38);
      addLitSegment(segments, bulbs, base[index], tip[index], .022, .36);
      addLitSegment(segments, bulbs, base[index], tip[(index + 1) % sides], .015, .4);
    }
  }
  const star = [];
  for (let index = 0; index < 10; index++) {
    const angle = Math.PI / 2 + index * Math.PI / 5;
    const radius = index % 2 ? .14 : .32;
    star.push(point(Math.cos(angle) * radius, 3.7 + Math.sin(angle) * radius, 0));
  }
  for (let index = 0; index < star.length; index++) addLitSegment(segments, bulbs, star[index], star[(index + 1) % star.length], .018, .26);
}

function addDeerFigure(segments, bulbs, figure) {
  const scale = figure.scale ?? .66, rotation = figure.rotationY ?? 0;
  const point = (x, y, z) => figurePoint(figure, [x, y, z], scale, rotation);
  const ribs = [-.72, -.36, 0, .36, .72].map(x => Array.from({ length: 8 }, (_, index) => {
    const angle = index * Math.PI / 4;
    return point(x, 1.38 + Math.sin(angle) * .38, Math.cos(angle) * .32);
  }));
  for (let rib = 0; rib < ribs.length; rib++) {
    for (let index = 0; index < 8; index++) {
      addLitSegment(segments, bulbs, ribs[rib][index], ribs[rib][(index + 1) % 8], .02, .3);
      if (rib < ribs.length - 1) {
        addLitSegment(segments, bulbs, ribs[rib][index], ribs[rib + 1][index], .018, .34);
        if (index % 2 === 0) addLitSegment(segments, bulbs, ribs[rib][index], ribs[rib + 1][(index + 1) % 8], .014, .4);
      }
    }
  }
  for (const side of [-1, 1]) {
    const z = side * .27;
    addLitSegment(segments, bulbs, point(.48, 1.55, z), point(.83, 2.02, z * .78), .025, .28);
    addLitSegment(segments, bulbs, point(.83, 2.02, z * .78), point(1.18, 2.1, z * .72), .023, .26);
    for (const [x, y, width, height] of [[1.02, 2.12, .2, .18], [1.25, 2.08, .16, .12]]) {
      const head = Array.from({ length: 8 }, (_, index) => {
        const angle = index * Math.PI / 4;
        return point(x + Math.cos(angle) * width, y + Math.sin(angle) * height, z * .72);
      });
      for (let index = 0; index < head.length; index++) addLitSegment(segments, bulbs, head[index], head[(index + 1) % head.length], .018, .26);
    }
    const antler = [
      [1.1, 2.23], [1.12, 2.56], [.96, 2.77], [.97, 2.96],
      [1.12, 2.56], [1.31, 2.78], [1.34, 2.99], [1.31, 2.78], [1.49, 2.85],
    ].map(([x, y]) => point(x, y, z * .58));
    for (let index = 0; index < antler.length - 1; index++) addLitSegment(segments, bulbs, antler[index], antler[index + 1], .018, .25);
  }
  for (const x of [-.55, .52]) for (const side of [-1, 1]) {
    const z = side * .23, knee = x > 0 ? x + .06 : x - .08;
    addLitSegment(segments, bulbs, point(x, 1.15, z), point(knee, .66, z * 1.1), .026, .28);
    addLitSegment(segments, bulbs, point(knee, .66, z * 1.1), point(knee - .08, .08, z * 1.15), .022, .25);
    addLitSegment(segments, bulbs, point(knee - .08, .08, z * 1.15), point(knee + .16, .08, z * 1.15), .022, .25);
  }
  addLitSegment(segments, bulbs, point(-.68, 1.48, 0), point(-1.03, 1.72, 0), .02, .28);
}

function addGroundFigures(root, groundFigures) {
  const segments = [], bulbs = [];
  for (const tree of groundFigures.trees ?? []) addTreeFigure(segments, bulbs, tree);
  for (const deer of groundFigures.deer ?? []) addDeerFigure(segments, bulbs, deer);
  addLitWirework(root, segments, bulbs, 'Ground holiday sculpture', .047);
}

export function addChristmasDecorations(root, { strands = [], wreaths = [], letters = [], groundFigures = {} } = {}) {
  const decorations = new THREE.Group();
  decorations.name = 'Christmas decorations';
  addLights(decorations, strands);
  addWireFigures(decorations, strands);
  addWireLetters(decorations, letters);
  addGroundFigures(decorations, groundFigures);
  addWreaths(decorations, wreaths);
  root.add(decorations);
  return decorations;
}
