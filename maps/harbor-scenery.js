import * as THREE from 'three';
import { createSceneryModel as model } from './scenery-model.js';
import { createFerry } from './ferry.js';
export { createTram } from './tram.js';

export function createHarbor(scene) {
  // Slim dock cranes give the waterfront an industrial silhouette while
  // leaving the promenade and the gaps between the warehouses walkable.
  const cranes = model('Harbor cranes');
  for (const x of [-26, 9, 26]) {
    for (const side of [-1, 1]) cranes.box('#667c77', x + side * .65, 2.7, -26.6, .16, 5.4, .6);
    cranes.box('#506965', x, 5.2, -26.6, 1.7, .3, 1.3);
    cranes.box('#7c9790', x + 1.9, 7.3, -26.6, .18, 6.3, .18, -.62);
    cranes.box('#4c6763', x + 1.6, 6, -26.6, 5, .16, .18);
    cranes.box('#314d50', x + 3.68, 5.7, -26.6, .035, 4.4, .035);
    cranes.box('#314d50', x + 3.68, 3.5, -26.6, .3, .15, .16);
    cranes.box('#bc8b59', x - .15, 5.65, -26.6, 1.1, .85, 1);
    cranes.box('#355c65', x - .15, 5.85, -26.06, .8, .4, .04);
  }
  scene.add(cranes.finish());
  createClarionHotel(scene);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(800, 800), new THREE.MeshStandardMaterial({ color: '#376b7c', metalness: .35, roughness: .3 }));
  water.name = 'Baltic harbor water';
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, -.2, 0);
  water.receiveShadow = true;
  scene.add(water);
  const ferry = createFerry();
  ferry.position.set(0, 0, -39);
  scene.add(ferry);

  // Broken reflections and ripples stay outside the playable quay.
  const ripples = model('Harbor ripples');
  for (let n = 0; n < 220; n++) {
    const x = Math.sin(n * 8.13) * 135;
    const z = Math.cos(n * 7.37) * 135;
    if (x > -51 && x < 43 && z > -30 && z < 42) continue;
    ripples.box(n % 3 ? '#467b89' : '#65929b', x, -.185, z, 1.1 + n % 5, .012, .07);
  }
  const rippleRoot = ripples.finish();
  scene.add(rippleRoot);
  return {
    update(time) {
      ferry.position.y = Math.sin(time * .65) * .025;
      rippleRoot.position.x = Math.sin(time * .25) * .2;
    }
  };
}

// Miniature of the two aluminium-and-glass towers, linked lobby and rooftop pool.
// Architectural reference: https://dtsa.fi/project/clarion-hotel
function createClarionHotel(scene) {
  const hotel = model('Clarion Hotel Helsinki');
  const { box, geometry } = hotel;
  const silver = '#cbd2cf', dark = '#8a9d9e', glass = '#426775';
  box('#a3aaa5', 0, .12, 0, 12.6, .24, 7);
  box('#687e83', 0, .9, 0, 11.7, 1.5, 5.8);
  box(silver, 0, 1.65, 0, 12, .18, 6.1);
  // Glazed shared lobby, with slender mullions along the waterfront.
  for (let x = -5.4; x <= 5.4; x += .6) {
    box('#aebfbb', x, .95, 2.94, .055, 1.25, .08);
  }
  box('#dce1d9', 0, 1.35, 3.25, 2.4, .16, 1.2);
  box('#284a56', 0, .8, 3, 1.2, 1.2, .05);

  function tower(x, z, height, angle, floors) {
    const w = 4.1, d = 4.8, base = 1.75;
    function panel(color, px, py, pz, pw, ph, pd) {
      geometry(color, new THREE.BoxGeometry(pw, ph, pd).translate(px, py, pz).rotateY(angle).translate(x, 0, z));
    }
    panel(silver, 0, (base + height) / 2, 0, w, height - base, d);
    const storey = (height - base - .9) / floors;
    // Alternate tall windows and recessed metal panels on all four facades.
    for (let row = 0; row < floors; row++) {
      const y = base + .3 + (row + .5) * storey;
      for (const side of [-1, 1]) {
        for (let col = 0; col < 5; col++) {
          const px = (col - 2) * .76;
          panel((row + col) % 4 === 0 ? dark : glass, px, y, side * (d / 2 + .035), .46, storey * .79, .045);
          panel('#e0e3da', px + .27, y, side * (d / 2 + .065), .055, storey * .94, .06);
        }
        for (let col = 0; col < 6; col++) {
          panel((row + col) % 5 === 0 ? dark : glass, side * (w / 2 + .035), y, (col - 2.5) * .74, .045, storey * .79, .43);
        }
      }
    }
    // Dark panoramic top floor and a crisp silver roof cap.
    panel(glass, 0, height - .4, 0, w + .08, .64, d + .08);
    for (const side of [-1, 1]) {
      for (let col = -2; col <= 2; col++) panel(silver, col * .78, height - .4, side * (d / 2 + .07), .055, .66, .06);
    }
    panel('#e4e5db', 0, height + .02, 0, w + .24, .18, d + .24);
    return panel;
  }
  const tall = tower(-2.8, -.4, 12, 0, 14);
  tower(2.8, .55, 10.55, .2, 12);
  // Glass connection between the separated towers.
  box('#4b707c', 0, 4.9, .2, 1.8, 1.1, 1.5);
  for (const y of [4.32, 5.48]) box(silver, 0, y, .2, 1.9, .12, 1.65);
  for (const x of [-.6, 0, .6]) box(silver, x, 4.9, 1, .055, 1.1, .06);
  // Cantilevered rooftop pool with a blue glazed end above the harbour.
  tall('#dbe1d9', 0, 12.2, 1.35, 2.9, .26, 3.4);
  tall('#358c9d', 0, 12.36, 1.35, 2.5, .08, 3.05);
  tall('#78b7be', 0, 12.48, 3.08, 2.7, .55, .07);
  for (const x of [-1.42, 1.42]) tall('#aec8c9', x, 12.48, 1.35, .06, .55, 3.45);
  const root = hotel.finish();
  root.position.set(-36, 0, -18);
  scene.add(root);
}
