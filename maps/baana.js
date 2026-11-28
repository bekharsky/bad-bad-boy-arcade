import * as THREE from 'three';
import { createMap } from '../world/map.js';
import { addTree } from './vegetation.js';
import { createSceneryModel } from './scenery-model.js';
import { createRunnerTraffic, createRunnerFinish } from '../runner/track-renderer.js';
import { BAANA_LENGTH } from '../runner/course.js';
import { CAMEO_KINDS } from '../runner/cameo-roster.js';
import { registerBuilding } from '../world/building-visibility.js';
import { addChristmasDecorations } from './christmas-decor.js';

const STREET_Y = 6.59;
const ASPHALT = '#4f575d';
const carColors = ['#8e474a', '#456878', '#c0b499', '#626967', '#405963'];

export const baanaMap = {
  id: 'baana', name: 'Baana Run', mode: 'runner',
  runner: { length: BAANA_LENGTH, variety: true, busy: true, roadworkDensity: 1.35, cameoShoulder: 5.22, riderKinds: ['bike', 'scooter', 'goose', ...CAMEO_KINDS] },
  spawn: { x: 0, z: 0, heading: Math.PI },
  bounds: { minX: -5.5, maxX: 5.5, minZ: -130, maxZ: 30 },
  environment: { background: new THREE.Color('#7c929f'), fog: new THREE.Fog('#7c929f', 30, 112) },
  create() { return createMap(baanaMap, buildBaana); },
};

function addParkedCar(scenery, x, z, facing, color) {
  const { box, geometry } = scenery;
  const body = new THREE.CylinderGeometry(1, 1, .54, 8).rotateY(Math.PI / 8).scale(.94, 1, 2);
  geometry(color, body.translate(x, STREET_Y + .53, z));
  const cabin = new THREE.CylinderGeometry(.84, 1, .47, 4).rotateY(Math.PI / 4).scale(1.02, 1, 1.56);
  geometry('#3e535f', cabin.translate(x, STREET_Y + 1.01, z - facing * .16));
  box(color, x, STREET_Y + 1.27, z - facing * .16, 1.24, .08, 1.87);
  for (const side of [-1, 1]) {
    for (const axle of [-1.15, 1.15]) {
      const wheel = new THREE.CylinderGeometry(.3, .3, .17, 10).rotateZ(Math.PI / 2);
      geometry('#252b2e', wheel.translate(x + side * .79, STREET_Y + .3, z + axle));
      box('#8b969a', x + side * .884, STREET_Y + .3, z + axle, .025, .22, .22);
    }
    box('#f5e6c3', x + side * .25, STREET_Y + .56, z + facing * 1.85, .23, .13, .07);
    box('#a93d43', x + side * .25, STREET_Y + .58, z - facing * 1.85, .23, .15, .07);
  }
  box('#d4d3c8', x, STREET_Y + .39, z - facing * 1.85, .32, .095, .04);
}

function buildBaana(root) {
  const sections = [], buildings = [];
  let seed = 326;
  const random = () => ((seed = seed * 16807 % 2147483647) - 1) / 2147483646;
  for (let section = 0; section < 5; section++) {
    const hasBridge = section === 1 || section === 4;
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
      box('#adb6a3', side * 7.22, 6.55, 0, 1.45, .18, 32);
      box(ASPHALT, side * 10.32, STREET_Y - .09, 0, 4.75, .18, 32);
      box('#a6aba1', side * 13.12, 6.54, 0, .85, .16, 32);
      for (const [slot, z] of [-12.3, -6.25, 6.25, 12.3].entries()) {
        box('#b4b5a7', side * 10.65, STREET_Y + .013, z, .065, .02, 3.45);
        box('#b4b5a7', side * 11.64, STREET_Y + .013, z + 2.38, 1.98, .02, .06);
        const variant = section * 2 + slot + (side > 0 ? 1 : 0);
        if (variant % 4 !== 2) addParkedCar(scenery, side * 11.66, z + (variant % 3 - 1) * .32, side, carColors[variant % carColors.length]);
      }
      for (const y of [6.9, 7.35]) box('#627771', side * 6.85, y, 0, .04, .04, 32);
      for (let z = -15; z < 16; z += 3) box('#627771', side * 6.85, 6.98, z, .065, .95, .065);
      for (const [i, z] of [-10, 11].entries()) {
        const x = side * 7.43;
        box('#817c6f', x, 6.648, z, .65, .025, .78);
        addTree(scenery, { x, y: 6.65, z, height: 4.75, radius: 1.2, variant: section + i * 2 + (side > 0 ? 1 : 0) });
      }
      if (hasBridge) box(ASPHALT, side * 19.2, STREET_Y - .045, 0, 11.4, .09, 4.3);
      // Leave a gap between facades where the bridge meets the side streets.
      const cityHeight = 4 + section % 3;
      for (const [center, span] of hasBridge ? [[-8, 8], [8, 8]] : [[0, 24]]) {
        box(side > 0 ? '#c2b394' : '#b8a08d', side * 17, 6.5 + cityHeight / 2, center, 7, cityHeight, span);
        box('#64756d', side * 17, 6.65 + cityHeight, center, 7.3, .3, span + .3);
        for (let z = center - span / 2 + 2; z <= center + span / 2 - 2; z += 2) for (let y = 7.4; y < 6 + cityHeight; y += 1.5) {
          box('#d8ccb0', side * 13.46, y, z, .08, 1.18, 1.36);
          box((section + Math.round(z)) % 3 ? '#4c7076' : '#9caaa0', side * 13.4, y, z, .05, 1, 1.15);
          box('#d8ccb0', side * 13.36, y + .12, z, .035, .045, 1.15);
          box('#e2d4b6', side * 13.35, y - .6, z, .3, .12, 1.45);
        }
        for (const end of [-1, 1]) {
          const z = center + end * (span / 2 - .4);
          box('#586f65', side * 13.35, 6.5 + cityHeight / 2, z, .08, cityHeight, .08);
          const chimneyZ = center + end * span * .29;
          box('#a08c75', side * 17, 6.5 + cityHeight + .55, chimneyZ, .7, .8, .7);
          box('#536b65', side * 17, 6.5 + cityHeight + 1, chimneyZ, .85, .12, .85);
        }
        box('#8b9d8d', side * 13.35, 6.5 + cityHeight + .18, center, .14, .09, span + .3);
      }
    }
    for (const x of [-5.92, 5.92]) {
      scenery.geometry('#435f59', new THREE.CylinderGeometry(.05, .08, 3.8, 7).translate(x, 1.9, 0));
      box('#e8dcb4', x, 3.85, 0, .65, .1, .65);
    }
    // A painted Baltic ferry on the cutting wall, all in the scenery batch.
    if (section === 0 || section === 3) {
      box('#17483e', -6.20, 2.5, -5, .06, 3.2, 10);
      const paint = (color, shape, layer) => scenery.geometry(color,
        shape.rotateY(Math.PI / 2).translate(-6.16 + layer * .012, 2.5, -5));
      paint('#eeb946', new THREE.CircleGeometry(.9, 32).translate(2.6, .41, 0), 0);
      const hull = new THREE.Shape();
      hull.moveTo(-3.65, -.05); hull.lineTo(2.75, -.05); hull.lineTo(2.05, -.78); hull.lineTo(-2.95, -.78);
      paint('#f6e6b9', new THREE.ShapeGeometry(hull), 1);
      box('#f6e6b9', -6.14, 2.76, -4.6, .025, .55, 3.55);
      box('#cc7954', -6.13, 3.27, -4, .025, .52, .52);
      for (let z = -5.9; z < -3.1; z += .49) box('#17483e', -6.115, 2.79, z, .012, .2, .32);
      for (const z of [-8, -5.1, -2]) box('#80b8a9', -6.14, 1.39, z, .02, .12, 2.1);
    }
    const group = scenery.finish({ vertexColors: true });
    addChristmasDecorations(group, {
      wreaths: [-5.92, 5.92].map(x => ({ x, y: 3.65, z: 0 })),
      groundFigures: {
        trees: [{ x: -7.43, y: 6.65, z: 3.35, scale: .56 }, { x: 7.43, y: 6.65, z: -13.7, scale: .5 }],
        deer: [
          { x: 7.43, y: 6.65, z: 3.65, scale: .64, rotationY: Math.PI / 2 },
          { x: 7.43, y: 6.65, z: 5.9, scale: .6, rotationY: Math.PI / 2 },
        ],
        sleighs: [{ x: 7.43, y: 6.65, z: 8.45, scale: .65, rotationY: Math.PI / 2 }],
        gifts: [{ x: -7.43, y: 6.65, z: 4.85, scale: .52, rotationY: .3 }, { x: -7.43, y: 6.65, z: -6.2, scale: .56 }],
      },
      strands: [
        ...[-12, 0, 12].map(z => ({
          from: [-5.5, 8.25, z], to: [5.5, 8.25, z],
          sag: .65, spacing: .9, lanternSpacing: 2.35, figureSpacing: 6.8,
        })),
        ...[-5.5, 5.5].map(x => ({
          from: [x, 8.25, 12], to: [x, 8.25, -12],
          sag: .8, spacing: 1, lanternSpacing: 2.65, figureSpacing: 7.2,
        })),
      ],
    });
    root.add(group); sections.push(group);
    if (hasBridge) {
      const bridge = createSceneryModel('Baana road bridge');
      bridge.box('#c0c2b0', 0, 7.1, 0, 19, .85, 4.8);
      bridge.box('#515f61', 0, 7.56, 0, 19, .08, 4.3);
      for (const side of [-1, 1]) {
        const rampRun = 4.05, rampDrop = 7.6 - STREET_Y;
        const ramp = new THREE.BoxGeometry(Math.hypot(rampRun, rampDrop), .09, 4.3);
        bridge.geometry(ASPHALT, ramp.rotateZ(-side * Math.atan2(rampDrop, rampRun))
          .translate(side * (9.5 + rampRun / 2), 7.56 - rampDrop / 2, 0));
        bridge.box('#abb3a4', side * 6.6, 3.4, 0, .7, 6.8, 5.2);
        for (let x = -8; x <= 8; x += 1.4) bridge.box('#73867e', x, 8.15, side * 2.3, .045, 1.15, .045);
        bridge.box('#73867e', 0, 8.7, side * 2.3, 19, .06, .06);
      }
      const object = bridge.finish({ vertexColors: true });
      group.add(object);
      const building = registerBuilding(object);
      buildings.push({ ...building, section: group, baseBounds: building.bounds.clone() });
    }
  }
  const traffic = createRunnerTraffic(root, 'Baana', baanaMap.runner);
  const finish = createRunnerFinish(root, 'Baana', BAANA_LENGTH);
  function updateRunner(state, viewPosition) {
    for (let i = 0; i < sections.length; i++) sections[i].position.z = ((i * 32 + state.distance + 128) % 160) - 128;
    // Only the parent section translates. The bridge's local bounds are fixed.
    for (const bridge of buildings) bridge.bounds.copy(bridge.baseBounds).translate(bridge.section.position);
    traffic.update(state, viewPosition);
    finish.update(state);
  }
  return { colliders: [], buildings, updateRunner, reset() { updateRunner({ distance: 0, elapsed: 0, traffic: [] }); } };
}
