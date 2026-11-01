import * as THREE from 'three';
import { createSceneryModel as model } from './scenery-model.js';

// West-to-east route coordinates are compressed for play. North is the left
// side (-1); the opposite Pohjola / Lundqvist pair shares one street block.
export const ALEKSI_LANDMARKS = Object.freeze([
  Object.freeze({ id: 'stockmann', name: 'Stockmann department store', address: 'Aleksanterinkatu 52', side: 1, from: -20, to: 120 }),
  Object.freeze({ id: 'pohjola', name: 'Pohjola Insurance building', address: 'Aleksanterinkatu 44', side: 1, from: 300, to: 352 }),
  Object.freeze({ id: 'lundqvist', name: 'Lundqvist / Aleksi 13', address: 'Aleksanterinkatu 13', side: -1, from: 300, to: 352 }),
  Object.freeze({ id: 'university', name: 'University of Helsinki Main Building', address: 'Unioninkatu 34', side: -1, from: 440, to: 540 }),
  Object.freeze({ id: 'sederholm', name: 'Sederholm House', address: 'Aleksanterinkatu 18', side: 1, from: 600, to: 640 }),
]);
export const WATERFRONT_OPENING = Object.freeze({ side: -1, from: 580, to: 680 });
export const QUAY_OPENING = Object.freeze({ side: 1, from: 640, to: 680 });

// Reserve each real frontage before subdividing the remaining generic facades.
// The last block opens onto the arcade waterfront and a broad finishing quay.
export function remainingFacadeSpans(side, from, to) {
  let spans = [[from, to]];
  for (const block of [...ALEKSI_LANDMARKS, WATERFRONT_OPENING, QUAY_OPENING]) {
    if (block.side !== side) continue;
    const next = [];
    for (const [a, b] of spans) {
      if (block.to <= a || block.from >= b) next.push([a, b]);
      else {
        if (a < block.from) next.push([a, block.from]);
        if (b > block.to) next.push([block.to, b]);
      }
    }
    spans = next;
  }
  return spans;
}

const GLASS = '#3d5960';
function window(m, u, y, w, h, frame = '#c8bba1', x = 8.08) {
  m.box(frame, x, y, u, .25, h + .22, w + .22);
  m.box(GLASS, x - .15, y, u, .045, h, w);
  m.box(frame, x - .19, y, u, .035, h, .055);
  m.box(frame, x - .19, y + h * .13, u, .035, .055, w);
}
function returnWindows(m, depth, rows, frame) {
  for (const end of [-1, 1]) for (const [y, h] of rows) for (let col = 0; col < 5; col++) {
    const x = 9.5 + col * 2.4, z = end * depth / 2;
    m.box(frame, x, y, z, 1.85, h + .2, .2);
    m.box(GLASS, x, y, z + end * .13, 1.4, h, .045);
    m.box(frame, x, y, z + end * .17, .055, h, .03);
  }
}
function archShape(w, h) {
  const shape = new THREE.Shape(), r = w / 2;
  shape.moveTo(-r, 0); shape.lineTo(r, 0); shape.lineTo(r, h - r);
  shape.absarc(0, h - r, r, 0, Math.PI, false); shape.closePath();
  return shape;
}
function arch(m, u, bottom, w, h, frame, x = 7.98, glass = GLASS) {
  for (const [color, inset, face] of [[frame, 0, x], [glass, .18, x - .12]]) {
    const geometry = new THREE.ExtrudeGeometry(archShape(w - inset * 2, h - inset * 2), { depth: .09, bevelEnabled: false, curveSegments: 8 });
    m.geometry(color, geometry.rotateY(-Math.PI / 2).translate(face, bottom + inset, u));
  }
}
function band(m, color, y, depth, width = 12.6, thickness = .18) {
  m.box(color, 14.3, y, 0, width, thickness, depth + .3);
}
function roof(m, color, h, rise, depth, mansard = false) {
  const shape = new THREE.Shape();
  shape.moveTo(8.02, h);
  if (mansard) { shape.lineTo(10.2, h + rise); shape.lineTo(18.4, h + rise); }
  else shape.lineTo(14.3, h + rise);
  shape.lineTo(20.58, h); shape.closePath();
  m.geometry(color, new THREE.ExtrudeGeometry(shape, { depth: depth + .5, bevelEnabled: false }).translate(0, 0, -depth / 2 - .25));
}
function pediment(m, color, u, bottom, w, h, x = 7.8) {
  const shape = new THREE.Shape(); shape.moveTo(-w / 2, 0); shape.lineTo(w / 2, 0); shape.lineTo(0, h); shape.closePath();
  m.geometry(color, new THREE.ExtrudeGeometry(shape, { depth: .18, bevelEnabled: false }).rotateY(-Math.PI / 2).translate(x, bottom, u));
}
function sphere(m, color, x, y, z, radius, scale = [1, 1, 1]) {
  m.geometry(color, new THREE.SphereGeometry(radius, 8, 6).scale(...scale).translate(x, y, z));
}
function stockmann({ to, from }) {
  const depth = to - from, m = model('Stockmann department store');
  const brick = '#865d4b', bronze = '#a49270', roofColor = '#6b746c';
  m.box(brick, 14.3, 9.5, 0, 12, 19, depth - .2);
  m.box('#a89579', 14.3, 1.45, 0, 12.3, 2.9, depth);
  const columns = Math.floor(depth / 3.3), step = (depth - 3) / columns;
  for (let i = 0; i < columns; i++) {
    const u = (i - (columns - 1) / 2) * step;
    window(m, u, 1.45, 2.65, 2.45, '#766c55');
    // Long vertical bays are the defining Frosterus facade rhythm.
    m.box(bronze, 8.12, 8.4, u, .26, 10.4, 1.85);
    m.box('#466168', 7.95, 8.4, u, .045, 10.05, 1.4);
    for (const y of [5.2, 8.5, 11.8]) m.box(bronze, 7.91, y, u, .035, .075, 1.4);
    m.box('#a5785d', 8.04, 8.7, u + step / 2, .45, 11.5, .32);
    window(m, u, 16.55, 1.35, 1.65, '#9b8265');
    for (const dz of [-.95, 0, .95]) {
      m.box('#d3c7a9', 8.02, 14.8, u + dz, .12, .64, .43);
      m.box('#455a5f', 7.94, 18.3, u + dz, .055, .47, .37);
    }
  }
  for (const y of [3, 14.05, 15.3, 17.7, 19]) band(m, y === 15.3 ? '#6f8877' : '#a07b60', y, depth);
  returnWindows(m, depth, [[1.45, 2.45], [8.4, 10.05], [16.55, 1.65]], bronze);
  roof(m, roofColor, 19.1, 2.5, depth);
  for (let u = -depth / 2 + 6; u < depth / 2; u += 9) {
    m.box('#7b806f', 10.5, 19.75, u, 4.1, 1.2, 2.3);
    window(m, u, 19.7, 1.5, .9, bronze, 8.35);
  }
  const entrance = depth / 2 - 28;
  m.box('#586c59', 7.25, 3.25, entrance, 2.6, .28, 14);
  m.box('#c4b99c', 6.38, 3.2, entrance - 5, .09, .65, .75);
  // The projecting cube clock beneath the entrance canopy.
  m.box('#323b36', 6.18, 2.9, entrance - 5, .48, .62, .62);
  m.box('#e9dfbe', 5.925, 2.9, entrance - 5, .02, .045, .4);
  m.box('#e9dfbe', 5.91, 3.03, entrance - 5, .025, .3, .04);
  return m.finish({ vertexColors: true });
}

function pohjola({ to, from, side }) {
  const depth = to - from, m = model('Pohjola Insurance building');
  const stone = '#96988b', pale = '#b6b7a8', copper = '#6b9d89';
  m.box(stone, 14.3, 7, 0, 12, 14, depth - .2);
  // Rough stone at the lower levels, smoother soapstone above the cornice.
  for (let row = 0; row < 20; row++) for (let col = 0; col < Math.ceil(depth / 1.4); col++) {
    const u = -depth / 2 + .7 + col * 1.4 + (row % 2 ? .35 : 0);
    if (u > depth / 2 - .2) continue;
    const shade = ['#96988b', '#a5a699', '#8b9187', '#b1b0a1'][(row * 7 + col * 3) % 4];
    m.box(shade, 8.17 - (row + col) % 3 * .025, .25 + row * .5, u, .3, .43, 1.3);
  }
  const columns = Math.floor(depth / 3), step = (depth - 4) / columns;
  for (let i = 0; i < columns; i++) {
    const u = (i - (columns - 1) / 2) * step;
    arch(m, u, .3, 2.2, 2.65, pale);
    for (const y of [4.25, 7.4, 11.7]) window(m, u, y, 1.2, y > 10 ? 2.7 : 2.25, pale, 7.96);
    // Stylised carved animal masks, rather than generic classical pediments.
    sphere(m, '#a7ab9c', 7.65, 8.9, u, .23, [.65, 1.1, 1]);
    for (const dz of [-.15, .15]) sphere(m, '#8c9487', 7.5, 9.1, u + dz, .09);
    m.box('#6b8a79', 7.87, 10.05, u, .18, .1, 2.1);
  }
  for (const y of [3, 5.7, 9.7, 13.65, 14.15]) band(m, pale, y, depth);
  returnWindows(m, depth, [[1.4, 2.4], [4.25, 2.25], [7.4, 2.25], [11.7, 2.7]], pale);
  for (let u = -depth / 2 + 1; u < depth / 2; u += 2) {
    m.box(stone, 8.0, 14.45, u, .32, .6, .55);
    sphere(m, pale, 8, 14.82, u, .17);
  }
  const portal = -depth * .12;
  arch(m, portal, .05, 3.6, 3.25, '#c0bdac', 7.7, '#293c36');
  for (const dz of [-2.2, 2.2]) {
    m.box(pale, 7.52, 1.95, portal + dz, .65, 3.9, .52);
    for (const y of [2.9, 3.5]) sphere(m, '#9da495', 7.13, y, portal + dz, .22, [.6, 1, 1]);
    m.box('#425e51', 7.02, 2.65, portal + dz, .42, .44, .44);
  }
  // Chamfered corner bay with an unmistakable high, patinated copper helmet.
  const u = side * (depth / 2 - 2.4);
  m.box(stone, 10.05, 8, u, 4, 16, 4);
  for (const y of [4.2, 7.4, 11.8, 15]) window(m, u, y, 1.75, 2.3, pale, 7.85);
  for (const z of [u - 1.8, u + 1.8]) m.geometry(pale, new THREE.CylinderGeometry(.24, .36, 16.1, 8).translate(8, 8, z));
  m.geometry(copper, new THREE.CylinderGeometry(1.05, 3.25, 2.8, 4).rotateY(Math.PI / 4).translate(10, 17.4, u));
  m.geometry('#76a791', new THREE.ConeGeometry(1.5, 3.2, 4).rotateY(Math.PI / 4).translate(10, 20.3, u));
  m.box('#4c7a68', 10, 22.3, u, .06, .95, .06);
  return m.finish({ vertexColors: true });
}

function lundqvist({ to, from, side }) {
  const depth = to - from, m = model('Lundqvist / Aleksi 13');
  const brick = '#a6533c', stone = '#b5aa8e', dark = '#36454b';
  m.box(brick, 14.3, 7.2, 0, 12, 14.4, depth - .2);
  m.box(stone, 14.3, 1.35, 0, 12.2, 2.7, depth);
  const columns = Math.floor(depth / 4), step = (depth - 3) / columns;
  for (let i = 0; i < columns; i++) {
    const u = (i - (columns - 1) / 2) * step;
    // Large glass openings and slender red piers contrast with Pohjola.
    for (const y of [1.45, 4.5]) window(m, u, y, step - .5, 2.5, dark);
    arch(m, u, 6.2, step - .55, 4.1, '#c07959', 8);
    m.box('#a39473', 7.86, 8, u, .04, 3.1, .065);
    m.box('#c48863', 7.93, 7.6, u, .05, .09, step - .8);
    window(m, u, 11.6, step - .6, 1.4, '#934a38');
    for (const dz of [-step / 2 + .2, step / 2 - .2]) {
      m.box('#bf7050', 8.02, 8.3, u + dz, .55, 11.1, .32);
      m.geometry('#bd7657', new THREE.ConeGeometry(.32, 1.1, 4).rotateY(Math.PI / 4).translate(8, 14.8, u + dz));
    }
  }
  for (const y of [2.85, 5.95, 10.4, 12.75, 14.2]) band(m, y < 6 ? dark : '#c47b5a', y, depth);
  returnWindows(m, depth, [[1.45, 2.5], [4.5, 2.5], [8.2, 3.7], [11.6, 1.4]], '#b86549');
  roof(m, '#606d6a', 14.5, 3, depth);
  for (let u = -depth / 2 + 5; u < depth / 2 - 2; u += 8) {
    pediment(m, brick, u, 14.1, 3.2, 3.2, 8);
    window(m, u, 15.15, 1.05, 1.5, stone, 7.88);
  }
  const u = side * (depth / 2 - 2.5);
  m.box(brick, 10.1, 9.5, u, 4, 19, 4);
  window(m, u, 15.2, 1.7, 3.2, stone, 7.8);
  m.geometry('#637976', new THREE.ConeGeometry(3.2, 4, 4).rotateY(Math.PI / 4).translate(10.1, 20.2, u));
  m.geometry('#617f71', new THREE.CylinderGeometry(.65, .8, 1.2, 8).translate(10.1, 22.7, u));
  m.geometry('#567366', new THREE.ConeGeometry(1, 1.5, 8).translate(10.1, 24, u));
  m.box('#708476', 10.1, 25.3, u, .045, 1.3, .045);
  return m.finish({ vertexColors: true });
}

function university({ to, from }) {
  const depth = to - from, m = model('University of Helsinki Main Building');
  const yellow = '#d8bf83', white = '#ede4cf';
  m.box(yellow, 14.3, 6.45, 0, 12, 12.9, depth - .2);
  m.box('#bcb29d', 14.3, 1.2, 0, 12.2, 2.4, depth);
  for (const y of [2.5, 6.8, 11.5, 12.9]) band(m, white, y, depth);
  returnWindows(m, depth, [[1.25, 1.5], [4.5, 2.25], [8.8, 2.4]], white);
  const columns = Math.floor(depth / 3.1);
  for (let i = 0; i < columns; i++) {
    const u = (i - (columns - 1) / 2) * (depth - 3) / columns;
    for (const [y, h] of [[1.25, 1.5], [4.5, 2.25], [8.8, 2.4]]) window(m, u, y, 1.3, h, white);
  }
  roof(m, '#6a7167', 13, 1.8, depth);
  // The main six-column front turns toward Senate Square at the east end.
  m.box(white, 14.3, .45, depth / 2 + 1, 14, .9, 3.2);
  for (let i = 0; i < 6; i++) {
    const x = 9.2 + i * 2.04;
    m.geometry(white, new THREE.CylinderGeometry(.3, .36, 8.6, 12).translate(x, 5.2, depth / 2 + 2));
    for (const y of [1, 9.6]) m.box(white, x, y, depth / 2 + 2, .85, .3, .85);
  }
  m.box(white, 14.3, 10, depth / 2 + 1.2, 14, .6, 3.4);
  const shape = new THREE.Shape(); shape.moveTo(-7, 0); shape.lineTo(7, 0); shape.lineTo(0, 2.3); shape.closePath();
  m.geometry(white, new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false }).translate(14.3, 10.3, depth / 2 + 1.5));
  return m.finish({ vertexColors: true });
}

function sederholm({ to, from }) {
  const depth = to - from, m = model('Sederholm House');
  const blue = '#b4c0c3', white = '#eee9d9', roofColor = '#50585a';
  m.box(blue, 14.3, 3.8, 0, 12, 7.6, depth - .2);
  m.box('#a7aaa0', 14.3, .35, 0, 12.2, .7, depth);
  for (const y of [.75, 3.6, 7.25, 7.6]) band(m, white, y, depth);
  returnWindows(m, depth, [[2, 2.05], [5.5, 2.05]], white);
  const columns = 9, step = (depth - 3) / columns;
  for (let i = 0; i < columns; i++) {
    const u = (i - (columns - 1) / 2) * step;
    for (const y of [2, 5.5]) window(m, u, y, 1.5, 2.05, white);
    m.box(white, 7.57, 4.65, u, 1, .18, 2.1);
    m.box(white, 7.08, 4.98, u, .06, .08, 2);
    for (let dz = -.9; dz <= .91; dz += .3) m.box(white, 7.08, 4.87, u + dz, .045, .5, .045);
    if (i % 2 === 0) m.box(white, 8.02, 3.8, u + step * .43, .35, 6.7, .28);
  }
  roof(m, roofColor, 7.65, 2.5, depth, true);
  for (let u = -depth / 2 + 6; u < depth / 2; u += 8) {
    m.box(blue, 9.25, 8.6, u, 2.2, 1.4, 1.3);
    m.geometry(roofColor, new THREE.SphereGeometry(.8, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.5, 1, 1).translate(9.2, 9.3, u));
    window(m, u, 8.6, .75, 1.05, white, 8.08);
  }
  pediment(m, white, 0, 7.45, 9, 2.1, 7.82);
  pediment(m, blue, 0, 7.62, 7.2, 1.45, 7.6);
  sphere(m, '#b4a25c', 7.34, 8.24, 0, .29, [.15, 1, .8]);
  for (const u of [-depth / 2 + .65, depth / 2 - .65]) m.box(white, 7.95, 3.9, u, .55, 7.5, .65);
  return m.finish({ vertexColors: true });
}

const builders = { stockmann, pohjola, lundqvist, university, sederholm };
export function createAleksiLandmarks() {
  return ALEKSI_LANDMARKS.map(definition => {
    const root = builders[definition.id](definition);
    root.rotation.y = definition.side < 0 ? Math.PI : 0;
    root.position.z = -(definition.from + definition.to) / 2;
    Object.assign(root.userData, { landmarkId: definition.id, side: definition.side, routeFrom: definition.from, routeTo: definition.to, address: definition.address });
    return root;
  });
}
