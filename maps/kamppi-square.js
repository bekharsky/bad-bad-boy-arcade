import * as THREE from 'three';
import { createMap } from '../world/map.js';
import { overlaps } from '../world/navigation.js';
import { createSceneryModel } from './scenery-model.js';
import { createTram } from './tram.js';
import { addSign, createKamppiCentre, createKamppiChapel, createEntrepreneursMonument, createOldBusStation } from './kamppi-landmarks.js';

const TRAM_Z = 20.5;
const hidden = (x, z) => ({ x, z, jitter: .25 });

export const kamppiSquareMap = {
  id: 'kamppi',
  name: 'Kamppi · Narinkkatori',
  spawn: { x: 1.5, z: 7.5, heading: Math.PI },
  bounds: { minX: -35, maxX: 35, minZ: -35, maxZ: 36 },
  pickups: {
    medkit: [{ x: 7, z: 8 }, hidden(-12, -32), hidden(-33, -2), hidden(33, -12), hidden(22, 33.5)],
    battery: [hidden(6, -32), hidden(-33, 8), hidden(33, -8), hidden(-5, 33.5)],
  },
  create() { return createMap(kamppiSquareMap, buildKamppi); },
};

function buildKamppi(root) {
  const colliders = [], buildings = [];
  const street = createSceneryModel('Narinkkatori street furniture');
  const obstacle = (x, z, w, d, height) => colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, height });
  function addBuilding(group) {
    root.add(group); group.updateMatrixWorld(true);
    const meshes = [], materials = [];
    group.traverse(node => {
      if (!node.isMesh) return;
      meshes.push(node); materials.push(...(Array.isArray(node.material) ? node.material : [node.material]));
    });
    buildings.push({ group, meshes, materials, opacity: 1, hiddenUntil: 0, bounds: new THREE.Box3().setFromObject(group).expandByScalar(.06) });
  }
  function surface(name, w, d, x, z, color, y, texture = null) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ color, map: texture, roughness: .95 }));
    mesh.name = name; mesh.rotation.x = -Math.PI / 2; mesh.position.set(x, y, z); mesh.receiveShadow = true; root.add(mesh);
  }
  let seed = 553;
  const random = () => ((seed = seed * 16807 % 2147483647) - 1) / 2147483646;
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#92938d'; ctx.fillRect(0, 0, 256, 256);
  for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
    const tone = 166 + Math.floor(random() * 24);
    ctx.fillStyle = `rgb(${tone + 5},${tone + 3},${tone - 2})`;
    ctx.fillRect(col * 32 + 1, row * 32 + 1, 30, 30);
  }
  const paving = new THREE.CanvasTexture(canvas);
  paving.colorSpace = THREE.SRGBColorSpace; paving.wrapS = paving.wrapT = THREE.RepeatWrapping;
  paving.repeat.set(16, 16); paving.anisotropy = 4;
  surface('Kamppi district paving', 110, 110, 0, 0, '#b6b5a9', -.045, paving);
  const squarePaving = paving.clone(); squarePaving.repeat.set(9, 7);
  surface('Narinkkatori granite square', 44, 34, -1, -1, '#d7d4c6', -.012, squarePaving);
  // Dark granite grid bands are a defining feature of the real pedestrian square.
  for (const x of [-22, -11, 0, 11, 22]) street.box('#6e7875', x, .006, -1, .2, .035, 34);
  for (const z of [-17, -9, -1, 7, 15]) street.box('#6e7875', 0, .006, z, 44, .035, .2);
  // A second, finer band outlines the open centre without turning it into a maze.
  for (const x of [-21.5, 21.5]) street.box('#a3a79b', x, .006, -1, .07, .035, 32);
  surface('Simonkatu', 94, 6.6, 0, TRAM_Z, '#515c60', -.002);
  const trackPaving = paving.clone(); trackPaving.repeat.set(21, .55);
  surface('Simonkatu tram paving', 94, 2.4, 0, TRAM_Z, '#a6a999', .009, trackPaving);
  for (const z of [TRAM_Z - .66, TRAM_Z + .66]) street.box('#a3aca7', 0, .032, z, 94, .045, .07);
  for (const z of [17.1, 23.9]) street.box('#d2d2bf', 0, .04, z, 94, .08, .23);
  for (const x of [-18, 18]) for (let stripe = -3; stripe <= 3; stripe++) {
    street.box('#e7e4d0', x, .025, TRAM_Z + stripe * .85, 2.8, .02, .43);
  }
  for (let x = -44; x <= 44; x += 4) if (Math.abs(Math.abs(x) - 18) > 3) {
    for (const z of [18, 23]) street.box('#c9cebd', x, .02, z, 1.9, .02, .07);
  }

  addBuilding(createKamppiCentre());
  obstacle(-7, -24, 44.3, 10.3, 14.4);
  // The projecting canopy remains walkable; only its columns block ground actors.
  for (let x = -28; x <= 14; x += 3) obstacle(x, -16.73, .12, .12, 3);
  addBuilding(createKamppiChapel());
  // Narrow slices follow the curved bowl instead of blocking its entire bounding box.
  for (let dz = -3.75; dz < 3.75; dz += .5) {
    const halfWidth = 4.95 * Math.sqrt(Math.max(0, 1 - (dz + .25) ** 2 / 3.85 ** 2));
    obstacle(20, -4.5 + dz + .25, (halfWidth + .2) * 2, .5, 8.2);
  }
  obstacle(25.2, -5.4, 4.7, 5.8, 2.8);
  addBuilding(createOldBusStation());
  obstacle(-27, -2, 8.85, 23, 4.1);
  addBuilding(createEntrepreneursMonument());
  obstacle(-15, -7, 3.5, 3.5, 4.7);

  function cafeBlock(name, x, z, width, color, height = 5.5) {
    const model = createSceneryModel(name);
    const { box } = model;
    box(color, 0, height / 2, 0, width, height, 5.4);
    box('#8f968b', 0, .22, 0, width + .1, .44, 5.5);
    box('#c9c8b3', 0, height - .2, 0, width + .3, .25, 5.7);
    box('#636f68', 0, height + .12, 0, width + .45, .35, 5.9);
    for (const side of [-1, 1]) {
      for (let px = -width / 2 + 1.1; px < width / 2 - .5; px += 1.9) {
        box('#d8d2b8', px, 3.65, side * 2.74, 1.05, 1.47, .09);
        box('#587477', px, 3.65, side * 2.81, .84, 1.28, .05);
        box('#cbc6ad', px, 3.65, side * 2.85, .045, 1.3, .03);
        box('#d4cfb7', px, 2.87, side * 2.85, 1.18, .1, .22);
        box('#385458', px, 1.22, side * 2.8, 1.45, 1.9, .12);
      }
      box('#e2d5ae', 0, 2.4, side * 3.3, width - .3, .13, 1.3);
      box('#576e61', 0, 2.33, side * 3.9, width - .3, .22, .08);
    }
    const group = model.finish({ vertexColors: true });
    addSign(group, name === 'Simonkatu cafe' ? 'KAHVILA' : 'HELSINKI', 0, 2.25, -2.89, width * .63, .4, { turn: Math.PI, background: '#576e61' });
    group.position.set(x, 0, z); addBuilding(group);
    obstacle(x, z, width + .2, 5.7, height + .3);
  }
  for (const [x, width, color, name] of [[-22, 10, '#bead91', 'Simonkatu cafe'], [-8, 10, '#cebc9e', 'Simonkatu shops'], [6, 10, '#b1a996', 'Simonkatu cafe'], [22, 10, '#c8ae8d', 'Simonkatu shops']]) {
    cafeBlock(name, x, 28.7, width, color);
  }
  // Buildings beyond the combat perimeter continue the city skyline.
  function backdrop(name, x, z, width, depth, height, color) {
    const model = createSceneryModel(name);
    model.box(color, x, height / 2, z, width, height, depth);
    model.box('#727f79', x, height + .12, z, width + .3, .24, depth + .3);
    for (let dx = -width / 2 + 1; dx < width / 2; dx += 1.7) for (let y = 1.5; y < height - .5; y += 1.5) {
      model.box('#d0cbb4', x + dx, y, z + depth / 2 + .06, 1.12, 1.15, .12);
      model.box('#506e76', x + dx, y, z + depth / 2 + .14, .85, .93, .05);
    }
    root.add(model.finish({ vertexColors: true }));
  }
  backdrop('Hotel Presidentti backdrop', 24, -42, 15, 10, 13, '#949c91');
  backdrop('Tennispalatsi backdrop', -42, -24, 12, 22, 6.5, '#d0c7a3');
  backdrop('Simonkatu city backdrop', 40.5, 6, 9, 14, 10, '#b7a592');

  function bench(x, z, length = 3) {
    street.box('#8d6748', x, .47, z, length, .14, .7);
    for (const dz of [-.24, 0, .24]) street.box('#a37c50', x, .55, z + dz, length, .035, .16);
    for (const dx of [-length * .36, length * .36]) street.box('#4a5a55', x + dx, .23, z, .12, .46, .7);
    obstacle(x, z, length + .1, .8, .58);
  }
  function planter(x, z, width, depth, tree = false) {
    street.box('#8d6046', x, .37, z, width, .74, depth);
    street.box('#aa7c56', x, .76, z, width + .07, .07, depth + .07);
    street.box('#4f5f43', x, .78, z, width - .2, .08, depth - .2);
    if (tree) {
      street.geometry('#756047', new THREE.CylinderGeometry(.12, .18, 2.7, 8).translate(x, 2.1, z));
      street.geometry('#829466', new THREE.IcosahedronGeometry(1.25, 1).scale(.85, 1.3, .85).translate(x, 4, z));
      street.geometry('#98a674', new THREE.IcosahedronGeometry(.95, 1).translate(x + .38, 4.35, z + .14));
    }
    obstacle(x, z, width + .4, depth + .4, tree ? 5.5 : .85);
  }
  // Long timber seats and rust-coloured planters flank, rather than fill, the plaza.
  for (const z of [-11, 1, 12]) {
    planter(-20, z, 1.5, 2.5, true);
    if (z !== 1) bench(-16, z, 3.6);
  }
  for (const x of [10, 17]) { planter(x, 12, 2.8, 1.3, x === 17); bench(x, 14.2, 3); }
  planter(30, -13, 2.2, 2.2, true);
  bench(19, -11, 3.3);
  // Compact cafe terrace outside the old station; tables leave the central lanes open.
  const terrace = createSceneryModel('Narinkkatori cafe terrace');
  for (const z of [-9, -4, 3]) {
    terrace.geometry('#aa8f65', new THREE.CylinderGeometry(.72, .72, .1, 16).translate(-19.5, .95, z));
    terrace.geometry('#455850', new THREE.CylinderGeometry(.055, .12, .9, 8).translate(-19.5, .45, z));
    for (const side of [-1, 1]) {
      terrace.box('#8b6c48', -19.5, .5, z + side * 1.05, .55, .1, .55);
      terrace.box('#8b6c48', -19.5, .86, z + side * 1.3, .55, .65, .07);
    }
    obstacle(-19.5, z, 1.8, 3, 1.2);
    if (z === -4) {
      terrace.geometry('#d5c79f', new THREE.ConeGeometry(1.8, .65, 8).translate(-19.5, 2.8, z));
      terrace.geometry('#7f7963', new THREE.CylinderGeometry(.04, .04, 2.65, 8).translate(-19.5, 1.33, z));
    }
  }
  root.add(terrace.finish({ vertexColors: true }));
  // A small metro/terminal pylon provides one more landmark without an open pit.
  const metro = createSceneryModel('Kamppi metro pylon');
  metro.box('#637b7d', 10.5, 1.4, -13.2, .18, 2.8, .18);
  metro.box('#e4e4cd', 10.5, 2.8, -13.2, 1.2, 1, .25);
  const metroGroup = metro.finish({ vertexColors: true });
  addSign(metroGroup, 'M', 10.5, 2.8, -13.05, .95, .8, { background: '#cf542c' });
  root.add(metroGroup); obstacle(10.5, -13.2, .25, .25, 3.4);

  // Simple modern light poles match the plaza, with taller contact wires at its edge.
  for (const x of [-11, 10]) for (const z of [-13, 10]) {
    street.geometry('#a1adaa', new THREE.CylinderGeometry(.05, .1, 5.8, 8).translate(x, 2.9, z));
    street.box('#596d6a', x, 5.75, z, 1.5, .08, .45);
    street.box('#e8e0b9', x, 5.7, z, 1.35, .035, .35);
    obstacle(x, z, .25, .25, 5.9);
  }
  street.box('#5b6f69', 0, 4.08, TRAM_Z, 94, .025, .025);
  for (const x of [-30, -15, 0, 15, 30]) {
    street.box('#5b6f69', x, 4.3, TRAM_Z, .025, .025, 8);
    for (const z of [16.5, 24.5]) {
      street.geometry('#5b6f69', new THREE.CylinderGeometry(.055, .085, 4.5, 8).translate(x, 2.25, z));
      obstacle(x, z, .22, .22, 4.5);
    }
  }
  root.add(street.finish({ vertexColors: true }));

  const boundary = createSceneryModel('Kamppi Square boundary');
  const { minX, maxX, minZ, maxZ } = kamppiSquareMap.bounds;
  for (const x of [minX, maxX]) boundary.box('#c8cbbc', x, .026, (minZ + maxZ) / 2, .22, .05, maxZ - minZ);
  for (const z of [minZ, maxZ]) boundary.box('#c8cbbc', (minX + maxX) / 2, .026, z, maxX - minX, .05, .22);
  function bollard(x, z) {
    if (colliders.some(c => overlaps(c, x, z, .18))) return;
    boundary.geometry('#6c807e', new THREE.CylinderGeometry(.085, .11, .66, 8).translate(x, .33, z));
    boundary.geometry('#e1dfc6', new THREE.CylinderGeometry(.09, .09, .065, 8).translate(x, .5, z));
  }
  for (let x = minX; x <= maxX; x += 2) { bollard(x, minZ - .3); bollard(x, maxZ + .3); }
  for (let z = minZ; z <= maxZ; z += 2) {
    if (Math.abs(z - TRAM_Z) < 3.5) continue;
    bollard(minX - .3, z); bollard(maxX + .3, z);
  }
  root.add(boundary.finish({ vertexColors: true }));

  const tram = createTram(root, { z: TRAM_Z, display: '7  KAMPPI', extent: 47, initialWait: 7 });
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
      return departed ? 'KAMPPI · SIMONKATU' : null;
    },
  };
}
