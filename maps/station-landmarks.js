import * as THREE from 'three';
import { createSceneryModel } from './scenery-model.js';

const baked = { vertexColors: true };

// Extrude a front elevation towards the street. All five buildings use
// vertex colours so the district's snow and rain can shade the same meshes.
function elevation(model, color, shape, front, depth) {
  const solid = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 20 });
  model.geometry(color, solid.translate(0, 0, front - depth));
}

function archedHall(model, radius, spring, color, front, depth) {
  const arch = new THREE.Shape();
  arch.moveTo(-radius, 0); arch.lineTo(-radius, spring);
  arch.absarc(0, spring, radius, Math.PI, 0, true);
  arch.lineTo(radius, 0); arch.closePath();
  elevation(model, color, arch, front, depth);
}

function lanternBearer(model, x) {
  const stone = '#877c70', lightStone = '#ac9987', z = 4.2;
  model.box('#7e7269', x, .65, z, 1.25, 1.3, 1.3);
  model.geometry(stone, new THREE.CylinderGeometry(.44, .63, 2, 6).scale(1, 1, .83).translate(x, 2.28, z));
  model.geometry(lightStone, new THREE.DodecahedronGeometry(.72).scale(.96, 1.15, .69).translate(x, 3.42, z));
  model.geometry(lightStone, new THREE.DodecahedronGeometry(.49).scale(.86, 1.13, .78).translate(x, 4.37, z));
  model.geometry('#716962', new THREE.SphereGeometry(.425, 9, 5, 0, Math.PI * 2, 0, Math.PI * .57).scale(.94, .84, 1).translate(x, 4.55, z - .035));
  for (const side of [-1, 1]) {
    model.box('#786d60', x + side * .155, 4.44, z + .31, .18, .095, .09, -side * .12);
    model.box(lightStone, x + side * .23, 3.6, z + .34, .22, .48, .105, -side * .34);
  }
  model.box(lightStone, x, 4.34, z + .34, .15, .23, .14);
  for (const side of [-1, 1]) {
    model.box(stone, x + side * .52, 3.43, z + .15, .28, .85, .44, side * .12);
    model.box(lightStone, x + side * .42, 3.13, z + .47, .35, .24, .72);
  }
  model.geometry('#4a625b', new THREE.CylinderGeometry(.3, .23, .15, 12).translate(x, 3.23, z + .78));
  model.geometry('#ffe8a0', new THREE.SphereGeometry(.43, 16, 10).translate(x, 3.68, z + .78));
}

export function centralStation() {
  const m = createSceneryModel('Helsinki Central railway station');
  const { box } = m;
  box('#ae8473', 0, 3.2, -.4, 24, 6.4, 7.4);
  box('#687970', 0, 6.48, -.4, 24.2, .27, 7.65);
  archedHall(m, 5.05, 4.35, '#c0967f', 3.49, 7.4);
  archedHall(m, 4.54, 4.28, '#e0b69a', 3.56, .13);
  archedHall(m, 4.12, 4.19, '#476469', 3.63, .12);
  // Radiating granite voussoirs and narrow ribs distinguish the vaulted
  // concourse from the low, square window bays of the station wings.
  for (let i = 0; i < 24; i++) {
    const angle = (i + .5) * Math.PI / 24;
    const stone = new THREE.Shape();
    const left = angle - .062, right = angle + .062;
    for (const [j, [a, r]] of [[left, 4.58], [right, 4.58], [right, 5.05], [left, 5.05]].entries()) {
      const x = r * Math.cos(a), y = 4.35 + r * Math.sin(a);
      if (j === 0) stone.moveTo(x, y); else stone.lineTo(x, y);
    }
    stone.closePath();
    elevation(m, ['#c5a089', '#b49280', '#d0aa91'][i % 3], stone, 3.615, .09);
  }
  for (let x = -3.75; x < 4; x += .75) {
    const top = 4.19 + Math.sqrt(4.12 ** 2 - x ** 2);
    box('#967e66', x, (top + 1.9) / 2, 3.72, .115, top - 1.9, .14);
  }
  for (let y = 3; y < 8; y += 1.1) {
    const width = Math.sqrt(4.12 ** 2 - Math.max(0, y - 4.19) ** 2) * 2;
    box('#9c8973', 0, y, 3.72, width, .09, .15);
  }
  box('#735e52', 0, 1.22, 3.8, 7.9, 2.44, .24);
  for (const x of [-2.85, -.95, .95, 2.85]) {
    box('#394c4a', x, 1.08, 3.95, 1.5, 2.16, .08);
    box('#b09675', x, 1.08, 4.01, .075, 2.12, .05);
  }
  for (const side of [-1, 1]) {
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 5; col++) {
        const x = side * (7.51 + col * .95);
        box((row + col) % 3 ? '#a18171' : '#b4937e', x, .19 + row * .31, 3.36, .925, .285, .13);
      }
    }
    for (const y of [1.43, 5.57, 6.24]) box('#c5a68d', side * 9.5, y, 3.41, 5, .13, .29);
    for (let j = 0; j < 3; j++) {
      box('#725f53', side * 12.01, 3.65, -2.65 + 2.15 * j, .14, 3.1, 1.05);
      box('#76918e', side * 12.1, 3.67, -2.65 + 2.15 * j, .05, 2.86, .82);
    }
    for (const dx of [4.91, 6.25]) {
      box('#b38e76', side * dx, 3.5, 3.51, 1.26, 7, .5);
      box('#d4ae8f', side * dx, 7.07, 3.51, 1.36, .23, .6);
      for (const groove of [-.3, 0, .3]) box('#967865', side * dx + groove, 5.97, 3.79, .065, 1.57, .065);
    }
    for (let i = 0; i < 5; i++) {
      const x = side * (7.45 + .92 * i);
      box('#685c55', x, 3.48, 3.33, .62, 3.8, .12);
      box('#79928a', x, 3.55, 3.41, .43, 3.44, .07);
      box('#cfaa90', x, 3.72, 3.47, .59, .13, .06);
    }
    for (const dx of [4.9, 6.24]) lanternBearer(m, side * dx);
  }
  // Tapered granite tower, copper lantern and clocks facing the two squares.
  const tx = 9, tz = -.7;
  box('#bd937c', tx, 7.6, tz, 3.8, 15.2, 3.9);
  for (const side of [-1, 1]) {
    box('#d1a589', tx + side * 1.69, 9.9, tz + 1.99, .29, 9.5, .27);
    box('#806d60', tx + side * .66, 9.6, tz + 1.99, .28, 4.6, .13);
  }
  box('#8d7060', tx, 15.13, tz, 4.1, .38, 4.15);
  m.geometry('#507b72', new THREE.CylinderGeometry(2, 2.74, 1.15, 4).rotateY(Math.PI / 4).translate(tx, 15.88, tz));
  box('#486a63', tx, 16.85, tz, 2.56, 1, 2.56);
  for (const x of [-.82, 0, .82]) box('#b6a987', tx + x, 16.82, tz + 1.31, .13, .9, .08);
  m.geometry('#497f75', new THREE.LatheGeometry([[1.9,0],[1.7,.65],[1.05,1.16],[.38,1.55],[.12,1.95]].map(([x,y]) => new THREE.Vector2(x,y)), 12).translate(tx, 17.33, tz));
  m.geometry('#405650', new THREE.ConeGeometry(.1, 1.1, 8).translate(tx, 19.76, tz));
  for (const turn of [0, -Math.PI / 2, Math.PI / 2, Math.PI]) {
    const clock = createSceneryModel('Station clock');
    for (const [color, radius, z] of [['#52605b', 1.08, 0], ['#f4dda2', .91, .055]]) {
      clock.geometry(color, new THREE.CircleGeometry(radius, 40).translate(0, 0, z));
    }
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6;
      clock.box('#5b5b4b', .76 * Math.sin(a), .76 * Math.cos(a), .09, .055, .17, .038, -a);
    }
    clock.box('#434b42', -.21, .17, .12, .095, .58, .04, .86);
    clock.box('#434b42', .22, .28, .13, .075, .77, .04, -.67);
    const face = clock.finish(baked);
    face.rotation.y = turn;
    face.position.set(tx + 2 * Math.sin(turn), 13.63, tz + 2 * Math.cos(turn)); m.group.add(face);
  }
  return m.finish(baked);
}

function officeWindows(m, width, depth, x, base, floors, spacing, frame) {
  for (const side of [-1, 1]) for (let floor = 0; floor < floors; floor++) {
    const y = base + floor * 1.38;
    for (let dx = -width / 2 + .9; dx < width / 2 - .45; dx += spacing) {
      m.box(frame, x + dx, y, side * (depth / 2 + .035), .96, .84, .09);
      m.box('#556e72', x + dx, y, side * (depth / 2 + .095), .77, .65, .055);
    }
    for (let dz = -depth / 2 + .85; dz < depth / 2 - .45; dz += spacing) {
      m.box('#60767a', x + side * (width / 2 + .04), y, dz, .09, .68, .8);
    }
  }
}

export function postitalo() {
  const m = createSceneryModel('Postitalo'), { box } = m;
  box('#d5ab5b', 0, 3.85, 0, 16, 7.7, 10);
  box('#b18747', 0, .54, 0, 16.14, 1.08, 10.15);
  box('#b89454', 0, 7.78, 0, 16.16, .22, 10.18);
  // Thin brick courses carry around the corner of the sorting-office block.
  for (let y = 1.2; y < 7.6; y += .32) {
    box('#c79f54', 0, y, 5.015, 16, .027, .025);
    box('#be984f', 8.015, y, 0, .03, .027, 10);
  }
  officeWindows(m, 16, 10, 0, 2.06, 4, 1.38, '#e3cc8a');
  box('#d9b269', -4.3, 9.52, 0, 6.85, 3.65, 10);
  officeWindows(m, 6.85, 10, -4.3, 8.56, 2, 1.35, '#edcf89');
  box('#797c6f', -4.3, 11.42, 0, 7.1, .22, 10.25);
  box('#334f4e', 2.1, 1.15, 5.16, 5.2, 2.3, .16);
  box('#d3c5a5', 2.1, 2.42, 5.66, 6.4, .16, 1.45);
  for (const x of [-.1, 1, 2.1, 3.2, 4.3]) box('#b19c77', x, 1.15, 5.26, .09, 2.28, .05);
  for (const x of [6.15, 7.14]) {
    box('#da6d2b', x, .8, 5.56, .78, 1.28, .65);
    box('#593f33', x, 1.18, 5.9, .48, .09, .04);
  }
  return m.finish(baked);
}

// Loft closed sections along the street frontage. The canopy, glazing and
// zinc roof get continuous curved surfaces and share vertices along each strip.
function loft(m, color, width, section, segments = 48) {
  const positions = [], indices = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments, x = width * (t - .5);
    const ring = section(t);
    for (const [y, z] of ring) positions.push(x, y, z);
    const n = ring.length, start = i * n;
    if (i < segments) for (let j = 0; j < n; j++) {
      const a = start + j, b = start + (j + 1) % n;
      indices.push(a, a + n, b, b, a + n, b + n);
    }
    if (i === 0 || i === segments) for (let j = 1; j < n - 1; j++) {
      if (i === 0) indices.push(start, start + j, start + j + 1);
      else indices.push(start, start + j + 1, start + j);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); g.setIndex(indices);
  g.computeVertexNormals();
  m.geometry(color, g);
}

export function oodi() {
  const m = createSceneryModel('Oodi library');
  const width = 32, bottom = t => 2.35 + 2.8 * Math.sin(Math.PI * t) ** 2 + 1.5 * t;
  const edge = t => 3.5 + 2.1 * Math.sin(t * Math.PI) + 1.6 * t;
  const deck = t => 6.85 + .45 * Math.cos(t * Math.PI);
  const roof = t => 9.4 + .4 * Math.cos(t * Math.PI * 3) + .28 * t;
  m.box('#47686c', 0, 2.8, -1.3, width - 1.4, 5.6, 5.15);
  for (let x = -15; x <= 15; x += 1.25) m.box('#9ca99c', x, 2.7, 1.31, .085, 5.4, .1);
  loft(m, '#cf9658', width, t => [[bottom(t), edge(t)], [deck(t), edge(t)], [deck(t), -4], [bottom(t), -4]]);
  for (let i = 1; i < 17; i++) {
    loft(m, i % 4 ? '#bc8954' : '#e1ac70', width, t => {
      const y = THREE.MathUtils.lerp(bottom(t), deck(t), i / 17), z = edge(t);
      return [[y, z + .03], [y + .036, z + .03], [y + .036, z - .02], [y, z - .02]];
    });
  }
  for (const x of [-9.8, -6.7, 5.4, 8.5]) {
    m.box('#abc6bc', x, 1.61, 1.34, 2.95, 3.22, .09);
    m.box('#416368', x, 1.38, 1.42, 2.64, 2.72, .075);
    m.box('#c4cbb6', x, 1.37, 1.48, .085, 2.7, .045);
    m.box('#d6c5a6', x, 1.08, 1.5, 2.61, .068, .045);
  }
  loft(m, '#e5d9c4', width + .25, t => [[deck(t), edge(t)], [deck(t) + .16, edge(t)], [deck(t) + .16, -4], [deck(t), -4]]);
  loft(m, '#94b7bc', width - .35, t => [[deck(t) + .15, 2.5], [roof(t), 2.5], [roof(t), -3.85], [deck(t) + .15, -3.85]]);
  for (let i = 1; i < 50; i++) {
    const t = i / 50;
    m.box('#c3d4cc', (width - .35) * (t - .5), (deck(t) + roof(t)) / 2, 2.52, .065, roof(t) - deck(t), .075);
  }
  for (let i = 1; i < 32; i++) {
    const t = i / 32;
    m.box('#bacdc4', width * (t - .5), deck(t) + .53, edge(t) - .13, .065, .8, .085);
  }
  loft(m, '#c4d1cb', width, t => [[deck(t) + .87, edge(t)], [deck(t) + .95, edge(t)], [deck(t) + .95, edge(t) - .16], [deck(t) + .87, edge(t) - .16]]);
  loft(m, '#f0eee0', width + .15, t => [[roof(t), 2.85], [roof(t) + .29, 2.85], [roof(t) + .29, -4.1], [roof(t), -4.1]]);
  return m.finish(baked);
}

export const kiasmaFront = t => 3.4 + 1.4 * Math.sin(Math.PI * t);
export const kiasmaRoof = t => 5.5 + 2.5 * Math.sin(Math.PI * t) + 1.4 * t;

export function kiasma() {
  const m = createSceneryModel('Kiasma');
  m.box('#c6c7b6', -1.3, 2.8, -1, 17.3, 5.6, 7);
  loft(m, '#9cbbba', 19, t => [[.15, kiasmaFront(t)], [kiasmaRoof(t) - .7, kiasmaFront(t)], [kiasmaRoof(t) - .7, -3], [.15, -3]]);
  loft(m, '#839594', 19.25, t => [[kiasmaRoof(t) - .85, kiasmaFront(t) + .08], [kiasmaRoof(t) - .2, kiasmaFront(t) - .12], [kiasmaRoof(t) + .4, 2], [kiasmaRoof(t) + .48, -.3], [kiasmaRoof(t) - .8, -4.5]]);
  for (let i = 1; i < 45; i++) {
    const t = i / 45, h = kiasmaRoof(t) - 1;
    m.box('#c1cec5', 19 * (t - .5), h / 2 + .15, kiasmaFront(t) + .03, .075, h, .085);
  }
  m.box('#536564', -3.8, 1.1, 4.93, 4.2, 2.2, .2);
  return m.finish(baked);
}

export function sanomatalo() {
  const m = createSceneryModel('Sanomatalo');
  m.box('#77999e', 0, 4.55, 0, 12, 9.1, 8);
  for (const side of [-1, 1]) {
    for (let y = .2; y < 9.1; y += 1.14) {
      m.box('#b8c8c1', 0, y, 4.06 * side, 12, .083, .09);
      m.box('#94aba7', 6.04 * side, y, 0, .1, .09, 8);
    }
    for (let x = -5.9; x < 6; x += .98) m.box('#c4ccc1', x, 4.55, side * 4.11, .09, 9.1, .12);
    for (let z = -3.9; z < 4; z += 1) m.box('#9eb3ac', side * 6.1, 4.55, z, .12, 9.1, .08);
  }
  m.box('#bfcbc3', 0, 9.17, 0, 12.35, .18, 8.35);
  return m.finish(baked);
}
