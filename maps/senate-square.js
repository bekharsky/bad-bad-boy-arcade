import * as THREE from 'three';
import { createMap } from '../world/map.js';
import { overlaps } from '../world/navigation.js';
import { createSceneryModel } from './scenery-model.js';
import { createTram } from './tram.js';
import { createCathedral, createCathedralSteps, createAlexanderMonument } from './senate-landmarks.js';

const TRAM_Z = 14.5;
const hidden = (x, z) => ({ x, z, jitter: .3 });

export const senateSquareMap = {
  id: 'senate-square',
  name: 'Senate Square',
  spawn: { x: -5.5, z: 6.8, heading: Math.PI },
  bounds: { minX: -34, maxX: 34, minZ: -19.5, maxZ: 34 },
  pickups: {
    medkit: [{ x: -8, z: -3 }, hidden(-32.3, -7), hidden(32.3, -8), hidden(-17, 31), hidden(7, 31)],
    battery: [hidden(-32.3, 5), hidden(32.3, 5), hidden(-6, 31), hidden(20, 31)],
  },
  create() { return createMap(senateSquareMap, buildSenateSquare); },
};

function buildSenateSquare(root) {
  const colliders = [], buildings = [];
  const street = createSceneryModel('Senate Square street furniture');
  let seed = 128;
  const random = () => ((seed = seed * 16807 % 2147483647) - 1) / 2147483646;
  const obstacle = (x, z, w, d, height) => colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, height });
  function addBuilding(group) {
    root.add(group);
    group.updateMatrixWorld(true);
    const meshes = [], materials = [];
    group.traverse(node => {
      if (!node.isMesh) return;
      meshes.push(node);
      materials.push(...(Array.isArray(node.material) ? node.material : [node.material]));
    });
    buildings.push({ group, meshes, materials, opacity: 1, hiddenUntil: 0, bounds: new THREE.Box3().setFromObject(group).expandByScalar(.06) });
  }
  function surface(name, w, d, x, z, color, y, map = null) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ color, map, roughness: .94 }));
    mesh.name = name;
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    root.add(mesh);
  }
  const paving = document.createElement('canvas');
  paving.width = paving.height = 256;
  const ctx = paving.getContext('2d');
  ctx.fillStyle = '#777671'; ctx.fillRect(0, 0, 256, 256);
  for (let row = 0; row < 20; row++) for (let col = -1; col < 17; col++) {
    const tone = 130 + Math.floor(random() * 36);
    ctx.fillStyle = `rgb(${tone + 7},${tone + 3},${tone - 3})`;
    ctx.fillRect(col * 16 + row % 2 * 8 + 1, row * 13 + 1, 14, 11);
  }
  const texture = new THREE.CanvasTexture(paving);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(14, 13); texture.anisotropy = 4;
  surface('Old town paving', 105, 100, 0, -5, '#c9c2ae', -.045, texture);
  const squareTexture = texture.clone(); squareTexture.repeat.set(10, 7);
  surface('Senate Square granite', 46, 29, 0, -2.5, '#c2b4a0', -.012, squareTexture);
  // Aleksanterinkatu borders the square, rather than cutting through the stalls.
  surface('Aleksanterinkatu', 88, 6.2, 0, TRAM_Z, '#515b60', .002);
  const trackTexture = texture.clone(); trackTexture.repeat.set(18, .9);
  surface('Cobbled tram reservation', 88, 2.35, 0, TRAM_Z, '#b1aa99', .012, trackTexture);
  for (const z of [11.3, 17.7]) street.box('#d9d5c7', 0, .035, z, 88, .07, .23);
  for (const z of [TRAM_Z - .66, TRAM_Z + .66]) street.box('#899592', 0, .04, z, 88, .06, .07);
  for (const x of [-21.5, 21.5]) for (let n = -3; n <= 3; n++) {
    street.box('#e5dfc9', x, .024, TRAM_Z + n * .8, 2.3, .02, .43);
  }
  for (let x = -40; x <= 40; x += 4) for (const side of [-1, 1]) {
    if (Math.abs(Math.abs(x) - 21.5) > 2) street.box('#d5cfb9', x, .024, TRAM_Z + side * 2.3, 1.8, .02, .07);
  }
  // Broad granite bands and a darker border give the open square its own shape.
  for (const x of [-22.5, 22.5]) street.box('#8d9590', x, .014, -2.5, .3, .045, 29);
  for (const z of [-16.5, 10.8]) street.box('#8d9590', 0, .014, z, 45, .045, .3);
  for (const x of [-10.2, 10.2]) street.box('#aca89c', x, .014, -2.5, .16, .045, 27);

  const steps = createCathedralSteps(); root.add(steps);
  // Keep the raised church terrace out of the ground-level combat grid.
  obstacle(0, -29.7, 29.4, 25.4, 4.05);
  obstacle(0, -35, 44, 19, 4.05);
  addBuilding(createCathedral());
  obstacle(0, -35, 22.8, 16.3, 18.9);

  function facade(name, x, z, width, depth, height, color, turn = 0, grand = false) {
    const building = createSceneryModel(name);
    const { box } = building;
    const front = depth / 2;
    box(color, 0, height / 2, 0, width, height, depth);
    box('#aaa79b', 0, .25, 0, width + .1, .5, depth + .1);
    for (const y of [.55, 2.25, height - .2]) box('#e7dfc6', 0, y, 0, width + .17, .16, depth + .17);
    box('#5a6767', 0, height + .2, 0, width + .28, .35, depth + .28);
    // Both sides have windows, so rear courtyards remain a finished part of town.
    const columns = Math.floor((width - .5) / 1.6);
    for (const side of [-1, 1]) for (let row = 0; row < 3; row++) for (let i = 0; i < columns; i++) {
      const wx = (i - (columns - 1) / 2) * 1.6, wy = 1.25 + row * 1.65;
      box('#eee4c9', wx, wy, side * (front + .035), .91, 1.26, .1);
      box('#526969', wx, wy, side * (front + .1), .65, 1.03, .04);
      box('#e2d6b8', wx, wy, side * (front + .14), .045, 1.04, .03);
      box('#e2d6b8', wx, wy, side * (front + .14), .66, .045, .03);
      box('#ddd2b5', wx, wy - .68, side * (front + .12), 1.0, .12, .25);
    }
    box('#e9dcc0', 0, 1.25, front + .17, 1.55, 2.5, .22);
    box('#314b48', 0, 1.15, front + .3, 1.15, 2.3, .1);
    if (grand) {
      for (let px = -width / 2 + .3; px < width / 2; px += 3.2) box('#e5d8b5', px, height / 2, front + .17, .2, height - .4, .26);
      for (const px of [-2.5, -1.5, 1.5, 2.5]) {
        building.geometry('#f1e6c7', new THREE.CylinderGeometry(.21, .24, 4.9, 12).translate(px, 3.1, front + .65));
      }
      box('#e9dfc1', 0, 5.65, front + .55, 6.4, .25, 1.7);
      const triangle = new THREE.Shape();
      triangle.moveTo(-3.4, 0); triangle.lineTo(3.4, 0); triangle.lineTo(0, 1.15); triangle.closePath();
      building.geometry('#e9dfc1', new THREE.ExtrudeGeometry(triangle, { depth: 1.7, bevelEnabled: false }).translate(0, 5.8, front - .3));
    } else {
      // Small shopfronts and striped fabric shades evoke the Torikorttelit blocks.
      for (const px of [-width * .28, width * .28]) {
        box('#294e4d', px, 1.05, front + .15, width * .25, 1.5, .12);
        box('#f1dfb5', px, 1.9, front + .7, width * .3, .12, 1.3);
        box('#497065', px, 1.94, front + .45, width * .3, .08, .22);
      }
      for (const px of [-width * .27, width * .27]) box('#7e6a58', px, height + .75, 0, .5, .9, .65);
    }
    const group = building.finish();
    group.position.set(x, 0, z); group.rotation.y = turn;
    addBuilding(group);
    const turned = Math.abs(Math.sin(turn)) > .5;
    obstacle(x, z, turned ? depth + .25 : width + .25, turned ? width + .25 : depth + .25, height + .5);
    if (grand) {
      // Include the projecting entrance, not just the main wall, in collisions.
      obstacle(x + Math.sin(turn) * (front + .6), z + Math.cos(turn) * (front + .6), turned ? 1.8 : 6.7, turned ? 6.7 : 1.8, height);
    }
  }
  facade('University of Helsinki', -27.5, -3, 27, 6, 6.3, '#d7c49a', Math.PI / 2, true);
  facade('Government Palace', 27.5, -3, 27, 6, 6.3, '#d6b56d', -Math.PI / 2, true);
  for (const [x, width, color] of [[-26, 8, '#cead78'], [-16, 8, '#d9bf86'], [-6, 8, '#be8b73'], [5, 9, '#c1b991'], [17, 9, '#dfc892'], [28, 8, '#c5b092']]) {
    facade(x === -6 ? 'Cafe Engel' : 'Torikorttelit merchant house', x, 25.5, width, 6, 5.5, color, Math.PI);
  }
  // Rooftops beyond the map close the skyline without enclosing the courtyard paths.
  for (const x of [-38, 38]) for (const z of [-19, 5, 29]) facade('Old Helsinki backdrop', x, z, 8, 9, 7, '#bcae91');

  const monument = createAlexanderMonument(); addBuilding(monument);
  obstacle(0, -4.5, 3.7, 3.7, 5);
  for (const x of [-2.9, 2.9]) for (const z of [-7.4, -1.6]) {
    street.box('#92998c', x, .17, z, 1.8, .34, 1.8);
    street.box('#5c714c', x, .36, z, 1.65, .15, 1.65);
    for (let n = 0; n < 9; n++) {
      street.geometry(n % 2 ? '#c8966d' : '#ba665e', new THREE.IcosahedronGeometry(.12, 0).translate(x + (n % 3 - 1) * .42, .52, z + (Math.floor(n / 3) - 1) * .42));
    }
    obstacle(x, z, 1.85, 1.85, .55);
  }
  const market = createSceneryModel('Senate Square market rows');
  const crates = ['#dfa45c', '#bc614c', '#7e9a57'];
  for (const side of [-1, 1]) for (const [index, z] of [-10, -4.5, 1, 6.5].entries()) {
    const x = side * 17, turn = -side * Math.PI / 2;
    const stall = createSceneryModel('Market stall');
    for (const px of [-1.5, 1.5]) for (const pz of [-1, 1]) stall.box('#795b40', px, 1.22, pz, .1, 2.44, .1);
    stall.box('#916845', 0, .55, .55, 3.2, 1.1, .85);
    stall.box('#b18a57', 0, 1.12, .55, 3.5, .14, 1.1);
    const canvasColor = index % 3 === 0 ? '#597866' : '#c97740';
    for (const front of [-1, 1]) for (let stripe = 0; stripe < 8; stripe++) {
      stall.geometry(stripe % 2 ? '#eee1bb' : canvasColor, new THREE.BoxGeometry(.45, .07, 1.5)
        .rotateX(front * .37).translate((stripe - 3.5) * .45, 2.65, front * .65));
      stall.box(stripe % 2 ? '#eee1bb' : canvasColor, (stripe - 3.5) * .45, 2.22, front * 1.35, .45, .23, .06);
    }
    for (let tray = -1; tray <= 1; tray++) {
      stall.box('#6d503b', tray * .95, 1.24, .55, .84, .16, .74);
      for (let n = 0; n < 6; n++) {
        stall.geometry(crates[(index + tray + 4) % 3], new THREE.IcosahedronGeometry(.13, 1)
          .translate(tray * .95 + (n % 3 - 1) * .23, 1.4, .4 + Math.floor(n / 3) * .25));
      }
    }
    stall.box('#98744e', -1.2, .28, -1.2, .65, .56, .65);
    // Bake each stall's transform into the row batches, preserving a small draw count.
    for (const mesh of stall.finish().children) {
      const geometry = mesh.geometry.clone().rotateY(turn).translate(x, 0, z);
      market.geometry(`#${mesh.material.color.getHexString()}`, geometry);
      mesh.geometry.dispose(); mesh.material.dispose();
    }
    obstacle(x, z, 2.9, 3.7, 3.1);
  }
  root.add(market.finish());

  function lamp(x, z) {
    street.geometry('#344d49', new THREE.CylinderGeometry(.055, .1, 3.3, 10).translate(x, 1.65, z));
    street.box('#344d49', x, .12, z, .35, .24, .35);
    street.box('#344d49', x, 3.3, z, .45, .09, .45);
    street.box('#e5d2a0', x, 3.55, z, .27, .4, .27);
    street.geometry('#344d49', new THREE.ConeGeometry(.38, .25, 4).rotateY(Math.PI / 4).translate(x, 3.88, z));
    obstacle(x, z, .3, .3, 4);
  }
  for (const x of [-22, 22]) for (const z of [-14, -6, 4, 19.5]) lamp(x, z);
  // Benches at the foot of the steps, with gaps into the two outer aisles.
  for (const x of [-9, 9]) {
    street.box('#826445', x, .45, -14.8, 2.5, .14, .65);
    street.box('#826445', x, .8, -15.1, 2.5, .65, .12);
    for (const dx of [-.9, .9]) street.box('#3f5049', x + dx, .2, -14.8, .09, .4, .6);
    obstacle(x, -14.8, 2.6, .8, 1.2);
  }
  // Contact wires, poles and stops belong to the street, leaving the square clear.
  street.box('#536560', 0, 4.08, TRAM_Z, 88, .025, .025);
  for (const x of [-30, -15, 0, 15, 30]) {
    street.box('#536560', x, 4.25, TRAM_Z, .025, .025, 7.8);
    for (const z of [10.6, 18.4]) {
      street.geometry('#536560', new THREE.CylinderGeometry(.06, .08, 4.5, 10).translate(x, 2.25, z));
      obstacle(x, z, .2, .2, 4.5);
    }
  }
  for (const x of [-10, 10]) {
    street.box('#47616b', x, 2.1, 18.5, .8, .65, .12);
    street.box('#e6dfbb', x, 2.1, 18.57, .36, .32, .025);
  }
  // Match the harbor's visible perimeter on every exposed edge. Solid buildings
  // and the church terrace already mark their sections of the boundary.
  const boundary = createSceneryModel('Senate Square boundary');
  const { minX, maxX, minZ, maxZ } = senateSquareMap.bounds;
  const width = maxX - minX, depth = maxZ - minZ;
  for (const x of [minX, maxX]) boundary.box('#c2c7b8', x, .025, (minZ + maxZ) / 2, .22, .05, depth);
  for (const z of [minZ, maxZ]) boundary.box('#c2c7b8', (minX + maxX) / 2, .025, z, width, .05, .22);
  function bollard(x, z) {
    if (colliders.some(collider => overlaps(collider, x, z, .18))) return;
    boundary.geometry('#697c7d', new THREE.CylinderGeometry(.085, .11, .62, 10).translate(x, .31, z));
    boundary.geometry('#d5d7bf', new THREE.CylinderGeometry(.09, .09, .065, 10).translate(x, .48, z));
    boundary.geometry('#697c7d', new THREE.SphereGeometry(.085, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2).translate(x, .62, z));
  }
  for (let x = minX; x <= maxX; x += 2) {
    bollard(x, minZ - .3);
    bollard(x, maxZ + .3);
  }
  for (let z = minZ; z <= maxZ; z += 2) {
    // The tram enters through the street portals; no posts stand on its tracks.
    if (Math.abs(z - TRAM_Z) < 3.3) continue;
    bollard(minX - .3, z);
    bollard(maxX + .3, z);
  }
  root.add(boundary.finish({ vertexColors: true }));
  root.add(street.finish());

  const tram = createTram(root, { z: TRAM_Z, display: '7  SENAATINTORI', extent: 44, initialWait: 6 });
  let tramCell = null;
  return {
    colliders, buildings,
    dynamicColliders: () => tram.root.visible ? [tram.collider] : [],
    reset() { tram.reset(); tramCell = null; },
    update(dt, actors, navigation) {
      const departed = tram.update(dt);
      if (tram.root.visible) for (const actor of actors) {
        if (actor.alive === false) continue;
        const radius = actor.radius ?? actor.size;
        if (!overlaps(tram.collider, actor.x, actor.z, radius)) continue;
        const side = actor.z >= TRAM_Z ? 1 : -1;
        for (const direction of [side, -side]) {
          const z = direction > 0 ? tram.collider.maxZ + radius + .08 : tram.collider.minZ - radius - .08;
          if (!navigation.canStandAt(actor.x, z, radius)) continue;
          actor.z = z; actor.root.position.set(actor.x, 0, z); break;
        }
      }
      const occupied = tram.root.visible ? Math.floor(tram.root.position.x) : null;
      if (occupied !== tramCell) { tramCell = occupied; navigation.refresh(); }
      return departed ? 'TRAM 7 · SENAATINTORI' : null;
    },
  };
}
