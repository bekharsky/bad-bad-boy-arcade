import * as THREE from 'three';
import { createMap } from '../world/map.js';
import { registerBuilding } from '../world/building-visibility.js';
import { createSceneryModel } from './scenery-model.js';
import { createTram } from './tram.js';
import { buildStationStreet, STATION_TRAM_Z } from './station-street.js';
import { addTree } from './vegetation.js';
import { centralStation, kiasma, kiasmaFront, kiasmaRoof, oodi, postitalo, sanomatalo } from './station-landmarks.js';

export const centralStationMap = {
  id: 'central-station', name: 'Central Station & Oodi',
  spawn: { x: 10, z: 24.5, heading: Math.PI },
  bounds: { minX: -39, maxX: 35, minZ: -47, maxZ: 30 },
  environment: { background: new THREE.Color('#abc9cb'), fog: new THREE.Fog('#abc9cb', 55, 134) },
  openingCameoRoute: [[16.5, 16.5], [15.5, 16.5]],
  pedestrianRoutes: [
    [[8, -7], [-1.5, -7], [-1.5, 6], [2, 8], [4, 10]],
    [[14, -8.5], [22, -10]],
    [[8, -10], [5, -12], [3, -16], [2, -16], [-8, -18]],
    [[-23, -8], [-10, -8], [-8, -3], [-8, 7], [-4, 10], [-5.5, 12.2], [-5, 19]],
    [[-20, -10], [-10, -10], [-8, -3], [-8, 5], [-13, 7], [-15, 7], [-15, 6], [-20, 7]],
    [[-16, -9], [-10, -9], [-6, -12], [-6, -20], [-10, -27]],
  ],
  pickups: {
    sleigh: [{ x: 19.5, z: -8.8 }],
    medkit: [{ x: -3, z: 18.3 }, { x: -19, z: 6.55 }, { x: -12, z: -33 }, { x: 16, z: -14 }],
    battery: [{ x: -29, z: -16 }, { x: -6, z: -38 }, { x: 13, z: 7 }, { x: 2, z: -29 }],
  },
  create() { return createMap(centralStationMap, buildDistrict); },
};

function plazaFloor() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ada89a'; ctx.fillRect(0, 0, 256, 256);
  for (let j = 0; j < 12; j++) for (let i = -1; i < 8; i++) {
    const tone = 189 + ((i + 2) * 41 + j * 17) % 16;
    ctx.fillStyle = 'rgb(' + (tone + 5) + ',' + (tone + 1) + ',' + (tone - 8) + ')';
    ctx.fillRect((i + .5 * (j % 2)) * 32, j * 256 / 12, 31.3, 20.6);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(23, 28); texture.anisotropy = 4;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(132, 158), new THREE.MeshStandardMaterial({ map: texture, color: '#ddd8c9', roughness: .94 }));
  mesh.name = 'Station district granite paving'; mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(0, -.045, -14); mesh.receiveShadow = true;
  return mesh;
}

function buildDistrict(root) {
  const colliders = [], buildings = [];
  function obstacle(x, z, w, d, height) {
    colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, height });
  }
  function place(group, x, z) {
    group.position.set(x, 0, z); root.add(group); buildings.push(registerBuilding(group));
  }
  place(centralStation(), 12, 0);
  obstacle(12, -.35, 24.1, 7.65, 6.6);
  obstacle(12, -.05, 10.3, 7.55, 9.5);
  obstacle(21, -.7, 3.95, 4.12, 19.8);
  for (const x of [5.76, 7.1, 16.9, 18.24]) obstacle(x, 4.3, 1.3, 1.65, 4.95);
  place(postitalo(), -20, 0);
  obstacle(-20, 0, 16.2, 10.2, 7.9); obstacle(-24.3, 0, 7, 10.2, 11.55);
  obstacle(-13.36, 5.56, 1.84, .72, 1.5);
  place(kiasma(), -26.5, -22);
  obstacle(-27.8, -23, 17.3, 7, 5.6);
  for (let bay = 0; bay < 8; bay++) {
    const t = (bay + .5) / 8, front = kiasmaFront(t);
    obstacle(-26.5 + 19 * (t - .5), -22 + (front - 3) / 2, 19 / 8, front + 3, kiasmaRoof(t));
  }
  obstacle(-30.3, -17.1, 4.2, .28, 2.2);
  place(sanomatalo(), 5, -21.5); obstacle(5, -21.5, 12.2, 8.25, 9.3);
  place(oodi(), -6, -42);
  // The glass lobby is recessed. The full width of the timber overhang
  // remains walkable from the square, with pickups in the arcade.
  obstacle(-6, -43.3, 30.7, 5.2, 9.6);
  root.add(plazaFloor());
  buildStationStreet(root, centralStationMap.bounds, obstacle, place);
  const m = createSceneryModel('Elielinaukio and Kansalaistori street furniture'), { box } = m;
  // Granite bands lead north between the post office and station, opening
  // onto a fan of paving joints in front of the library.
  for (const x of [-8.9, -8.55, -.5]) box('#9a978b', x, -.022, -8.1, .09, .024, 37.8);
  for (let i = 0; i < 10; i++) {
    const joint = new THREE.BoxGeometry(.085, .02, 29);
    m.geometry('#a29c8c', joint.translate(0, 0, -14.5).rotateY((i - 4.5) * .205).translate(-6, -.018, -17));
  }
  // Flush bronze and dark stone inlays break up the station forecourt.
  for (const z of [6.7, 6.98, 10.1, 10.38]) box('#9c9383', 12, -.021, z, 20, .028, .12);
  for (const x of [2.05, 21.95]) box('#a29888', x, -.022, 8.54, .12, .024, 3.68);
  function bench(x, z) {
    for (const dx of [-.92, .92]) box('#445757', x + dx, .25, z, .17, .5, .68);
    for (let i = 0; i < 4; i++) box('#9d714d', x, .52, z + (i - 1.5) * .18, 2.65, .12, .15);
    box('#b68b5d', x, .93, z - .32, 2.65, .3, .11);
    obstacle(x, z, 2.65, .75, 1.08);
  }
  for (const [x, z] of [[-15, 10], [9, 9], [-17, -12], [-14, -31], [2, -33], [17, -12]]) bench(x, z);
  for (const [startX, z] of [[-24, 8.1], [-23, -15]]) {
    for (let i = 0; i < 5; i++) {
      const x = startX + i * 1.47;
      m.geometry('#758482', new THREE.TorusGeometry(.35, .042, 6, 12, Math.PI).translate(x, .42, z));
      for (const dx of [-.35, .35]) box('#758482', x + dx, .21, z, .084, .42, .084);
      if (i === 1 || i === 4) {
        obstacle(x, z, .79, .1, .81);
        continue;
      }
      obstacle(x, z + .13, 1.83, .24, 1);
      for (const dx of [-.55, .55]) {
        m.geometry('#36494b', new THREE.TorusGeometry(.32, .048, 7, 20).translate(x + dx, .35, z + .13));
        box('#a7afa3', x + dx, .35, z + .13, .028, .59, .032, -.55);
      }
      box('#d8a23e', x - .23, .5, z + .14, .68, .085, .09, .48);
      box('#e8b94e', x + .12, .56, z + .14, .63, .095, .095, .78);
      box('#495453', x + .44, .67, z + .14, .065, .67, .075, .31);
      box('#4c5753', x - .19, .75, z + .14, .065, .32, .065, .2);
      box('#3a4848', x - .2, .92, z + .14, .27, .07, .13);
    }
  }
  function lantern(x, z) {
    box('#63766c', x, 2.4, z, .12, 4.8, .12);
    m.geometry('#f8dfad', new THREE.SphereGeometry(.38, 12, 8).translate(x, 4.96, z));
    m.geometry('#546b61', new THREE.CylinderGeometry(.32, .18, .16, 12).translate(x, 4.69, z));
    obstacle(x, z, .28, .28, 4.8);
  }
  for (const [x, z] of [[-11, 8.8], [21, 9.6], [-12, -15], [13, -13], [-22, -30], [7, -30]]) lantern(x, z);
  for (const [i, [x, z]] of [[-34, 10], [-30, 8], [-35, -9], [-31, -33], [17, -31], [17, -38], [-32, 23], [25, 23]].entries()) {
    box('#8e9886', x, .17, z, 2.4, .34, 2.4);
    box('#768258', x, .35, z, 2.18, .08, 2.18);
    addTree(m, { x, y: .35, z, height: 4.4 + i % 2, radius: 1.28, variant: 3 * i });
    obstacle(x, z, 2.42, 2.42, .45); obstacle(x, z, .38, .38, 3);
  }
  // The platforms extend north behind the station and visually close the
  // eastern edge of the square. Their granite retaining wall is solid.
  box('#807e70', 33.9, .45, -28.4, 20, .9, 47);
  obstacle(33.9, -28.4, 20, 47, .9);
  for (let z = -49; z <= -6; z += 2.75) box('#576c62', 24.06, 1.42, z, .1, 1.04, .1);
  for (const y of [1.35, 1.9]) box('#62776b', 24.06, y, -28.4, .09, .08, 46.8);
  obstacle(24.06, -28.4, .13, 46.8, 1.95);
  for (const x of [27, 34, 41]) {
    for (const dx of [-.72, .72]) box('#495856', x + dx, .93, -28, .095, .12, 46);
    for (let z = -50; z < -5; z += 1.25) box('#7d7061', x, .91, z, 1.94, .07, .19);
    for (let z = -49; z < -7; z += 7) {
      box('#688478', x + 2.45, 2.65, z, .18, 3.5, .18);
      obstacle(x + 2.45, z, .18, .18, 4.4);
    }
    box('#82958c', x + 2.45, 4.49, -28.5, 3.6, .25, 44);
    box('#d6c398', x + .97, 4.32, -28.5, .16, .1, 44);
    for (const side of [-1, 1]) {
      box('#505b53', x + side * .72, 1.32, -6.15, .2, .79, 1.02);
      box('#c2b9a0', x + side * .74, 1.71, -5.84, .49, .25, .22);
    }
    box('#996551', x, 1.62, -6, 2.09, .24, .25);
    obstacle(x, -6.1, 2.09, .95, 1.84);
  }
  // A commuter train sits nose-first at the buffers behind the hall.
  box('#e6e6d9', 27, 2.46, -21, 2.65, 2.6, 23);
  obstacle(27, -21, 2.71, 23.2, 3.76);
  box('#598964', 27, 1.56, -21, 2.71, .44, 23.15);
  box('#496169', 27, 2.92, -9.43, 2.37, 1.02, .18);
  for (const dx of [-.88, .88]) box('#f9dda1', 27 + dx, 2, -9.39, .32, .17, .2);
  for (let z = -31; z <= -11; z += 1.84) for (const dx of [-1.345, 1.345]) {
    box('#526f73', 27 + dx, 2.88, z, .09, .89, 1.56);
  }
  // A planted edge behind the square keeps the skyline continuous in the
  // same sightline as Oodi without covering the silhouette of its white roof.
  for (let i = 0; i < 18; i++) {
    addTree(m, { x: -49 + i * 5.4, z: -54 - (i % 3) * 2.4, height: 5.5 + i % 4, radius: 2.1, variant: i });
  }
  root.add(m.finish({ vertexColors: true }));
  const tram = createTram(root, { z: STATION_TRAM_Z, initialX: 1, extent: 68 });
  let previousCell = null;
  return {
    colliders, buildings,
    dynamicColliders: () => tram.root.visible ? [tram.collider] : [],
    reset() { tram.reset(); previousCell = null; },
    update(dt, actors, navigation) {
      tram.update(dt, actors, navigation);
      const cell = tram.root.visible ? Math.floor(tram.root.position.x) : null;
      if (cell !== previousCell) { navigation.refresh(); previousCell = cell; }
    },
  };
}
