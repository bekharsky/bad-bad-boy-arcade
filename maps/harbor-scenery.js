import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Merge small details by colour: the vehicles need only a few draw calls.
function model(name) {
  const group = new THREE.Group();
  group.name = name;
  const batches = new Map();
  function geometry(color, piece) {
    // Extruded silhouettes and indexed primitives can share a colour batch.
    if (!piece.index) piece.setIndex(Array.from({ length: piece.attributes.position.count }, (_, i) => i));
    if (!batches.has(color)) batches.set(color, []);
    batches.get(color).push(piece);
  }
  function box(color, x, y, z, w, h, d, rotation = 0) {
    geometry(color, new THREE.BoxGeometry(w, h, d).rotateZ(rotation).translate(x, y, z));
  }
  function finish() {
    for (const [color, pieces] of batches) {
      const merged = mergeGeometries(pieces);
      const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ color, roughness: .65 }));
      mesh.castShadow = mesh.receiveShadow = true;
      group.add(mesh);
      for (const piece of pieces) piece.dispose();
    }
    return group;
  }
  return { group, box, geometry, finish };
}

function destination(text, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#122a29'; ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = '#ffdf81'; ctx.font = 'bold 64px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 256, 68, 480);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshStandardMaterial({ map: texture, emissiveMap: texture, emissive: '#ffffff', emissiveIntensity: .3 }));
}

export function createTram(scene, { z: routeZ = 0 } = {}) {
  const tram = model('Helsinki tram');
  const { box } = tram;
  const green = '#26734a', yellow = '#edc74f', glass = '#294b50';
  for (const z of [-2.45, 2.45]) {
    box(green, 0, 1.04, z, 1.8, 1.36, 4.45);
    box(yellow, 0, 1.65, z, 1.84, .23, 4.46);
    box('#ddd9ba', 0, 2.69, z, 1.85, .18, 4.5);
    box(yellow, 0, 2.15, z, 1.78, .88, 4.43);
    for (const side of [-1, 1]) {
      for (let n = -1; n <= 1; n++) box(glass, side * .906, 2.16, z + n * 1.25, .025, .69, .98);
      box('#183a32', side * .91, .83, z, .025, .055, 4.2);
      for (const wheel of [-1.5, 1.5]) box('#283238', side * .72, .35, z + wheel, .26, .54, .65);
      // Door frames at each end of the articulated car.
      box('#d4c98a', side * .925, 1.43, z + 1.75, .04, 2.1, .06);
    }
  }
  box('#4b5149', 0, 1.62, 0, 1.65, 2.1, .5);
  for (const z of [-.18, 0, .18]) box('#242f2b', 0, 1.62, z, 1.71, 2.12, .045);
  for (const end of [-1, 1]) {
    box(glass, 0, 2.12, end * 4.69, 1.48, .7, .035);
    box(yellow, 0, .77, end * 4.71, 1.8, .12, .05);
    for (const x of [-.62, .62]) box('#fff0bc', x, 1.05, end * 4.72, .2, .2, .04);
    const display = destination('9  JÄTKÄSAARI', 1.45, .25);
    display.position.set(0, 2.56, end * 4.73);
    display.rotation.y = end < 0 ? Math.PI : 0;
    tram.group.add(display);
  }
  // Diamond pantograph and its contact shoe.
  for (const side of [-1, 1]) {
    box('#38443f', side * .28, 3.05, -1.3, .06, .85, .06, side * -.75);
    box('#38443f', side * .28, 3.64, -1.3, .06, .85, .06, side * .75);
  }
  box('#38443f', 0, 3.94, -1.3, 1.25, .07, .12);
  const root = tram.finish();
  root.rotation.y = Math.PI / 2;
  scene.add(root);
  let wait = 8, direction = 1;
  const collider = { minX: 0, maxX: 0, minZ: routeZ - .94, maxZ: routeZ + .94, height: 2.8 };

  function reset() {
    wait = 8; direction = 1;
    root.position.set(-37, 0, routeZ);
    root.visible = false;
  }
  function update(dt) {
    let departed = false;
    if (!root.visible) {
      wait -= dt;
      if (wait > 0) return false;
      root.visible = true;
      root.position.x = -direction * 37;
      departed = true;
    }
    root.position.x += direction * 5.2 * dt;
    if (Math.abs(root.position.x) > 37) {
      root.visible = false;
      direction *= -1;
      wait = 22 + Math.random() * 12;
    }
    collider.minX = root.position.x - 4.75;
    collider.maxX = root.position.x + 4.75;
    return departed;
  }
  reset();
  return { root, collider, update, reset };
}

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
  const water = new THREE.Mesh(new THREE.PlaneGeometry(140, 58), new THREE.MeshStandardMaterial({ color: '#376b7c', metalness: .35, roughness: .3 }));
  water.name = 'Baltic harbor water';
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, -.2, -58);
  water.receiveShadow = true;
  scene.add(water);
  const boat = model('Cruise ferry');
  const { box } = boat;
  // Tapered bow and stern, extruded vertically from the waterline.
  const outline = new THREE.Shape();
  outline.moveTo(-14, -1.7); outline.lineTo(-11.5, -3.1);
  outline.lineTo(10.5, -3.1); outline.quadraticCurveTo(15, -1.5, 16, 0);
  outline.quadraticCurveTo(15, 1.5, 10.5, 3.1); outline.lineTo(-11.5, 3.1);
  outline.lineTo(-14, 1.7); outline.closePath();
  const hull = new THREE.ExtrudeGeometry(outline, { depth: 1.8, bevelEnabled: false, curveSegments: 5 });
  hull.rotateX(-Math.PI / 2).translate(0, -.25, 0);
  boat.geometry('#243e59', hull);
  box('#b75748', 0, .09, 0, 24, .24, 6.2);
  box('#e7e6d9', -1, 2.05, 0, 24, 1.15, 6);
  box('#f6f1df', -1.8, 3.7, 0, 21.5, 2.25, 5.4);
  box('#d3d8d0', -2.5, 5.03, 0, 18.8, .4, 5);
  box('#f4f1df', 5.8, 5.5, 0, 4, .65, 5.7);
  for (const side of [-1, 1]) {
    for (const y of [2.05, 3.12, 4.12]) {
      for (let x = -11; x <= 8.5; x += .95) box('#315367', x, y, side * (y < 2.5 ? 3.02 : 2.72), .57, .37, .04);
    }
    box('#36596a', 5.8, 5.5, side * 2.87, 3.7, .4, .04);
    // Orange lifeboats and white davits below the promenade deck.
    for (const x of [-8, -4, 0]) {
      box('#d2d8cf', x, 4.75, side * 3, 2.5, .12, .7);
      box('#e28d35', x, 4.37, side * 3, 2.2, .48, .65);
      box('#f3e6c9', x, 4.65, side * 3, 1.3, .25, .48);
    }
    box('#eeeee1', -2, 5.43, side * 2.42, 17.5, .07, .06);
    for (let x = -10; x <= 6; x += 1.4) box('#eeeee1', x, 5.27, side * 2.42, .05, .35, .05);
  }
  for (const x of [-6, -3.3]) {
    box('#bf5342', x, 6, 0, 1.6, 1.7, 1.75);
    box('#293d43', x, 6.74, 0, 1.7, .33, 1.85);
  }
  box('#f4edda', 7.1, 6.55, 0, .09, 1.6, .09);
  box('#dce7df', 7.1, 7.3, 0, 1.8, .08, .09);
  box('#628ba2', 7.1, 6.9, 0, .5, .3, .5);
  const name = destination('HELSINKI  CRUISE', 7, .65);
  name.position.set(-3, 1.1, 3.12);
  boat.group.add(name);
  const ferry = boat.finish();
  ferry.position.set(0, 0, -39);
  scene.add(ferry);

  // Broken reflections and ripples stay outside the playable quay.
  const ripples = model('Harbor ripples');
  for (let n = 0; n < 75; n++) {
    const x = Math.sin(n * 8.13) * 55;
    const z = -31 - (n * 7.37 % 40);
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
