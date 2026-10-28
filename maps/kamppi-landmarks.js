import * as THREE from 'three';
import { createSceneryModel } from './scenery-model.js';

// Original procedural scenery, guided by the Narinkkatori photo references in README.
// Each building owns its geometry and sign textures, including when it fades.
export function addSign(group, text, x, y, z, width, height, { background = '#253b40', color = '#f8f2dc', turn = 0 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = 192;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = background; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = color; ctx.font = 'bold 100px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 512, 100, 970);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshStandardMaterial({ map: texture, roughness: .8 }));
  mesh.name = text; mesh.position.set(x, y, z); mesh.rotation.y = turn;
  group.add(mesh);
  return mesh;
}

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
  // A restrained graphic billboard is drawn locally; no advertisements are downloaded.
  box('#263942', -1.9, 7.35, 5.4, 5.3, 6.7, .45);
  const group = model.finish({ vertexColors: true });
  addSign(group, 'KAMPPI HELSINKI', -1, 2.45, 7.48, 11.5, .87);
  addSign(group, 'CITY / BREAK', -1.9, 8.8, 5.65, 4.85, 1.5, { background: '#8c415a' });
  addSign(group, 'KAMPPI', -1.9, 6.8, 5.65, 4.85, 1.15, { background: '#bf8052' });
  addSign(group, 'MEET · EAT · REPEAT', -1.9, 5.1, 5.65, 4.85, .7, { background: '#8c415a' });
  for (const [text, x] of [['KAHVI', -17], ['KAUPPA', -10], ['KORTTELI', 10], ['KUKKIA', 17]]) {
    addSign(group, text, x, 2.35, 5.36, 4.8, .49);
  }
  addSign(group, 'M', -7.3, 1.55, 7.5, .8, .8, { background: '#cf542c' });
  addSign(group, 'METRO  /  BUS', 6.8, 1.4, 5.36, 3.5, .48);
  group.position.set(-7, 0, -24);
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
  addSign(group, 'KAMPIN KAPPELI', 5.2, 2.27, 2.02, 3.4, .3, { background: '#9c9f91', color: '#334b4e' });
  group.position.set(20, 0, -4.5);
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
  group.position.set(-15, 0, -7);
  return group;
}

export function createOldBusStation() {
  const model = createSceneryModel('Old Kamppi bus station');
  const { box } = model;
  box('#d6caa4', 0, 1.85, 0, 8.6, 3.7, 23);
  box('#83897f', 0, .25, 0, 8.75, .5, 23.1);
  box('#dfdbbc', 0, 3.65, 0, 9, .22, 23.4);
  box('#697b72', 0, 3.9, 0, 9.1, .32, 23.5);
  for (const side of [-1, 1]) for (let z = -10; z <= 10; z += 2) {
    box('#ebe0bc', side * 4.35, 1.9, z, .1, 1.85, 1.45);
    box('#4a6865', side * 4.43, 1.9, z, .06, 1.6, 1.2);
    box('#c9c9ad', side * 4.48, 1.9, z, .05, 1.6, .045);
  }
  box('#405954', 4.5, 1.3, 0, .1, 2.6, 2.25);
  box('#9a9780', 5.2, 2.9, 0, 1.8, .14, 5);
  const group = model.finish({ vertexColors: true });
  addSign(group, 'VANHA LINJA-AUTOASEMA', 4.56, 3.18, 0, 10, .46, { turn: Math.PI / 2 });
  addSign(group, 'KAHVI', 4.56, 2.9, 7, 2.8, .4, { turn: Math.PI / 2, background: '#826244' });
  group.position.set(-27, 0, -2);
  return group;
}
