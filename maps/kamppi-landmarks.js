import * as THREE from 'three';
import { createSceneryModel } from './scenery-model.js';

// Original procedural scenery, guided by the Narinkkatori photo references in README.
export function createKamppiCentre() {
  const model = createSceneryModel('Kamppi shopping centre');
  const { box } = model;
  const frame = '#a5b7ba', dark = '#34484d';
  box('#6c797a', 0, 5.8, 0, 44, 11.6, 10);
  box('#435759', 0, 1.4, 5.06, 44, 2.8, .16);
  // Tall glazed bays, their narrow mullions and reflected sky break up the facade.
  const glass = ['#789ba5', '#8cabb1', '#6f909d', '#a2b9bd', '#658590'];
  for (let col = 0; col < 22; col++) {
    const x = -21 + col * 2;
    for (let row = 0; row < 6; row++) {
      const y = 3.65 + row * 1.24;
      box(glass[(col * 3 + row * 2) % glass.length], x, y, 5.12, 1.92, 1.17, .08);
      box('#bed0d0', x - .63, y, 5.18, .035, 1.18, .025);
      box('#bed0d0', x + .63, y, 5.18, .035, 1.18, .025);
    }
    box(frame, x - 1, 6.8, 5.24, .07, 8.45, .12);
    // Shop windows use warm interiors below the much cooler curtain wall.
    box(col % 4 ? '#365d62' : '#9b9882', x, 1.3, 5.19, 1.86, 2.3, .1);
    box(frame, x - 1, 1.4, 5.25, .08, 2.8, .14);
    if (col % 3 === 0) box('#e0c797', x, 2.1, 5.28, 1.3, .035, .035);
  }
  for (let y = 3; y < 11.4; y += 1.24) box(dark, 0, y, 5.25, 44, .065, .16);
  // Glazed side returns make the alleys behind the mall feel finished too.
  for (const side of [-1, 1]) {
    for (let z = -4; z <= 4; z += 2) for (let y = 1.1; y < 11; y += 1.8) {
      box(glass[(Math.round(y) + Math.round(z + 4)) % glass.length], side * 22.04, y, z, .08, 1.66, 1.86);
    }
    for (let z = -5; z <= 5; z += 2) box(frame, side * 22.12, 5.7, z, .12, 11.4, .065);
  }
  for (let x = -20; x <= 20; x += 4) {
    box('#4a6064', x, 5, -5.06, 2.9, 6.6, .1);
    box(frame, x, 8.6, -5.13, 3, .12, .12);
  }
  box('#d0d6cb', 0, 11.7, 0, 44.5, .22, 10.4);
  box('#626f69', 0, 12.1, -1.8, 38, .65, 5.6);
  for (let x = -18; x <= 18; x += .65) box('#ad9b7d', x, 12.6, .9, .11, 1.05, .1);
  box(frame, 0, 13.1, .9, 37, .08, .12);
  // The square's characteristic projecting glass canopy and steel trusses.
  box('#89a7aa', 0, 2.94, 6.15, 44.8, .12, 2.6);
  for (let x = -21; x <= 21; x += 3) {
    box(frame, x, 2.81, 6.15, .07, .15, 2.8);
    box(frame, x, 1.45, 7.27, .07, 2.9, .07);
    box(frame, x, 2.93, 6.15, .09, .08, 2.8);
  }
  for (const z of [5.45, 6.2, 7.4]) box(frame, 0, 2.95, z, 45, .09, .07);
  // A central glazed lift shaft rises above the roof, as in the photographs.
  box('#63828b', 2.8, 8.25, 5.5, 2.4, 12.1, 1.05);
  for (let y = 3; y <= 14.2; y += .8) box(frame, 2.8, y, 6.08, 2.45, .055, .06);
  for (const x of [1.57, 2.8, 4.03]) box(frame, x, 8.25, 6.08, .06, 12.2, .06);
  const group = model.finish({ vertexColors: true });
  group.scale.setScalar(1.25);
  group.position.set(0, 0, -29);
  return group;
}

export function createKamppiChapel() {
  const model = createSceneryModel('Kamppi Chapel of Silence');
  // A tapered, slightly asymmetric oval bowl, with horizontal spruce-board courses.
  // This is a closed volume; its lower glass vestibule faces the square.
  function ovalBand(y0, y1, color, extra = 0) {
    const positions = [], indices = [], segments = 64;
    for (const y of [y0, y1]) {
      const t = y / 8.1, swell = .73 + .27 * Math.sin(t * Math.PI / 2);
      for (let i = 0; i <= segments; i++) {
        const angle = i / segments * Math.PI * 2;
        const shape = 1 + .07 * Math.sin(angle);
        positions.push(Math.cos(angle) * (4.6 * swell + extra) * shape, y, Math.sin(angle) * (3.65 * swell + extra));
      }
    }
    for (let i = 0; i < segments; i++) {
      const a = i, b = i + 1, c = i + segments + 1, d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(positions.length / 3 * 2), 2));
    geometry.setIndex(indices); geometry.computeVertexNormals();
    model.geometry(color, geometry);
  }
  const timber = ['#b77938', '#b77b3c', '#bf8544', '#b77c3c', '#c28b4b'];
  for (let row = 0; row < 72; row++) {
    const y = .15 + row * .11;
    ovalBand(y, y + .106, timber[row % timber.length]);
    ovalBand(y + .106, y + .11, '#926333');
  }
  ovalBand(8.07, 8.16, '#4d5148', .02);
  model.geometry('#787d70', new THREE.CylinderGeometry(1, 1, .08, 64).scale(4.5, 1, 3.55).translate(0, 8.08, 0));
  model.box('#6e716a', 0, .1, 0, 6.5, .2, 5.8);
  model.box('#b7b6a8', 5.2, 1.3, -.9, 4.3, 2.6, 5.5);
  model.box('#5d787a', 5.2, 1.18, 1.88, 4.08, 2.25, .12);
  model.box('#bfc1b3', 5.2, 2.64, -.9, 4.7, .15, 5.8);
  for (const x of [3.2, 4.6, 5.8, 7.2]) model.box('#a4afaa', x, 1.2, 1.99, .07, 2.4, .08);
  model.box('#e0cfac', 5.2, 1.1, 2.05, .035, .7, .03);
  model.box('#e0cfac', 5.2, 1.2, 2.05, .22, .035, .03);
  const group = model.finish({ vertexColors: true });
  group.position.set(-22, 0, -6.5);
  return group;
}

export function createEntrepreneursMonument() {
  const model = createSceneryModel('Entrepreneurs monument');
  // An interpretation of Eva Löfdahl's open aluminium lattice and suspended stone.
  const rod = (a, b) => {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), delta = end.sub(start);
    const geometry = new THREE.CylinderGeometry(.025, .025, delta.length(), 5);
    geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.clone().normalize()));
    geometry.translate(...start.addScaledVector(delta, .5).toArray());
    model.geometry('#c8c8aa', geometry);
  };
  // Interlocking rhombi give the outer shell its distinctive perforated silhouette.
  const segments = 14, rows = 9;
  for (let row = 0; row < rows; row++) {
    const y = .15 + row * .5;
    const radius = 1.35 + .42 * Math.sin(row / (rows - 1) * Math.PI);
    for (let col = 0; col < segments; col++) {
      const angle = (col + row % 2 * .5) / segments * Math.PI * 2, half = Math.PI / segments;
      const bottom = [Math.cos(angle) * radius, y, Math.sin(angle) * radius];
      const left = [Math.cos(angle - half) * radius, y + .25, Math.sin(angle - half) * radius];
      const right = [Math.cos(angle + half) * radius, y + .25, Math.sin(angle + half) * radius];
      const top = [bottom[0], y + .5, bottom[2]];
      rod(bottom, left); rod(bottom, right); rod(left, top); rod(right, top);
      if (row % 2 === 0) rod(left, right);
    }
  }
  model.box('#444e49', 0, 1, 0, .65, 1.3, .65);
  model.box('#e9d798', 0, .32, 0, .5, .035, .5);
  model.box('#969e94', 0, .035, 0, 3.8, .07, 3.8);
  const group = model.finish({ vertexColors: true });
  group.position.set(14, 0, -8);
  return group;
}

export function createKasarmi() {
  const model = createSceneryModel('Kulttuurikasarmi');
  const { box } = model;
  box('#dfc78e', 0, 2.65, 0, 50, 5.3, 8.6);
  box('#90968a', 0, .25, 0, 50.1, .5, 8.7);
  box('#e6e0c5', 0, 5.2, 0, 50.4, .22, 8.9);
  box('#657568', 0, 5.48, 0, 50.6, .34, 9.1);
  for (const y of [.5, 2.65, 5]) box('#eae3c5', 0, y, 0, 50.2, .12, 8.8);
  for (const side of [-1, 1]) for (let x = -23; x <= 23; x += 2.3) {
    for (const y of [1.55, 3.8]) {
      box('#efe7cf', x, y, side * 4.35, 1.1, 1.65, .12);
      box('#567574', x, y, side * 4.43, .84, 1.41, .05);
      box('#dcdcc5', x, y, side * 4.48, .045, 1.43, .04);
      for (const dy of [-.35, .15]) box('#dcdcc5', x, y + dy, side * 4.48, .85, .035, .04);
      box('#e8e0c5', x, y - .89, side * 4.44, 1.25, .12, .23);
    }
  }
  for (const side of [-1, 1]) {
    box('#567371', 5.5, 1.35, side * 4.48, 3.1, 2.7, .16);
    for (const x of [3.8, 5.5, 7.2]) box('#e1dec2', x, 1.35, side * 4.6, .09, 2.7, .1);
    // Three shallow barrel canopies echo the entrance in the supplied street view.
    for (const x of [3.8, 5.5, 7.2]) {
      const canopy = new THREE.CylinderGeometry(.85, .85, 1.6, 16, 1, true, 0, Math.PI);
      canopy.rotateZ(Math.PI / 2).rotateY(Math.PI / 2).translate(x, 2.85, side * 5.1);
      model.geometry('#d5d5c1', canopy);
      for (const dx of [-.8, .8]) box('#c8cbbb', x + dx, 1.4, side * 5.7, .06, 2.8, .06);
    }
  }
  const group = model.finish({ vertexColors: true });
  group.position.set(5, 0, 19);
  return group;
}

export function createLasipalatsi() {
  // Separate wings have their own fade bounds; the open courtyard stays visible.
  function wing(name, x, z, width, depth, height, turn = 0) {
    const model = createSceneryModel(name), { box } = model;
    box('#e8e7d4', 0, height / 2, 0, width, height, depth);
    box('#b6bdb1', 0, .17, 0, width + .08, .34, depth + .08);
    box('#f0eedb', 0, height + .05, 0, width + .3, .16, depth + .3);
    box('#a5b2a6', 0, height + .17, 0, width + .1, .1, depth + .1);
    for (const side of [-1, 1]) {
      box('#a5b6b1', 0, 2.8, side * (depth / 2 + .07), width - .8, .97, .1);
      box('#eee9d1', 0, 3.36, side * (depth / 2 + .13), width - .3, .15, .2);
      box('#e4ddc3', 0, 2.26, side * (depth / 2 + .13), width - .3, .12, .2);
      for (let px = -width / 2 + 1; px < width / 2; px += 1.5) {
        box('#567d7b', px, 2.8, side * (depth / 2 + .14), 1.37, .75, .04);
        box('#526f70', px, 1.03, side * (depth / 2 + .1), 1.25, 1.65, .08);
        box('#d5d5be', px + .71, 1.05, side * (depth / 2 + .15), .1, 2.1, .14);
        box('#d5d5be', px + .71, 2.81, side * (depth / 2 + .18), .07, .94, .08);
      }
      // Orange sun blinds distinguish the low functionalist building.
      box('#c27747', 0, 2.02, side * (depth / 2 + .55), width - .6, .1, 1.1);
      box('#ddcba4', 0, 1.94, side * (depth / 2 + 1.05), width - .6, .2, .07);
    }
    const group = model.finish({ vertexColors: true });
    group.position.set(x, 0, z); group.rotation.y = turn;
    return group;
  }
  return [
    wing('Lasipalatsi', 0, 52, 60, 7, 4.1),
    wing('Lasipalatsi cinema wing', -27, 41.5, 20, 6, 5.2, Math.PI / 2),
    wing('Lasipalatsi cafe wing', 27, 41.5, 20, 6, 4.1, Math.PI / 2),
  ];
}

export function createLasipalatsiClockTower() {
  const model = createSceneryModel('Lasipalatsi clock tower'), { box } = model;
  box('#dadfce', 0, 1.25, 0, 1.8, 2.5, 1.8);
  model.geometry('#e3e6d6', new THREE.CylinderGeometry(.64, .8, 4.2, 24).translate(0, 3.2, 0));
  box('#ebe9d4', 0, 5.1, 0, 2.15, 1.65, 2.15);
  for (const turn of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const face = new THREE.Group(), clock = createSceneryModel('Clock face');
    clock.geometry('#a86650', new THREE.CylinderGeometry(.47, .47, .05, 32).rotateX(Math.PI / 2));
    clock.geometry('#ece6cd', new THREE.CircleGeometry(.4, 32).translate(0, 0, .035));
    for (let hour = 0; hour < 12; hour++) {
      const angle = hour * Math.PI / 6;
      clock.box('#4e6767', Math.sin(angle) * .33, Math.cos(angle) * .33, .047, .025, .065, .018, -angle);
    }
    clock.box('#354f50', .1, .05, .065, .25, .035, .02, .45);
    clock.box('#354f50', 0, .14, .067, .035, .3, .02);
    face.add(clock.finish({ vertexColors: true }));
    face.position.set(Math.sin(turn) * 1.095, 5.1, Math.cos(turn) * 1.095); face.rotation.y = turn;
    // Keep the small clock faces coloured independently of the white shaft.
    face.updateMatrixWorld(true);
    face.traverse(node => {
      if (!node.isMesh) return;
      const piece = node.geometry.clone().applyMatrix4(node.matrixWorld);
      // Preserve colours from the small clock, unlike the solid-colour batch API.
      model.group.add(new THREE.Mesh(piece, node.material.clone()));
      node.geometry.dispose(); node.material.dispose();
    });
  }
  model.geometry('#e5e8da', new THREE.CylinderGeometry(.51, .62, 8.6, 24).translate(0, 10.2, 0));
  for (const y of [6.1, 13.7, 14.5]) model.geometry('#c0cbbb', new THREE.CylinderGeometry(.63, .63, .12, 24).translate(0, y, 0));
  for (let y = 6.5; y < 14.2; y += .45) box('#a5b2a9', -.54, y, 0, .05, .035, .5);
  model.geometry('#d4dccd', new THREE.ConeGeometry(.58, .35, 24).translate(0, 14.75, 0));
  // A plain open spiral tops the chimney; no lettering or advertising remains.
  const points = Array.from({ length: 65 }, (_, i) => {
    const angle = i / 64 * Math.PI * 5;
    return new THREE.Vector3(Math.cos(angle) * .28, 15 + i / 64 * 1.15, Math.sin(angle) * .28);
  });
  model.geometry('#a46c59', new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 64, .025, 5, false));
  const group = model.finish({ vertexColors: true }); group.position.set(8, 0, 38);
  return group;
}

export function createAmosRexMound(x, z, radius, height) {
  const model = createSceneryModel('Amos Rex skylight mound');
  const segments = 48, rings = 16, positions = [], uvs = [], indices = [];
  const topRadius = radius * .29;
  for (let row = 0; row <= rings; row++) {
    const t = row / rings, r = topRadius + (radius - topRadius) * (1 - t) ** 1.65;
    for (let col = 0; col <= segments; col++) {
      const angle = col / segments * Math.PI * 2;
      positions.push(Math.cos(angle) * r, height * t + Math.sin(angle) * topRadius * .48 * t ** 4, Math.sin(angle) * r);
      uvs.push(col / segments * radius * 3, t * height * 4);
    }
  }
  for (let row = 0; row < rings; row++) for (let col = 0; col < segments; col++) {
    const a = row * (segments + 1) + col, b = a + 1, c = a + segments + 1;
    indices.push(a, c, b, b, c, c + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#9fa89e'; ctx.fillRect(0, 0, 128, 128);
  for (let row = 0; row < 8; row++) for (let col = -1; col < 8; col++) {
    ctx.fillStyle = (row + col) % 3 ? '#e1e1cf' : '#d2d6c5';
    ctx.fillRect(col * 16 + row % 2 * 8 + 1, row * 16 + 1, 14, 14);
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  const shell = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ map: texture, roughness: .85 }));
  shell.castShadow = shell.receiveShadow = true; model.group.add(shell);
  const tilt = Math.atan(.48);
  model.geometry('#e7e8d6', new THREE.TorusGeometry(topRadius, .14, 8, 48).rotateX(-Math.PI / 2 - tilt).translate(0, height, 0));
  model.geometry('#739e9b', new THREE.CircleGeometry(topRadius - .08, 48).rotateX(-Math.PI / 2 - tilt).translate(0, height + .015, 0));
  const group = model.finish({ vertexColors: true }); group.position.set(x, 0, z);
  return group;
}
