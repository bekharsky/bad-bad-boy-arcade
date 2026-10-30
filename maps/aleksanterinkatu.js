import * as THREE from 'three';
import { createMap } from '../world/map.js';
import { createSceneryModel as model } from './scenery-model.js';
import { createRunnerTraffic, createRunnerFinish } from '../runner/track-renderer.js';
import { TRAM_LANES, TRAFFIC_CAPACITY } from '../runner/course.js';

export const ALEKSI_LENGTH = 640;
export const ALEKSI_CROSSINGS = Object.freeze([140, 280, 420, 560]);
export const aleksanterinkatuMap = {
  id: 'aleksanterinkatu', name: 'Aleksanterinkatu', mode: 'runner',
  runner: { length: ALEKSI_LENGTH, lanes: TRAM_LANES, tramChance: .42, roadworkKinds: [], crossingPoints: ALEKSI_CROSSINGS, startSpeed: 10.5, speedLimit: 18, acceleration: .12 },
  spawn: { x: TRAM_LANES[0], z: 0, heading: Math.PI },
  bounds: { minX: -5.3, maxX: 5.3, minZ: -150, maxZ: 35 },
  environment: { background: new THREE.Color('#9ebbc1'), fog: new THREE.Fog('#9ebbc1', 65, 165) },
  create() { return createMap(aleksanterinkatuMap, buildAleksi); },
};

function rod(m, color, from, to, radius = .025) {
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to), direction = b.sub(a);
  const geometry = new THREE.CylinderGeometry(radius, radius, direction.length(), 5);
  geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize()));
  m.geometry(color, geometry.translate(...a.addScaledVector(direction, .5).toArray()));
}

// Street-facing relief is actual geometry: warm stone, deep window frames,
// bays, arches, cornices and balcony rails, inspired by the supplied photograph.
function facade(side, progress, depth, variant) {
  const m = model('Aleksi ornate facade');
  const colors = ['#d5c1a0', '#ac8170', '#d8c9b3', '#b5a58d', '#a77664', '#ccd0bc'];
  const stone = colors[variant % colors.length], pale = '#e4d5b8', dark = '#354b51';
  const x = side * 14.3, front = side * 8.25, h = 13.5 + variant % 3 * 1.5;
  m.box(stone, x, h / 2, 0, 12, h, depth - .2);
  m.box('#807e6b', x, h + .25, 0, 12.5, .5, depth + .3);
  m.box(variant % 3 ? '#667c70' : '#90694c', x, h + .8, 0, 10.8, .65, depth - .7);
  for (const y of [3.1, 6.2, 9.3, 12.4]) {
    m.box(pale, side * 8.08, y, 0, .48, .18, depth);
    m.box('#b2a38b', side * 8.1, y - .2, 0, .34, .1, depth);
  }
  for (const z of [-depth / 2 + .6, depth / 2 - .6]) {
    m.box(pale, side * 8.05, 7.1, z, .5, 13.6, .65);
    for (let y = .4; y < h; y += .8) m.box('#c8b79d', side * 7.98, y, z, .62, .1, .9);
  }
  const columns = Math.max(3, Math.floor(depth / 2.8)), spacing = (depth - 2.5) / columns;
  for (let col = 0; col < columns; col++) {
    const z = (col - (columns - 1) / 2) * spacing;
    // Shop entrances and arched upper panels keep the ground floor varied.
    m.box('#bda98c', side * 8.12, 1.45, z, .22, 2.7, 1.95);
    m.box(dark, side * 7.98, 1.4, z, .08, 2.35, 1.65);
    m.box('#9a8d6b', side * 7.91, 1.25, z, .05, 2.4, .07);
    m.geometry(pale, new THREE.TorusGeometry(.85, .09, 5, 12, Math.PI).rotateY(Math.PI / 2).translate(side * 7.95, 1.9, z));
    if (variant % 2 && col % 2 === 0) m.box(['#657d62', '#b49b69', '#965c4f'][variant % 3], side * 7.5, 2.9, z, 1.55, .17, 2.2);
    for (let y = 4.6; y < h - 1; y += 3.1) {
      const bay = col === Math.floor(columns / 2) && variant % 2 === 0;
      const face = bay ? 7.55 : 8.04;
      m.box(pale, side * face, y, z, bay ? 1.05 : .28, 2.3, 1.65);
      m.box('#3f5a60', side * (face - (bay ? .55 : .17)), y, z, .06, 1.8, 1.2);
      m.box('#cbbca1', side * (face - .22), y, z, .06, 1.8, .075);
      m.box('#cbbca1', side * (face - .22), y + .15, z, .06, .07, 1.2);
      m.box(pale, side * (face - .12), y + 1.25, z, .45, .17, 1.95);
      if (variant % 3 === 0) m.geometry(pale, new THREE.ConeGeometry(1, .5, 4).rotateY(Math.PI / 4).scale(.22, 1, 1).translate(side * face, y + 1.5, z));
      if (bay && y < 8) {
        m.box('#c2b093', side * 7.1, y - 1.05, z, 1.3, .2, 2);
        m.box('#3b514c', side * 6.7, y - .7, z, .06, .08, 2);
        for (let dz = -.9; dz <= .91; dz += .3) m.box('#3b514c', side * 6.7, y - .85, z + dz, .045, .45, .045);
      }
    }
  }
  // Rounded pilasters and small dormers catch light above the window bands.
  for (const z of [-depth * .28, depth * .28]) {
    m.geometry(pale, new THREE.CylinderGeometry(.16, .2, h - 3.5, 8).translate(side * 7.98, (h + 3) / 2, z));
    m.box('#546e67', side * 10, h + 1, z, 3.3, 1.2, 2);
    m.box('#324c54', side * 8.25, h + 1, z, .06, .8, 1.2);
  }
  // Return the facade around the corners, so junctions reveal windows and
  // cornices rather than bare walls where the building row opens up.
  for (const end of [-1, 1]) {
    const z = end * depth / 2;
    for (const y of [3.1, 6.2, 9.3, 12.4]) m.box(pale, x, y, z, 12.5, .18, .35);
    for (let y = 1.4; y < h - 1; y += 3.1) for (let col = 0; col < 4; col++) {
      const xx = side * (9.7 + col * 2.55);
      m.box(pale, xx, y, z, 1.8, 2.25, .18);
      m.box(dark, xx, y, z + end * .12, 1.3, 1.8, .06);
      m.box('#cbbca1', xx, y, z + end * .16, .07, 1.8, .04);
    }
  }
  const root = m.finish({ vertexColors: true });
  root.position.z = -progress;
  return root;
}

function junction(progress, index) {
  const m = model('Aleksi crossing square');
  m.box('#b7b09d', 0, -.035, 0, 90, .09, 40);
  m.box('#999f96', 0, .02, 0, 90, .04, 12);
  for (const z of [-15, 15]) for (let x = -4.7; x < 5; x += 1.15) m.box('#e0dcc9', x, .055, z, .65, .025, 2.2);
  for (const side of [-1, 1]) {
    // A square beyond the corner, with planting and benches instead of walls
    // across the side street from which the scooters will emerge.
    for (const z of [-12, 12]) {
      m.box('#999783', side * 13, .45, z, 2.4, .9, 2.4);
      m.box('#7d9168', side * 13, .94, z, 2.2, .1, 2.2);
      m.geometry('#68705a', new THREE.CylinderGeometry(.12, .2, 3.7, 8).translate(side * 13, 2.75, z));
      m.geometry('#7e9562', new THREE.IcosahedronGeometry(1.7, 1).scale(.9, 1.2, .9).translate(side * 13, 4.9, z));
      m.box('#826b4d', side * 10, .65, z + 2, 2.3, .15, .7);
      m.box('#826b4d', side * 10, 1, z + 2.3, 2.3, .6, .1);
    }
    for (const x of [24, 38]) {
      m.box(['#c9baa3', '#c3c6b2', '#bca591'][index % 3], side * x, 7, -15, 12, 14, 10);
      for (let y = 2; y < 14; y += 2.7) for (let dx = -4; dx <= 4; dx += 2) m.box('#47616a', side * x + dx, y, -9.95, 1.2, 1.6, .08);
    }
  }
  const root = m.finish({ vertexColors: true }); root.position.z = -progress;
  const arrows = [];
  for (const side of [-1, 1]) {
    const arrow = model('Side-street scooter warning');
    for (let n = 0; n < 3; n++) {
      const x = side * (7.3 + n * .7);
      rod(arrow, '#ffd35e', [x + side * .35, .1, -.35], [x - side * .35, .1, 0], .065);
      rod(arrow, '#ffd35e', [x + side * .35, .1, .35], [x - side * .35, .1, 0], .065);
    }
    const object = arrow.finish({ vertexColors: true }); root.add(object); object.visible = false; arrows.push(object);
  }
  return { root, arrows };
}

function buildAleksi(root) {
  const city = new THREE.Group(); city.name = 'Aleksanterinkatu street'; root.add(city);
  const lamps = [], lampModel = model('Aleksi suspended lamp');
  rod(lampModel, '#596c62', [0, 7.7, 0], [0, 6.8, 0], .035);
  lampModel.geometry('#426a58', new THREE.CylinderGeometry(.18, .46, .36, 12).translate(0, 6.65, 0));
  lampModel.geometry('#e1d9af', new THREE.CylinderGeometry(.4, .4, .06, 12).translate(0, 6.43, 0));
  const lampTemplate = lampModel.finish({ vertexColors: true }).children[0];
  const ground = model('Aleksi cobbles rails and overhead wires');
  ground.box('#b4aa94', 0, -.17, -310, 110, .2, 740);
  ground.box('#948f7e', 0, -.025, -310, 12, .13, 740);
  for (const x of [-7.2, 7.2]) ground.box('#c8bfa9', x, .02, -310, 2.4, .2, 740);
  for (let z = 35; z > -670; z -= 2.1) {
    ground.box('#a49d8b', 0, .043, z, 12, .012, .04);
    for (const x of [-3.5, -.7, 2.1, 4.9]) ground.box('#a09a88', x, .044, z - .9, .035, .013, 1.7);
  }
  for (const lane of TRAM_LANES) for (const offset of [-.76, .76]) {
    ground.box('#47524f', lane + offset, .055, -310, .18, .025, 740);
    ground.box('#b0bab5', lane + offset, .073, -310, .065, .025, 740);
    rod(ground, '#4c6159', [lane, 5.12, 40], [lane, 5.12, -670], .018);
  }
  for (let z = 12; z > -660; z -= 24) {
    rod(ground, '#596c62', [-9, 10.5, z], [0, 7.7, z], .023);
    rod(ground, '#596c62', [9, 10.5, z], [0, 7.7, z], .023);
    rod(ground, '#596c62', [-9, 8.8, z - 4], [9, 8.8, z + 4], .017);
    for (const lane of TRAM_LANES) rod(ground, '#596c62', [lane, 8.4, z], [lane, 5.12, z], .018);
    const lamp = lampTemplate.clone();
    lamp.name = 'Aleksi suspended lamp';
    lamp.material = lampTemplate.material.clone();
    lamp.material.transparent = true; lamp.material.depthWrite = false;
    lamp.position.z = z; lamp.castShadow = false;
    city.add(lamp); lamps.push(lamp);
  }
  lampTemplate.material.dispose();
  city.add(ground.finish({ vertexColors: true }));
  const squares = ALEKSI_CROSSINGS.map(junction);
  for (const square of squares) city.add(square.root);
  const intervals = [[-40, 120], [160, 260], [300, 400], [440, 540], [580, 680]];
  let variant = 0;
  for (const [from, to] of intervals) {
    const count = Math.ceil((to - from) / 23), depth = (to - from) / count;
    for (let i = 0; i < count; i++) for (const side of [-1, 1]) city.add(facade(side, from + (i + .5) * depth, depth, variant++));
  }
  const traffic = createRunnerTraffic(root, 'Aleksanterinkatu', aleksanterinkatuMap.runner);
  const finish = createRunnerFinish(root, 'Aleksanterinkatu', ALEKSI_LENGTH);
  let currentState = { distance: 0, elapsed: 0, traffic: [], crossings: [] }, colliderTime = -1;
  const tramColliders = [], colliderPool = Array.from({ length: TRAFFIC_CAPACITY }, () => ({ minX: 0, maxX: 0, minZ: 0, maxZ: 0, height: 3.2 }));
  function dynamicColliders() {
    if (colliderTime !== currentState.elapsed) {
      colliderTime = currentState.elapsed; tramColliders.length = 0;
      for (const agent of currentState.traffic) if (agent.kind === 'tram' && !agent.cleared) {
        const c = colliderPool[tramColliders.length];
        c.minX = agent.x - 1.25; c.maxX = agent.x + 1.25;
        c.minZ = agent.z - 7.6; c.maxZ = agent.z + 7.6;
        tramColliders.push(c);
      }
    }
    return tramColliders;
  }
  function updateRunner(state) {
    if (state !== currentState) colliderTime = -1;
    currentState = state;
    city.position.z = state.distance;
    // Fade nearby hanging lamps before they can conceal a rider or the hero
    // under the following camera. Geometry stays shared across all fixtures.
    for (const lamp of lamps) {
      lamp.material.opacity = THREE.MathUtils.clamp(-(state.distance + lamp.position.z) / 8, 0, 1);
      lamp.visible = lamp.material.opacity > .005;
    }
    for (let i = 0; i < squares.length; i++) {
      const event = state.crossings?.[i];
      for (let side = 0; side < 2; side++) squares[i].arrows[side].visible = !!event && (event.phase === 'warning' || event.phase === 'crossing') && (event.side < 0 ? side === 0 : side === 1) && Math.floor(state.elapsed * 7) % 2 === 0;
    }
    traffic.update(state); finish.update(state);
  }
  return { colliders: [], dynamicColliders, updateRunner, reset() { colliderTime = -1; updateRunner({ distance: 0, elapsed: 0, traffic: [], crossings: [] }); } };
}
