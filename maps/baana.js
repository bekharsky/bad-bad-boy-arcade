import * as THREE from 'three';
import { createMap } from '../world/map.js';
import { createSceneryModel } from './scenery-model.js';
import { createTrafficModel, animateTraffic } from '../runner/traffic-models.js';
import { RUN_LANES, TRAFFIC_COLORS, TRAFFIC_CAPACITY, BAANA_LENGTH } from '../runner/baana-run.js';

export const baanaMap = {
  id: 'baana', name: 'Baana Run', mode: 'runner',
  spawn: { x: 0, z: 0, heading: Math.PI },
  bounds: { minX: -5.5, maxX: 5.5, minZ: -130, maxZ: 30 },
  create() { return createMap(baanaMap, buildBaana); },
};

function buildBaana(root) {
  const sections = [], buildings = [], trafficPool = [];
  let seed = 326;
  const random = () => ((seed = seed * 16807 % 2147483647) - 1) / 2147483646;
  for (let section = 0; section < 5; section++) {
    const scenery = createSceneryModel('Baana cutting section'), { box } = scenery;
    box('#69746f', 0, -.12, 0, 16, .2, 32);
    box('#48565c', 0, -.015, 0, 10, .08, 32);
    for (const x of [-5.85, 5.85]) box('#a5aaa0', x, .015, 0, 1.6, .09, 32);
    for (const x of [-4.9, 4.9]) box('#e6e3cc', x, .045, 0, .11, .02, 32);
    for (const x of [-1.5, 1.5]) for (let z = -14; z < 16; z += 5) box('#c7cbb7', x, .04, z, .075, .02, 2);
    if (section % 2 === 0) {
      for (const x of [-.55, .55]) scenery.geometry('#d5d9c6', new THREE.RingGeometry(.26, .31, 16).rotateX(-Math.PI / 2).translate(x, .055, -9));
      box('#d5d9c6', 0, .055, -9, .9, .02, .055);
      for (const x of [-.28, .28]) scenery.geometry('#d5d9c6', new THREE.BoxGeometry(.06, .02, .6).rotateY(x > 0 ? .65 : -.65).translate(x, .055, -9.25));
    }
    for (const side of [-1, 1]) {
      box('#697268', side * 8.3, 3.2, 0, 3.2, 6.5, 32);
      for (let z = -15; z < 16; z += 3) {
        const geometry = new THREE.DodecahedronGeometry(1, 0).scale(1.1, 1.8 + random(), 2.1).rotateY(random()).translate(side * 7.3, 2.6 + random(), z);
        scenery.geometry(['#717b70', '#7c8172', '#626f66'][Math.floor(random() * 3)], geometry);
        for (let row = 0; row < 5; row++) box(row % 2 ? '#818678' : '#5f6c64', side * 6.68, .7 + row * 1.25, z, .12, 1.15, 2.8);
      }
      box('#adb6a3', side * 7.1, 6.55, 0, 1.2, .18, 32);
      box('#627b55', side * 10.8, 6.5, 0, 5, .18, 32);
      for (const y of [6.9, 7.35]) box('#627771', side * 6.85, y, 0, .04, .04, 32);
      for (let z = -15; z < 16; z += 3) box('#627771', side * 6.85, 6.98, z, .065, .95, .065);
      for (const z of [-10, 8]) {
        scenery.geometry('#73634f', new THREE.CylinderGeometry(.12, .2, 2.8, 7).translate(side * 11, 7.9, z));
        scenery.geometry('#819769', new THREE.IcosahedronGeometry(1.6, 1).scale(1, 1.3, 1).translate(side * 11, 10.2, z));
      }
      // Warm city facades above the trench, never on the running surface.
      const cityHeight = 4 + section % 3;
      box(side > 0 ? '#c2b394' : '#b8a08d', side * 17, 6.5 + cityHeight / 2, 0, 7, cityHeight, 24);
      box('#64756d', side * 17, 6.65 + cityHeight, 0, 7.3, .3, 24.3);
      for (let z = -10; z <= 10; z += 2) for (let y = 7.4; y < 6 + cityHeight; y += 1.5) box('#4c7076', side * 13.46, y, z, .06, 1, 1.15);
    }
    for (const x of [-5.6, 5.6]) {
      scenery.geometry('#435f59', new THREE.CylinderGeometry(.05, .08, 3.8, 7).translate(x, 1.9, 0));
      box('#e8dcb4', x, 3.85, 0, .65, .1, .65);
    }
    // Bright murals break the stone rhythm at intervals, like Baana's art areas.
    if (section % 2 === 0) for (let stripe = 0; stripe < 6; stripe++) box(['#ae6f57', '#7c9b8d', '#d0ad6a'][stripe % 3], -6.52, 1.5, -3 + stripe * .85, .025, 1.8, .7);
    const group = scenery.finish({ vertexColors: true }); root.add(group); sections.push(group);
    if (section === 1 || section === 4) {
      const bridge = createSceneryModel('Baana road bridge');
      bridge.box('#c0c2b0', 0, 7.1, 0, 19, .85, 4.8);
      bridge.box('#515f61', 0, 7.56, 0, 19, .08, 4.3);
      for (const side of [-1, 1]) {
        bridge.box('#abb3a4', side * 6.6, 3.4, 0, .7, 6.8, 5.2);
        for (let x = -8; x <= 8; x += 1.4) bridge.box('#73867e', x, 8.15, side * 2.3, .045, 1.15, .045);
        bridge.box('#73867e', 0, 8.7, side * 2.3, 19, .06, .06);
      }
      const object = bridge.finish({ vertexColors: true }); group.add(object); object.updateMatrixWorld(true);
      buildings.push({ group: object, meshes: [...object.children], materials: object.children.map(mesh => mesh.material), bounds: new THREE.Box3(), opacity: 1, hiddenUntil: 0 });
    }
  }
  const templates = [];
  for (const kind of ['bike', 'scooter']) for (const color of TRAFFIC_COLORS) templates.push(createTrafficModel(kind, color));
  for (let i = 0; i < TRAFFIC_CAPACITY; i++) {
    const object = new THREE.Group(); object.name = 'Baana traffic'; object.visible = false;
    for (const template of templates) { const variant = template.clone(true); variant.visible = false; object.add(variant); }
    root.add(object); trafficPool.push(object);
  }
  // All cloned geometries/materials are now owned by this map's subtree.
  const finish = createSceneryModel('Baana finish');
  for (let row = 0; row < 2; row++) for (let col = 0; col < 12; col++) finish.box((row + col) % 2 ? '#e1ddc2' : '#354d50', (col - 5.5) * .8, .055, row * .8, .8, .02, .8);
  const finishLine = finish.finish({ vertexColors: true }); finishLine.visible = false; root.add(finishLine);
  function updateRunner(state) {
    for (let i = 0; i < sections.length; i++) sections[i].position.z = ((i * 32 + state.distance + 128) % 160) - 128;
    for (const section of sections) section.updateMatrixWorld(true);
    for (const bridge of buildings) bridge.bounds.setFromObject(bridge.group);
    for (let i = 0; i < trafficPool.length; i++) {
      const object = trafficPool[i], agent = state.traffic[i]; object.visible = !!agent;
      if (!agent) continue;
      object.position.set(RUN_LANES[agent.lane], 0, state.distance - agent.progress);
      for (const variant of object.children) {
        variant.visible = variant.name === `${agent.color} ${agent.kind}`;
        if (variant.visible) animateTraffic(variant, state.elapsed + agent.id, agent.speed + state.speed);
      }
    }
    finishLine.visible = BAANA_LENGTH - state.distance < 80;
    finishLine.position.z = state.distance - BAANA_LENGTH;
  }
  return { colliders: [], buildings, updateRunner, reset() { updateRunner({ distance: 0, elapsed: 0, traffic: [] }); } };
}
