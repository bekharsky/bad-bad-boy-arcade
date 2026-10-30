import * as THREE from 'three';
import { createMap } from '../world/map.js';
import { createSceneryModel as model } from './scenery-model.js';
import { createRunnerTraffic, createRunnerFinish } from '../runner/track-renderer.js';
import { createSwedishTheatre, createKappeli, createRuneberg, createHavisAmanda, createMarketWaterfront } from './esplanadi-landmarks.js';

export const ESPLANADI_LENGTH = 600;
export const esplanadiMap = {
  id: 'esplanadi', name: 'Esplanadi Run', mode: 'runner',
  runner: { length: ESPLANADI_LENGTH, riderKinds: ['bike'] },
  spawn: { x: 0, z: 0, heading: Math.PI },
  bounds: { minX: -5.5, maxX: 5.5, minZ: -130, maxZ: 30 },
  environment: { background: new THREE.Color('#9bbbc6'), fog: new THREE.Fog('#9bbbc6', 60, 160) },
  create() { return createMap(esplanadiMap, buildEsplanadi); },
};

function buildStreetSection(index) {
  const m = model('Esplanadi street section');
  m.box('#777b73', 0, -.1, 0, 12, .2, 40);
  m.box('#c6bda8', -7.1, .015, 0, 2.2, .15, 40);
  m.box('#c7baa0', 7, .015, 0, 2, .15, 40);
  m.box('#8eaa64', 17, -.01, 0, 18, .12, 40);
  m.box('#d1c3a2', 19, .06, 0, 2.4, .08, 40);
  m.box('#7a8078', 30, -.08, 0, 8, .18, 40);
  for (const x of [-5.7, 5.7]) m.box('#d8cfb4', x, .05, 0, .12, .02, 40);
  for (const x of [-1.5, 1.5]) for (let z = -18; z < 20; z += 6) m.box('#ddd5b8', x, .025, z, .075, .02, 2.3);
  for (const x of [10.3, 24]) for (const z of [-13, 7]) {
    m.geometry('#746c50', new THREE.CylinderGeometry(.18, .25, 4.5, 8).translate(x, 2.25, z));
    for (const [dx, dy, dz] of [[0, 0, 0], [-1.25, -.6, -.6], [1.1, -.45, .7]]) {
      m.geometry(['#68864c', '#7c9858', '#8eaa64'][(index + (dx ? 1 : 0)) % 3],
        new THREE.IcosahedronGeometry(2.3, 1).scale(1, 1.15, 1).translate(x + dx, 5.3 + dy, z + dz));
    }
  }
  // Continuous neoclassical shop fronts along Pohjoisesplanadi.
  for (let n = 0; n < 2; n++) {
    const z = -10 + n * 20, h = 10 + (index + n) % 3 * 1.1;
    const color = ['#d7c6a2', '#c6ad91', '#ded3bd', '#b7c3b6', '#d5bda0'][(index + n) % 5];
    m.box(color, -15, h / 2, z, 13, h, 19.7);
    m.box('#787d70', -15, h + .25, z, 13.4, .5, 20);
    for (const y of [3.5, 6.1, 8.7]) {
      m.box('#e5d9be', -8.38, y + 1.1, z, .18, .12, 19.7);
      for (let zz = -8; zz <= 8; zz += 2.7) {
        m.box('#e8dcc2', -8.35, y, z + zz, .15, 1.95, 1.45);
        m.box('#4a6a71', -8.23, y, z + zz, .08, 1.6, 1.1);
      }
    }
    for (let zz = -7; zz <= 7; zz += 3.5) m.box('#3c626a', -8.43, 1.25, z + zz, .08, 2, 2.6);
    for (let zz = -7; zz <= 7; zz += 3.5) m.box(index % 2 ? '#516f5c' : '#c2a66b', -7.95, 2.5, z + zz, 1.2, .17, 3);
    // Southern street wall remains visible beyond the park's tree rows.
    m.box(['#c4b79f', '#c6b49e', '#cfccba'][index % 3], 40, 6, z, 12, 12, 19.7);
    for (let y = 2; y < 12; y += 2.5) for (let zz = -8; zz <= 8; zz += 3) m.box('#567078', 33.95, y, z + zz, .08, 1.5, 1.15);
  }
  for (const z of [-6, 14]) {
    m.geometry('#516756', new THREE.CylinderGeometry(.065, .1, 4.4, 8).translate(7.9, 2.2, z));
    m.geometry('#e5dfb4', new THREE.SphereGeometry(.29, 8, 6).translate(7.9, 4.5, z));
    for (const x of [12, 22]) {
      m.box('#886e4a', x, .65, z, 2.5, .12, .65);
      m.box('#886e4a', x, 1.05, z + .3, 2.5, .65, .1);
      for (const dx of [-.9, .9]) m.box('#445e52', x + dx, .3, z, .1, .6, .5);
    }
  }
  return m.finish({ vertexColors: true });
}

function buildEsplanadi(root) {
  const sections = Array.from({ length: 5 }, (_, i) => buildStreetSection(i));
  root.add(...sections);
  const anchors = [];
  function anchor(object, progress, x = 0) {
    object.position.x = x; object.userData.routeProgress = progress;
    root.add(object); anchors.push(object); return object;
  }
  anchor(createSwedishTheatre(), 5, -19);
  anchor(createRuneberg(), 255, 16);
  anchor(createKappeli(), 475, 21);
  const fountain = createHavisAmanda(); anchor(fountain.root, 620, 10);
  const market = createMarketWaterfront(); anchor(market.root, 570);
  const traffic = createRunnerTraffic(root, 'Esplanadi', esplanadiMap.runner);
  const finish = createRunnerFinish(root, 'Esplanadi', ESPLANADI_LENGTH);
  function updateRunner(state) {
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      section.position.z = ((i * 40 + state.distance + 160) % 200) - 160;
      const progress = state.distance - section.position.z;
      section.visible = progress >= 40 && progress < 500;
    }
    // The first 20 metres have their own surface, avoiding a facade through
    // the theatre. All later street sections are recycled, landmarks are not.
    for (const object of anchors) object.position.z = state.distance - object.userData.routeProgress;
    fountain.update(state.elapsed); market.update(state.elapsed);
    traffic.update(state); finish.update(state);
  }
  const entrance = model('Theatre starting street');
  entrance.box('#b8b29f', 0, -.2, 10, 130, .2, 60);
  entrance.box('#777b73', 0, -.1, 10, 12, .2, 60);
  entrance.box('#8eaa64', 18, -.01, 10, 20, .12, 60);
  entrance.box('#d1c3a2', 19, .06, 10, 2.4, .08, 60);
  for (const x of [-7, 7]) entrance.box('#c5bba6', x, -.015, 10, 2, .15, 60);
  anchor(entrance.finish({ vertexColors: true }), 0);
  return { colliders: [], updateRunner, reset() { updateRunner({ distance: 0, elapsed: 0, traffic: [] }); } };
}
