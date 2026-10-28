import * as THREE from 'three';
import { createMap } from '../world/map.js';
import { overlaps } from '../world/navigation.js';
import { createSceneryModel } from './scenery-model.js';
import { createTram } from './tram.js';
import { createKamppiCentre, createKamppiChapel, createEntrepreneursMonument, createKasarmi, createLasipalatsi, createLasipalatsiClockTower, createAmosRexMound } from './kamppi-landmarks.js';

const TRAM_Z = 61.5;
const hidden = (x, z) => ({ x, z, jitter: .25 });

export const kamppiSquareMap = {
  id: 'kamppi',
  name: 'Kamppi · Narinkkatori',
  spawn: { x: -5.5, z: 7.5, heading: Math.PI },
  bounds: { minX: -43, maxX: 43, minZ: -43, maxZ: 68.5 },
  pickups: {
    medkit: [{ x: -2, z: 6 }, hidden(-12, -39), hidden(-37, -17), hidden(25, 27), hidden(-5, 57.5)],
    battery: [hidden(12, -39), hidden(-35, -16), hidden(-15, 26), hidden(18, 57.5)],
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
  paving.repeat.set(19, 23); paving.anisotropy = 4;
  surface('Kamppi district paving', 130, 155, 0, 12, '#b6b5a9', -.045, paving);
  const squarePaving = paving.clone(); squarePaving.repeat.set(12, 8);
  surface('Narinkkatori granite square', 58, 39, 0, -4, '#d7d4c6', -.012, squarePaving);
  // Dark granite grid bands are a defining feature of the real pedestrian square.
  for (const x of [-28, -14, 0, 14, 28]) street.box('#6e7875', x, .006, -4, .2, .035, 39);
  for (const z of [-23, -14, -5, 4, 15]) street.box('#6e7875', 0, .006, z, 58, .035, .2);
  // A second, finer band outlines the open centre without turning it into a maze.
  for (const x of [-27.5, 27.5]) street.box('#a3a79b', x, .006, -4, .07, .035, 37);
  surface('Mannerheimintie', 104, 6.6, 0, TRAM_Z, '#515c60', -.002);
  const trackPaving = paving.clone(); trackPaving.repeat.set(24, .55);
  surface('Mannerheimintie tram paving', 104, 2.4, 0, TRAM_Z, '#a6a999', .009, trackPaving);
  for (const z of [TRAM_Z - .66, TRAM_Z + .66]) street.box('#a3aca7', 0, .032, z, 104, .045, .07);
  for (const z of [TRAM_Z - 3.4, TRAM_Z + 3.4]) street.box('#d2d2bf', 0, .04, z, 104, .08, .23);
  for (const x of [-35, 35]) for (let stripe = -3; stripe <= 3; stripe++) {
    street.box('#e7e4d0', x, .025, TRAM_Z + stripe * .85, 2.8, .02, .43);
  }
  for (let x = -48; x <= 48; x += 4) if (Math.abs(Math.abs(x) - 35) > 3) {
    for (const z of [TRAM_Z - 2.5, TRAM_Z + 2.5]) street.box('#c9cebd', x, .02, z, 1.9, .02, .07);
  }

  addBuilding(createKamppiCentre());
  obstacle(0, -29, 55.3, 12.8, 17.9);
  for (let x = -26.25; x <= 26.25; x += 3.75) obstacle(x, -19.91, .16, .16, 3.75);
  addBuilding(createKamppiChapel());
  for (let dz = -3.75; dz < 3.75; dz += .5) {
    const halfWidth = 4.95 * Math.sqrt(Math.max(0, 1 - (dz + .25) ** 2 / 3.85 ** 2));
    obstacle(-22, -6.5 + dz + .25, (halfWidth + .2) * 2, .5, 8.2);
  }
  obstacle(-16.8, -7.4, 4.7, 5.8, 2.8);
  addBuilding(createEntrepreneursMonument()); obstacle(14, -8, 3.5, 3.5, 4.7);

  // Kasarmi is the near edge of the first square, not a distant side backdrop.
  addBuilding(createKasarmi()); obstacle(5, 19, 50.3, 8.8, 5.7);
  for (const x of [8, 9.6, 9.7, 11.3, 11.4, 13]) for (const z of [13.3, 24.7]) obstacle(x, z, .1, .1, 2.9);
  // Go around either end of the barracks to reach Lasipalatsinaukio.
  const courtPaving = paving.clone(); courtPaving.repeat.set(12, 7);
  surface('Lasipalatsinaukio', 64, 31, 0, 40, '#929e96', -.012, courtPaving);
  for (const wing of createLasipalatsi()) addBuilding(wing);
  obstacle(0, 52, 60.3, 7.3, 4.3);
  obstacle(-27, 41.5, 6.3, 20.3, 5.4); obstacle(27, 41.5, 6.3, 20.3, 4.3);
  addBuilding(createLasipalatsiClockTower()); obstacle(8, 38, 2.3, 2.3, 16.3);
  for (const [x, z, radius, height] of [[-10, 31.5, 4.1, 2], [8, 29.5, 3.4, 1.7], [16, 40, 4.3, 2.5], [-12, 42, 3.4, 2], [0, 45, 2.8, 1.6]]) {
    addBuilding(createAmosRexMound(x, z, radius, height));
    // Flat-ground gameplay routes around the real skylight hills.
    for (let dz = -Math.ceil(radius); dz < radius; dz++) {
      const halfWidth = Math.sqrt(Math.max(0, radius ** 2 - (dz + .5) ** 2));
      if (halfWidth > 0) obstacle(x, z + dz + .5, (halfWidth + .2) * 2, 1, height + .8);
    }
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
  backdrop('Hotel Presidentti backdrop', 33, -52, 15, 10, 13, '#949c91');
  backdrop('Tennispalatsi backdrop', -50, -24, 12, 22, 6.5, '#d0c7a3');
  backdrop('Simonkatu city backdrop', 49, 6, 9, 14, 10, '#b7a592');

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
  // Seating stays at the sides so the larger Narinkkatori centre remains open.
  for (const z of [-14, -2, 9]) {
    planter(30, z, 1.5, 2.5, true);
    if (z !== -2) bench(26, z, 3.6);
  }
  planter(-35, 5, 2.2, 2.2, true); bench(-31, 5, 3.3);
  for (const x of [-35, 35]) { planter(x, 28, 2, 2, true); bench(x, 33, 3); }
  const terrace = createSceneryModel('Narinkkatori cafe terrace');
  for (const x of [17, 22, 27]) {
    terrace.geometry('#aa8f65', new THREE.CylinderGeometry(.72, .72, .1, 16).translate(x, .95, 11));
    terrace.geometry('#455850', new THREE.CylinderGeometry(.055, .12, .9, 8).translate(x, .45, 11));
    for (const side of [-1, 1]) {
      terrace.box('#8b6c48', x, .5, 11 + side * 1.05, .55, .1, .55);
      terrace.box('#8b6c48', x, .86, 11 + side * 1.3, .55, .65, .07);
    }
    obstacle(x, 11, 1.8, 3, 1.2);
    if (x === 22) {
      terrace.geometry('#d5c79f', new THREE.ConeGeometry(1.8, .65, 8).translate(x, 2.8, 11));
      terrace.geometry('#7f7963', new THREE.CylinderGeometry(.04, .04, 2.65, 8).translate(x, 1.33, 11));
    }
  }
  root.add(terrace.finish({ vertexColors: true }));
  const bikes = createSceneryModel('Kasarmi city bikes');
  for (let x = -14; x <= 3; x += 1.7) {
    for (const dx of [-.38, .38]) bikes.geometry('#465a57', new THREE.TorusGeometry(.28, .035, 6, 12).translate(x + dx, .31, 12.5));
    bikes.box('#d9be53', x, .53, 12.5, .8, .1, .13);
    bikes.box('#d9be53', x + .35, .7, 12.5, .07, .55, .07, .2);
    bikes.box('#596961', x + .35, .98, 12.5, .3, .06, .08);
    bikes.box('#596961', x - .16, .77, 12.5, .3, .07, .15);
    bikes.box('#ddc859', x + .65, .48, 12.5, .2, .9, .3);
  }
  root.add(bikes.finish({ vertexColors: true })); obstacle(-5.5, 12.5, 18.9, .8, 1.05);

  // Simple modern light poles match the plaza, with taller contact wires at its edge.
  for (const x of [-11, 11]) for (const z of [-15, 6]) {
    street.geometry('#a1adaa', new THREE.CylinderGeometry(.05, .1, 5.8, 8).translate(x, 2.9, z));
    street.box('#596d6a', x, 5.75, z, 1.5, .08, .45);
    street.box('#e8e0b9', x, 5.7, z, 1.35, .035, .35);
    obstacle(x, z, .25, .25, 5.9);
  }
  street.box('#5b6f69', 0, 4.08, TRAM_Z, 104, .025, .025);
  for (const x of [-40, -20, 0, 20, 40]) {
    street.box('#5b6f69', x, 4.3, TRAM_Z - .25, .025, .025, 11.5);
    for (const z of [TRAM_Z - 5.5, TRAM_Z + 5]) {
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

  const tram = createTram(root, { z: TRAM_Z, display: '', extent: 52, initialWait: 7 });
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
      return departed ? 'KAMPPI · MANNERHEIMINTIE' : null;
    },
  };
}
