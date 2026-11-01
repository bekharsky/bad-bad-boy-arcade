import * as THREE from 'three';
import { createSceneryModel as model } from './scenery-model.js';
import { createFerry } from './ferry.js';

export const ALEKSI_SHORE = 664;

// A deliberately compressed arcade ending: the street arrives at a real edge,
// with a lit quay, stopped rails and a ferry beyond it instead of empty fog.
export function createAleksiWaterfront() {
  const root = new THREE.Group(); root.name = 'Aleksi waterfront';
  const quay = model('Aleksi finishing quay');
  quay.box('#b9b3a1', -42, -.02, -611, 68, .08, 62);
  quay.box('#bcb7a5', 0, .015, -653, 140, .13, 22);
  quay.box('#8b9289', 0, -.45, -664.3, 140, 1.1, .6);
  quay.box('#e3dcc4', 0, .15, -663.8, 140, .18, .55);
  for (let z = 583; z < 642; z += 4) quay.box('#9ea18f', -42, .025, -z, 68, .018, .045);
  for (let z = 645; z < 664; z += 3) quay.box('#a8a795', 0, .086, -z, 140, .012, .045);
  for (const x of [-62, -52, -42, -32, -22, -12, 12, 22, 32, 42, 52, 62]) {
    quay.box('#3b5152', x, .5, -662, .3, 1, .3);
    quay.box('#bca96f', x, 1.02, -662, .38, .12, .38);
  }
  for (const side of [-1, 1]) {
    quay.box('#536660', side * 37, .88, -662, 50, .065, .065);
    for (const x of [15, 45]) {
      quay.box('#495e5a', side * x, 2.2, -658, .15, 4.4, .15);
      quay.box('#e6dcb5', side * x, 4.45, -658, .75, .4, .75);
      quay.box('#526e60', side * x, 4.76, -658, .95, .2, .95);
    }
    quay.box('#8a7251', side * 10, .7, -650, 3.4, .2, .9);
    quay.box('#8a7251', side * 10, 1.1, -650.45, 3.4, .75, .12);
    // Low buffers at the rail ends, safely beyond the finish line.
    quay.box('#3d5051', side * 2.2, .4, -654, 1.8, .8, .35);
    for (const offset of [-.55, .55]) quay.box('#e4b05b', side * 2.2 + offset, .6, -653.8, .4, .3, .06);
  }
  // A small glazed terminal and a pair of market awnings frame the water view.
  quay.box('#5b7276', -25, 2.1, -650, 13, 4.2, 8);
  quay.box('#d5d7c8', -25, 4.35, -650, 14.4, .3, 9.4);
  quay.box('#7e9da1', -25, 2.3, -645.95, 12.6, 3.4, .06);
  for (let x = -31; x <= -19; x += 2) quay.box('#d0cec0', x, 2.3, -645.88, .08, 3.5, .09);
  for (const x of [20, 29]) {
    quay.box('#b18a52', x, .8, -649, 5.5, 1.6, 3.2);
    quay.box('#d5a557', x, 3.1, -649, 6.3, .25, 4);
    for (const dx of [-2.6, 2.6]) quay.box('#675c46', x + dx, 2, -649, .1, 2.1, .1);
  }
  root.add(quay.finish({ vertexColors: true }));
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
