import * as THREE from 'three';
import { registerBuilding } from '../world/building-visibility.js';
import { createMap } from '../world/map.js';
import { overlaps } from '../world/navigation.js';
import { addTree } from './vegetation.js';
import { createSceneryModel } from './scenery-model.js';
import { createTram } from './tram.js';
import { createKamppiCentre, createKamppiChapel, createEntrepreneursMonument, createKasarmi, createLasipalatsi, createLasipalatsiClockTower, createAmosRexMound, createKamppiCityBlock } from './kamppi-landmarks.js';
import { addChristmasDecorations } from './christmas-decor.js';

const TRAM_Z = 61.5;
const hidden = (x, z) => ({ x, z, jitter: .25 });

export const kamppiSquareMap = {
  id: 'kamppi',
  name: 'Kamppi · Amos Rex',
  spawn: { x: -20, z: 34, heading: Math.atan2(3, 1) },
  bounds: { minX: -43, maxX: 43, minZ: -43, maxZ: 68.5 },
  openingCameoRoute: [[-17, 28], [-19.2, 33]],
  // Hidden entrances lead into and around Narinkkatori.
  pedestrianRoutes: [
    [[-16, 12], [-13, 8], [-10, 7], [-6, 4], [2, 3.5]],
    [[5, 12], [2, 8], [-1, 6], [-4, 3], [-9, 2]],
    [[-19.5, 13.5], [-21, 13.5], [-24, 16], [-26, 21], [-31, 24]],
    [[11, 12], [10, 9], [15, 8], [23, 8], [30, 6]],
    [[-18, 13.5], [-21, 13.5], [-21, 24.2], [-14, 24.2], [-9, 24.2]],
  ],
  pickups: {
    sleigh: [{ x: -35, z: 43 }],
    medkit: [{ x: -2, z: 6 }, hidden(-12, -39), hidden(-16, 8), hidden(25, 27), hidden(-5, 57.5)],
    battery: [hidden(12, -39), hidden(-12, 8), hidden(-8, 8), hidden(18, 57.5)],
    skates: [{ x: 23, z: 8 }],
  },
  create() { return createMap(kamppiSquareMap, buildKamppi); },
};

function buildKamppi(root) {
  const colliders = [], buildings = [];
  const street = createSceneryModel('Narinkkatori street furniture');
  const obstacle = (x, z, w, d, height) => colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, height });
  const propObstacle = (x, z, w, d, height) => obstacle(x, z, Math.max(.14, w - .36), Math.max(.14, d - .36), height);
  function addBuilding(group) {
    root.add(group);
    buildings.push(registerBuilding(group));
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
  paving.repeat.set(26, 28); paving.anisotropy = 4;
  surface('Kamppi district paving', 180, 190, 0, 12, '#b6b5a9', -.045, paving);
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
  // A low glazed return joins the mall and gives the western walk a street
  // frontage, rather than leaving a broad strip of empty plaza beside it.
  const gallery = createKamppiCityBlock({ name: 'Kamppi west gallery', x: -31.5, z: -12, width: 22, depth: 7, height: 4.3, color: '#8b9d91', turn: -Math.PI / 2, glass: true });
  const shades = createSceneryModel('Gallery canopies');
  for (const x of [-7, 0, 7]) {
    shades.box('#d9d1b4', x, 2.4, 4.05, 5.1, .12, 1.2);
    shades.box('#6d8777', x, 2.3, 4.62, 5.1, .18, .08);
  }
  gallery.add(shades.finish({ vertexColors: true })); addBuilding(gallery);
  obstacle(-31.5, -12, 7.3, 22.3, 4.5);
  const chapel = createKamppiChapel(); addBuilding(chapel);
  const { x: chapelX, z: chapelZ } = chapel.position;
  for (let dz = -3.75; dz < 3.75; dz += .5) {
    const halfWidth = 4.95 * Math.sqrt(Math.max(0, 1 - (dz + .25) ** 2 / 3.85 ** 2));
    obstacle(chapelX, chapelZ + dz + .25, (halfWidth + .2) * 2, .5, 8.2);
  }
  obstacle(chapelX + 5.2, chapelZ - .9, 4.7, 5.8, 2.8);
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
  const clock = createLasipalatsiClockTower(); addBuilding(clock);
  obstacle(clock.position.x, clock.position.z, 2.3, 2.3, 16.3);
  for (const [x, z, radius, height] of [[-10, 31.5, 4.1, 2], [8, 29.5, 3.4, 1.7], [16, 40, 4.3, 2.5], [-12, 42, 3.4, 2], [0, 45, 2.8, 1.6]]) {
    addBuilding(createAmosRexMound(x, z, radius, height));
    // Flat-ground gameplay routes around the real skylight hills.
    for (let dz = -Math.ceil(radius); dz < radius; dz++) {
      const halfWidth = Math.sqrt(Math.max(0, radius ** 2 - (dz + .5) ** 2));
      if (halfWidth > 0) obstacle(x, z + dz + .5, (halfWidth + .2) * 2, 1, height + .8);
    }
  }

  // Keep the play perimeter, but surround it with the dense street walls visible
  // on the satellite reference. Both tram portals remain clear of buildings.
  for (const x of [-45, 45]) surface('Street outside Kamppi', 4, 130, x, 12, '#646f72', -.025);
  surface('Street behind Kamppi', 130, 4, 0, -45, '#646f72', -.025);
  // An actual street gap breaks the long west wall instead of ending the view
  // in a flat facade. It belongs to the surrounding city, beyond the bollards.
  surface('Simonkatu side street', 29, 8, -58, -17, '#646f72', -.018);
  surface('Simonkatu street continuation', 9, 29, -35, -60, '#646f72', -.018);
  const promenadePaving = paving.clone(); promenadePaving.repeat.set(1.4, 8);
  surface('Chapel promenade', 8.2, 45, -37.5, -3, '#c3c7b9', -.006, promenadePaving);
  for (const x of [-41.7, -33.3]) street.box('#89968b', x, .014, -3, .15, .04, 45);
  const city = new THREE.Group(); city.name = 'Kamppi surrounding city'; root.add(city);
  const blocks = [
    { name: 'Scandic Simonkentta backdrop', x: -51, z: 8, width: 36, depth: 12, height: 13, color: '#6e8986', turn: Math.PI / 2, glass: true },
    { name: 'Simonkatu corner backdrop', x: -52, z: -32, width: 20, depth: 14, height: 8, color: '#c1aa92', turn: Math.PI / 2 },
    { name: 'Forum side backdrop', x: -52, z: 44, width: 28, depth: 14, height: 11, color: '#bfaa95', turn: Math.PI / 2 },
    { name: 'Hotel Presidentti backdrop', x: 51, z: -16, width: 40, depth: 12, height: 15, color: '#949c91', turn: -Math.PI / 2 },
    { name: 'Salomonkatu offices backdrop', x: 48, z: 22, width: 28, depth: 12, height: 12, color: '#777f78', turn: -Math.PI / 2, glass: true },
    { name: 'Arkadiankatu corner backdrop', x: 48, z: 48, width: 16, depth: 12, height: 10, color: '#d1bca2', turn: -Math.PI / 2 },
    { name: 'Kamppi rear block west', x: -54, z: -53, width: 20, depth: 14, height: 9, color: '#cab79b' },
    { name: 'Simonkatu distant block', x: -54, z: -76, width: 26, depth: 12, height: 12, color: '#acb2a4' },
    { name: 'Kamppi rear block centre', x: -7, z: -53, width: 30, depth: 14, height: 13, color: '#a9b4aa', glass: true },
    { name: 'Kamppi rear block east', x: 22, z: -53, width: 22, depth: 14, height: 10, color: '#c3a188' },
    { name: 'Kamppi rear corner', x: 48, z: -53, width: 20, depth: 14, height: 12, color: '#c1b7a1' },
    { name: 'Mannerheimintie west backdrop', x: -31, z: 82, width: 28, depth: 13, height: 12, color: '#bb9581', turn: Math.PI },
    { name: 'Sokos Helsinki backdrop', x: 0, z: 82, width: 30, depth: 13, height: 15, color: '#b9b5a2', turn: Math.PI },
    { name: 'Mannerheimintie east backdrop', x: 31, z: 82, width: 28, depth: 13, height: 12, color: '#b3b9aa', turn: Math.PI },
  ];
  for (const block of blocks) {
    const group = createKamppiCityBlock(block);
    // Even outside scenery must fade if the following camera enters a building.
    addBuilding(group); city.add(group);
    if (block.name === 'Salomonkatu offices backdrop') obstacle(block.x, block.z, 12.4, 28.4, block.height + .5);
    if (block.name === 'Arkadiankatu corner backdrop') obstacle(block.x, block.z, 12.4, 16.4, block.height + .5);
  }

  function bench(x, z, length = 3, alongStreet = false) {
    const part = (color, dx, y, dz, w, h, d) => street.box(color, x + (alongStreet ? dz : dx), y, z + (alongStreet ? dx : dz), alongStreet ? d : w, h, alongStreet ? w : d);
    part('#8d6748', 0, .47, 0, length, .14, .7);
    for (const dz of [-.24, 0, .24]) part('#a37c50', 0, .55, dz, length, .035, .16);
    for (const dx of [-length * .36, length * .36]) part('#4a5a55', dx, .23, 0, .12, .46, .7);
    propObstacle(x, z, alongStreet ? .8 : length + .1, alongStreet ? length + .1 : .8, .58);
  }
  function planter(x, z, width, depth, tree = false) {
    street.box('#8d6046', x, .37, z, width, .74, depth);
    street.box('#aa7c56', x, .76, z, width + .07, .07, depth + .07);
    street.box('#4f5f43', x, .78, z, width - .2, .08, depth - .2);
    if (tree) {
      addTree(street, { x, y: .82, z, height: 4.65, radius: 1.12, variant: Math.round(z + x) });
    }
    propObstacle(x, z, width + .4, depth + .4, tree ? 5.5 : .85);
  }
  // Seating stays at the sides so the larger Narinkkatori centre remains open.
  for (const z of [-14, -2, 9]) {
    planter(30, z, 1.5, 2.5, true);
    if (z !== -2) bench(26, z, 3.6);
  }
  // A planted edge and longitudinal seats leave the promenade's centre clear.
  for (const z of [-7, 13]) {
    planter(-41.3, z, 1.8, 6, true);
    bench(-39.5, z, 3.3, true);
  }
  for (const z of [-19, 5]) {
    street.geometry('#899d96', new THREE.CylinderGeometry(.05, .09, 3.5, 8).translate(-40.5, 1.75, z));
    street.box('#e4dbb6', -40.5, 3.53, z, .55, .1, .55);
    propObstacle(-40.5, z, .22, .22, 3.6);
  }
  const terrace = createSceneryModel('Narinkkatori cafe terrace');
  for (const x of [17, 22, 27]) {
    terrace.geometry('#aa8f65', new THREE.CylinderGeometry(.72, .72, .1, 16).translate(x, .95, 11));
    terrace.geometry('#455850', new THREE.CylinderGeometry(.055, .12, .9, 8).translate(x, .45, 11));
    for (const side of [-1, 1]) {
      terrace.box('#8b6c48', x, .5, 11 + side * 1.05, .55, .1, .55);
      terrace.box('#8b6c48', x, .86, 11 + side * 1.3, .55, .65, .07);
    }
    propObstacle(x, 11, 1.8, 3, 1.2);
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
  root.add(bikes.finish({ vertexColors: true })); propObstacle(-5.5, 12.5, 18.9, .8, 1.05);

  // The old Narinkkatori kiosk remains by the square; the courtyard gets a
  // proper Christmas market below, beside the closer Salomonkatu buildings.
  function kiosk(x, z, bodyColor, canopyColor) {
    street.box(bodyColor, x, 1.02, z, 2.55, 2.04, 1.85);
    street.box('#e6dcc6', x, 1.12, z + .94, 2.04, 1.05, .08);
    street.box('#3e5c5d', x, 1.12, z + 1, 1.78, .78, .035);
    street.box(canopyColor, x, 2.2, z, 2.92, .2, 2.16);
    for (const dx of [-.75, 0, .75]) street.box(dx ? '#f0e4cc' : canopyColor, x + dx, 2.32, z + .12, .72, .12, 2.18);
    street.box('#d5c79e', x, 2.55, z + .18, 1.5, .28, .12);
    street.box('#7a6147', x, .32, z + 1.2, 2.7, .14, .48);
    propObstacle(x, z, 2.85, 2.2, 2.8);
  }
  kiosk(23.2, -17.5, '#4d675e', '#bf6849');
  // A compact public rink fills the west side of Amos Rex courtyard. Its open
  // east gate faces the clock tower and the new player start.
  const rinkX = -37.4, rinkZ = 34.5, rinkWidth = 8.8, rinkDepth = 13.2;
  const rinkLeft = rinkX - rinkWidth / 2, rinkRight = rinkX + rinkWidth / 2;
  const rinkNear = rinkZ - rinkDepth / 2, rinkFar = rinkZ + rinkDepth / 2;
  const ice = new THREE.Mesh(
    new THREE.PlaneGeometry(rinkWidth, rinkDepth),
    new THREE.MeshStandardMaterial({ color: '#b9dce4', roughness: .24, metalness: .06 }),
  );
  ice.name = 'Amos Rex ice rink'; ice.rotation.x = -Math.PI / 2; ice.position.set(rinkX, .018, rinkZ); ice.receiveShadow = true; root.add(ice);
  const rink = createSceneryModel('Amos Rex rink boards');
  const rinkRail = (x, z, w, d) => {
    rink.box('#f0eee3', x, .44, z, w, .82, d);
    rink.box('#7d5840', x, .12, z, w + .04, .2, d + .04);
    rink.box('#b85f50', x, .76, z, w + .04, .08, d + .04);
    obstacle(x, z, w, d, .9);
  };
  rinkRail(rinkX, rinkNear, rinkWidth, .16);
  rinkRail(rinkX, rinkFar, rinkWidth, .16);
  rinkRail(rinkLeft, rinkZ, .16, rinkDepth);
  for (const [start, end] of [[rinkNear, rinkZ - 1.85], [rinkZ + 1.85, rinkFar]]) {
    rinkRail(rinkRight, (start + end) / 2, .16, end - start);
  }
  for (const z of [rinkNear, rinkFar]) for (const x of [rinkLeft, rinkRight]) {
    rink.box('#eee8d8', x, 1.03, z, .13, .62, .13);
  }
  for (const x of [rinkLeft, rinkRight]) for (let z = rinkNear + 1.3; z < rinkFar; z += 1.65) {
    if (x === rinkRight && Math.abs(z - rinkZ) < 2.2) continue;
    rink.box('#eee8d8', x, 1.03, z, .13, .62, .13);
  }
  for (const z of [rinkNear, rinkFar]) for (let x = rinkLeft + 1.2; x < rinkRight; x += 1.55) {
    rink.box('#eee8d8', x, 1.03, z, .13, .62, .13);
  }
  rink.box('#e9f3f1', rinkX, .045, rinkZ, .09, .012, rinkDepth - .7);
  rink.box('#d46a5c', rinkX, .047, rinkZ, rinkWidth - .7, .014, .08);
  rink.geometry('#f2fbf8', new THREE.TorusGeometry(1.05, .035, 6, 36).rotateX(Math.PI / 2).translate(rinkX, .055, rinkZ));
  for (const x of [rinkX - 2.2, rinkX + 2.2]) for (const z of [rinkZ - 4.3, rinkZ + 4.3]) {
    rink.geometry('#f2fbf8', new THREE.TorusGeometry(.28, .025, 5, 18).rotateX(Math.PI / 2).translate(x, .055, z));
  }
  root.add(rink.finish({ vertexColors: true, roughness: .78 }));

  // Two rows of open-front timber stalls leave a generous central aisle.
  // Their striped awnings and little counters read as a New Year market at a glance.
  const winterMarket = createSceneryModel('Amos Rex winter market');
  const canopies = ['#b95345', '#557761', '#c59a4c', '#426b78'];
  const marketRows = [{ x: 33.2, facing: 1 }, { x: 38.3, facing: -1 }];
  for (const [rowIndex, row] of marketRows.entries()) for (const [stallIndex, z] of [27, 33.2, 39.4, 45.6].entries()) {
    const x = row.x, facing = row.facing, color = canopies[(rowIndex * 2 + stallIndex) % canopies.length];
    winterMarket.box('#6b5039', x, .13, z, 3.35, .22, 3.85);
    winterMarket.box('#e9e3d5', x, .27, z, 3.42, .08, 3.92);
    for (const side of [-1, 1]) for (const end of [-1, 1]) {
      winterMarket.box('#75563d', x + side * 1.48, 1.46, z + end * 1.73, .12, 2.56, .12);
    }
    // Back panel and counter face the lane between the two rows.
    winterMarket.box('#6a5944', x - facing * 1.38, 1.35, z, .14, 2.1, 3.45);
    winterMarket.box('#8b6543', x + facing * .83, .7, z, .32, 1.12, 3.12);
    winterMarket.box('#c39b5a', x + facing * .83, 1.29, z, .38, .12, 3.24);
    for (let item = -1; item <= 1; item++) {
      winterMarket.box(item === 0 ? '#bd6750' : '#6d8a57', x + facing * .74, 1.43, z + item * .78, .38, .22, .48);
      winterMarket.geometry(item === 0 ? '#e1b65a' : '#cf8150', new THREE.IcosahedronGeometry(.15, 0).translate(x + facing * .69, 1.61, z + item * .78));
    }
    for (let stripe = -3; stripe <= 3; stripe++) {
      const stripeColor = Math.abs(stripe) % 2 ? '#f3e6cd' : color;
      winterMarket.box(stripeColor, x, 2.76, z + stripe * .48, 3.42, .16, .48);
      winterMarket.box(stripeColor, x + facing * 1.86, 2.54, z + stripe * .48, .08, .38, .48);
    }
    winterMarket.box('#f3e6cd', x, 2.69, z - 1.82, 3.48, .18, .12);
    winterMarket.box('#f3e6cd', x, 2.69, z + 1.82, 3.48, .18, .12);
    winterMarket.box('#f0dfbf', x + facing * 1.92, 2.14, z, .08, .34, .92);
    winterMarket.box(color, x + facing * 1.97, 2.14, z, .05, .16, .62);
    propObstacle(x, z, 3.2, 3.8, 2.9);
  }
  root.add(winterMarket.finish({ vertexColors: true, roughness: .82 }));

  // Warm lights span the market lane; the shop fronts remain open and clear.
  const marketLights = [27, 33.2, 39.4, 45.6].map(z => ({
    from: [33.2, 4.4, z], to: [38.3, 4.4, z], sag: .4, spacing: .75, lanternSpacing: 2.8, figureSpacing: 8,
  }));
  const rinkTree = { x: rinkX, z: rinkNear - 3.2, scale: .56 };

  const bikeParking = createSceneryModel('Kamppi Narinkkatori bicycle parking');
  for (const z of [-17]) {
    bikeParking.box('#62756c', 29.7, .07, z, 3.3, .12, .12);
    for (let bike = 0; bike < 3; bike++) {
      const x = 28.7 + bike * 1;
      for (const dx of [-.34, .34]) bikeParking.geometry('#53645c', new THREE.TorusGeometry(.24, .035, 6, 12).translate(x + dx, .34, z));
      bikeParking.box('#d1b852', x, .57, z, .82, .07, .08);
      bikeParking.box('#53645c', x + .34, .79, z, .07, .43, .07);
      bikeParking.box('#53645c', x - .33, .72, z, .07, .3, .07);
    }
    propObstacle(29.7, z, 3.6, .5, .9);
  }
  root.add(bikeParking.finish({ vertexColors: true }));

  // A raised crossing over Mannerheimintie gives the eastern edge a readable
  // landmark. The stairs and bridge sit above street level and leave the path below open.
  const overpass = createSceneryModel('Kamppi pedestrian overpass and bus shelter');
  const deckY = 5.2, southZ = 54.8, northZ = 67.1, steps = 13;
  const rise = deckY / steps, run = 6.25 / steps;
  function rail(from, to, radius = .045) {
    const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to), direction = b.clone().sub(a);
    const geometry = new THREE.CylinderGeometry(radius, radius, direction.length(), 6);
    geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize()));
    geometry.translate(...a.addScaledVector(direction, .5).toArray());
    overpass.geometry('#556962', geometry);
  }
  for (let i = 0; i < steps; i++) {
    const y = (i + .5) * rise;
    overpass.box('#83918a', 29.9 + (i + .5) * run, y, southZ, run + .08, .14, 2.5);
    overpass.box('#83918a', 36.25 + (i + .5) * run, deckY - y, northZ, run + .08, .14, 2.5);
  }
  overpass.box('#687a72', 36.2, deckY - .08, 61.1, 2.55, .18, 14.2);
  for (const x of [34.95, 37.45]) {
    rail([x, deckY + .65, 54], [x, deckY + .65, 68.2], .05);
    for (const z of [54.3, 68.1]) overpass.box('#586b64', x, deckY / 2, z, .24, deckY, .24);
    for (let z = 54.5; z <= 68; z += 1.6) overpass.box('#64776f', x, deckY + .32, z, .07, .65, .07);
  }
  for (const z of [southZ - 1.25, southZ + 1.25]) {
    rail([29.5, .65, z], [36.2, deckY + .4, z]);
    for (let i = 0; i <= steps; i += 2) overpass.box('#64776f', 29.7 + i * run, i * rise + .5, z, .07, .8, .07);
  }
  for (const z of [northZ - 1.25, northZ + 1.25]) {
    rail([36.25, deckY + .4, z], [42.95, .65, z]);
    for (let i = 0; i <= steps; i += 2) overpass.box('#64776f', 36.4 + i * run, deckY - i * rise + .5, z, .07, .8, .07);
  }
  // A glass-sided stop and route board make the bridge land in a lived-in street.
  overpass.box('#5a7068', 33, 1.42, 49.1, 4.2, 2.84, .16);
  overpass.box('#9bb7ad', 33, 1.42, 49.2, 3.85, 2.38, .05);
  overpass.box('#667c72', 33, 2.92, 49.05, 4.55, .16, .58);
  overpass.box('#7a5b40', 33, .6, 49.85, 2.8, .14, .42);
  overpass.box('#c8b66f', 31.05, 2.1, 48.94, .44, 1.18, .16);
  root.add(overpass.finish({ vertexColors: true, roughness: .78 }));
  propObstacle(33, 49.8, 2.8, .42, .75);

  // Simple modern light poles match the plaza, with taller contact wires at its edge.
  for (const x of [-11, 11]) for (const z of [-15, 6]) {
    street.geometry('#a1adaa', new THREE.CylinderGeometry(.05, .1, 5.8, 8).translate(x, 2.9, z));
    street.box('#596d6a', x, 5.75, z, 1.5, .08, .45);
    street.box('#e8e0b9', x, 5.7, z, 1.35, .035, .35);
    propObstacle(x, z, .25, .25, 5.9);
  }
  street.box('#5b6f69', 0, 4.08, TRAM_Z, 104, .025, .025);
  for (const x of [-40, -20, 0, 20, 40]) {
    street.box('#5b6f69', x, 4.3, TRAM_Z - .25, .025, .025, 11.5);
    for (const z of [TRAM_Z - 5.5, TRAM_Z + 5]) {
      street.geometry('#5b6f69', new THREE.CylinderGeometry(.055, .085, 4.5, 8).translate(x, 2.25, z));
      propObstacle(x, z, .22, .22, 4.5);
    }
  }
  root.add(street.finish({ vertexColors: true }));
  addChristmasDecorations(root, {
    wreaths: [-11, 11].flatMap(x => [-15, -8, 0, 6].map(z => ({ x, y: 5.05, z }))),
    groundFigures: {
      trees: [{ x: -22, z: -3, scale: .62 }, rinkTree],
      deer: [{ x: 22, z: -3, scale: .54, rotationY: Math.PI / 2 }],
    },
    strands: [
      ...[-15, -8, 0, 6].map(z => ({
        from: [-11, 6.6, z], to: [11, 6.6, z],
        sag: .9, spacing: 1.05, lanternSpacing: 2.6, figureSpacing: 7.5,
      })),
      ...[-11, 11].map(x => ({
        from: [x, 6.6, -15], to: [x, 6.6, 6],
        sag: .9, spacing: 1.05, lanternSpacing: 2.6, figureSpacing: 7.5,
      })),
      ...marketLights,
    ],
  });

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

  const tram = createTram(root, { z: TRAM_Z, display: '', extent: 52, initialWait: 9 });
  let tramCell = null;
  return {
    colliders, buildings,
    dynamicColliders: () => tram.root.visible ? [tram.collider] : [],
    reset() { tram.reset(); tramCell = null; },
    update(dt, actors, navigation) {
      tram.update(dt, actors, navigation);
      const occupied = tram.root.visible ? Math.floor(tram.root.position.x) : null;
      if (occupied !== tramCell) { tramCell = occupied; navigation.refresh(); }
    },
  };
}
