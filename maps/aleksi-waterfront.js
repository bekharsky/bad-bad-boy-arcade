import * as THREE from 'three';
import { createSceneryModel as model } from './scenery-model.js';
import { createFerry } from './ferry.js';
import { createTramTurn } from '../runner/tram-route.js';
import { TRAM_LANES } from '../runner/course.js';

export const ALEKSI_SHORE = 664;
export const ALEKSI_TRAM_TURN = Object.freeze({ start: 644, radius: 12 });
export const aleksiTramRoute = createTramTurn(ALEKSI_TRAM_TURN);

function wire(m, from, to, radius = .018) {
  const a = new THREE.Vector3(...from), delta = new THREE.Vector3(...to).sub(a);
  const geometry = new THREE.CylinderGeometry(radius, radius, delta.length(), 6);
  geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.clone().normalize()));
  m.geometry('#4c6159', geometry.translate(...a.addScaledVector(delta, .5).toArray()));
}

function createTramBend() {
  const m = model('Aleksi waterfront tram bend'), { start, radius } = ALEKSI_TRAM_TURN;
  for (const lane of TRAM_LANES) {
    for (const offset of [-.76, .76]) for (const [color, width, y] of [['#47524f', .18, .0425], ['#b0bab5', .065, .0605]]) {
      const r = radius + lane + offset, shape = new THREE.Shape();
      shape.moveTo(-radius + r + width / 2, start);
      shape.absarc(-radius, start, r + width / 2, 0, Math.PI / 2, false);
      shape.lineTo(-radius, start + r - width / 2);
      shape.absarc(-radius, start, r - width / 2, Math.PI / 2, 0, true); shape.closePath();
      m.geometry(color, new THREE.ExtrudeGeometry(shape, { depth: .025, bevelEnabled: false, curveSegments: 40 }).rotateX(-Math.PI / 2).translate(0, y, 0));
      m.box(color, (-220 - radius) / 2, y + .0125, -start - r, 220 - radius, .025, width);
    }
    const r = radius + lane;
    for (let n = 0; n < 40; n++) {
      const a = aleksiTramRoute(start + r * Math.PI / 2 * n / 40, lane), b = aleksiTramRoute(start + r * Math.PI / 2 * (n + 1) / 40, lane);
      wire(m, [a.x, 5.12, a.z], [b.x, 5.12, b.z]);
    }
    wire(m, [-radius, 5.12, -start - r], [-220, 5.12, -start - r]);
  }
  for (let x = -24; x >= -220; x -= 28) {
    for (const z of [-649.5, -661.5]) wire(m, [x, 0, z], [x, 6.8, z], .065);
    wire(m, [x, 6.65, -649.5], [x, 6.65, -661.5], .025);
    for (const lane of TRAM_LANES) wire(m, [x, 6.65, -start - radius - lane], [x, 5.12, -start - radius - lane]);
  }
  return m.finish({ vertexColors: true });
}

// A deliberately compressed arcade ending: the street arrives at a real edge,
// with a lit quay, rails turning along the shore and a ferry beyond it.
export function createAleksiWaterfront() {
  const root = new THREE.Group(); root.name = 'Aleksi waterfront';
  const quay = model('Aleksi finishing quay');
  quay.box('#b9b3a1', -42, -.02, -611, 68, .08, 62);
  quay.box('#bcb7a5', -100, -.025, -653, 340, .13, 22);
  quay.box('#8b9289', -100, -.45, -664.3, 340, 1.1, .6);
  quay.box('#e3dcc4', -100, .15, -663.8, 340, .18, .55);
  for (let z = 583; z < 642; z += 4) quay.box('#9ea18f', -42, .025, -z, 68, .018, .045);
  for (let z = 645; z < 664; z += 3) quay.box('#a8a795', -100, .046, -z, 340, .012, .045);
  for (const x of [-62, -52, -42, -32, -22, -12, 12, 22, 32, 42, 52, 62]) {
    quay.box('#3b5152', x, .5, -662, .3, 1, .3);
    quay.box('#bca96f', x, 1.02, -662, .38, .12, .38);
  }
  for (const side of [-1, 1]) {
    quay.box('#536660', side * 37, .88, -662, 50, .065, .065);
    for (const x of [15, 45]) {
      quay.box('#495e5a', side * x, 2.2, -661, .15, 4.4, .15);
      quay.box('#e6dcb5', side * x, 4.45, -661, .75, .4, .75);
      quay.box('#526e60', side * x, 4.76, -661, .95, .2, .95);
    }
    quay.box('#8a7251', side * 10, .7, -650, 3.4, .2, .9);
    quay.box('#8a7251', side * 10, 1.1, -650.45, 3.4, .75, .12);
  }
  // A small glazed terminal and a pair of market awnings frame the water view.
  quay.box('#5b7276', -43, 2.1, -633, 13, 4.2, 8);
  quay.box('#d5d7c8', -43, 4.35, -633, 14.4, .3, 9.4);
  quay.box('#7e9da1', -43, 2.3, -628.95, 12.6, 3.4, .06);
  for (let x = -49; x <= -37; x += 2) quay.box('#d0cec0', x, 2.3, -628.88, .08, 3.5, .09);
  for (const x of [20, 29]) {
    quay.box('#b18a52', x, .8, -649, 5.5, 1.6, 3.2);
    quay.box('#d5a557', x, 3.1, -649, 6.3, .25, 4);
    for (const dx of [-2.6, 2.6]) quay.box('#675c46', x + dx, 2, -649, .1, 2.1, .1);
  }
  root.add(quay.finish({ vertexColors: true }), createTramBend());
  const water = new THREE.Mesh(new THREE.PlaneGeometry(1800, 1400), new THREE.MeshStandardMaterial({ color: '#376f80', roughness: .35, metalness: .25 }));
  water.name = 'Aleksi Baltic water'; water.rotation.x = -Math.PI / 2;
  water.position.set(0, -.38, -ALEKSI_SHORE - 700); root.add(water);
  const ripples = model('Aleksi sea reflections');
  for (let i = 0; i < 130; i++) {
    const x = Math.sin(i * 7.13) * 180, z = -672 - (i * 13.7 % 170);
    ripples.box(i % 3 ? '#4b8290' : '#6594a0', x, -.365, z, 1.5 + i % 6, .012, .08);
  }
  root.add(ripples.finish({ vertexColors: true }));
  const ferry = createFerry(); ferry.name = 'Aleksi finishing ferry';
  ferry.scale.setScalar(1.7); ferry.position.set(-1, -.2, -704); root.add(ferry);
  return { root, update(time) { ferry.position.y = -.2 + Math.sin(time * .65) * .045; } };
}
