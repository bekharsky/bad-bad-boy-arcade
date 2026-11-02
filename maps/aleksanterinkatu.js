import * as THREE from 'three';
import { createMap } from '../world/map.js';
import { createSceneryModel as model } from './scenery-model.js';
import { createRunnerTraffic, createRunnerFinish } from '../runner/track-renderer.js';
import { TRAM_LANES, TRAFFIC_CAPACITY } from '../runner/course.js';
import { createAleksiLandmarks, createAleksiFacade as facade, remainingFacadeSpans } from './aleksi-landmarks.js';
import { createAleksiWaterfront, ALEKSI_SHORE, ALEKSI_TRAM_TURN, aleksiTramRoute } from './aleksi-waterfront.js';
import { TRAM_CAR_OFFSET, TRAM_CAR_HALF_LENGTH, TRAM_CAR_HALF_WIDTH } from '../runner/tram-route.js';
import { createAleksiPaving } from './aleksi-paving.js';

export const ALEKSI_LENGTH = 640;
export const ALEKSI_CROSSINGS = Object.freeze([140, 280, 420, 560]);
// The cross streets own the road surface within these spans. Splitting the
// longitudinal road and pavements prevents coplanar surfaces from flickering.
export function aleksiRoadSpans(from, to) {
  let start = from; const spans = [];
  for (const crossing of ALEKSI_CROSSINGS) {
    const a = Math.max(from, crossing - 6), b = Math.min(to, crossing + 6);
    if (a >= b) continue;
    if (start < a) spans.push([start, a]);
    start = b;
  }
  if (start < to) spans.push([start, to]);
  return spans;
}
export const aleksanterinkatuMap = {
  id: 'aleksanterinkatu', name: 'Aleksanterinkatu', mode: 'runner',
  runner: { length: ALEKSI_LENGTH, variety: true, lanes: TRAM_LANES, tramChance: .42, tramRoute: aleksiTramRoute, roadworkKinds: [], crossingPoints: ALEKSI_CROSSINGS, startSpeed: 10.5, speedLimit: 18, acceleration: .12 },
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

function junction(progress, index, paving) {
  const m = model('Aleksi crossing square');
  paving.rectangle('square', 90, 40, 0, -progress, .01);
  paving.rectangle('road', 90, 12, 0, -progress, .04);
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
    const object = arrow.finish({ vertexColors: true });
    object.children[0].material.transparent = true; object.children[0].material.depthWrite = false;
    root.add(object); object.visible = false; arrows.push(object);
  }
  const targets = [];
  for (let index = 0; index < 2; index++) {
    const hint = model('Scooter crossing lane marker');
    hint.geometry('#ffd35e', new THREE.RingGeometry(.94, 1.05, 16).rotateX(-Math.PI / 2).translate(0, .096, 0));
    for (const x of [-.38, .38]) for (const z of [-.35, .35]) rod(hint, '#ffd35e', [x - .2, .1, z], [x + .2, .1, 0], .055);
    const object = hint.finish({ vertexColors: true });
    object.children[0].material.transparent = true; object.children[0].material.depthWrite = false;
    object.children[0].material.emissive.set('#ffd35e'); object.children[0].material.emissiveIntensity = .6;
    object.visible = false; root.add(object); targets.push(object);
  }
  return { root, arrows, targets };
}

function buildAleksi(root) {
  const city = new THREE.Group(); city.name = 'Aleksanterinkatu street'; root.add(city);
  const paving = createAleksiPaving();
  const lamps = [], lampModel = model('Aleksi suspended lamp');
  rod(lampModel, '#596c62', [0, 7.7, 0], [0, 6.8, 0], .035);
  lampModel.geometry('#426a58', new THREE.CylinderGeometry(.18, .46, .36, 12).translate(0, 6.65, 0));
  lampModel.geometry('#e1d9af', new THREE.CylinderGeometry(.4, .4, .06, 12).translate(0, 6.43, 0));
  const lampTemplate = lampModel.finish({ vertexColors: true }).children[0];
  const ground = model('Aleksi cobbles rails and overhead wires');
  ground.box('#b4aa94', 0, -.17, -(ALEKSI_SHORE - 60) / 2, 110, .2, ALEKSI_SHORE + 60);
  paving.rectangle('square', 110, ALEKSI_SHORE + 60, 0, -(ALEKSI_SHORE - 60) / 2, -.068);
  for (const [from, to] of aleksiRoadSpans(-60, 642)) {
    paving.rectangle('road', 12, to - from, 0, -(from + to) / 2, .04);
    for (const side of [-1, 1]) {
      paving.rectangle('walk', 2.4, to - from, side * 7.2, -(from + to) / 2, .12);
      ground.box('#a4a79d', side * 6, .075, -(from + to) / 2, .18, .09, to - from);
      for (let progress = from + 4; progress < to - 2; progress += 9) {
        ground.box('#616e69', side * 5.76, .049, -progress, .32, .012, .7);
        for (let n = -2; n <= 2; n++) ground.box('#9ba39a', side * 5.76, .057, -progress + n * .12, .27, .006, .035);
      }
    }
  }
  for (const lane of TRAM_LANES) for (const offset of [-.76, .76]) {
    ground.box('#47524f', lane + offset, .055, (40 - ALEKSI_TRAM_TURN.start) / 2, .18, .025, ALEKSI_TRAM_TURN.start + 40);
    ground.box('#b0bab5', lane + offset, .073, (40 - ALEKSI_TRAM_TURN.start) / 2, .065, .025, ALEKSI_TRAM_TURN.start + 40);
  }
  for (const lane of TRAM_LANES) rod(ground, '#4c6159', [lane, 5.12, 40], [lane, 5.12, -ALEKSI_TRAM_TURN.start], .018);
  for (let z = 12; z > -642; z -= 24) {
    // At the open waterfront, poles take over from the facade wire anchors.
    if (z < -580) for (const x of [-9, 9]) {
      rod(ground, '#596c62', [x, 0, z], [x, 10.6, z], .07);
    }
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
  const squares = ALEKSI_CROSSINGS.map((progress, index) => junction(progress, index, paving));
  for (const square of squares) city.add(square.root);
  const intervals = [[-40, 120], [160, 260], [300, 400], [440, 540], [580, 680]];
  let variant = 0;
  for (const [from, to] of intervals) for (const side of [-1, 1]) {
    for (const [start, end] of remainingFacadeSpans(side, from, to)) {
      const count = Math.ceil((end - start) / 23), depth = (end - start) / count;
      for (let i = 0; i < count; i++) {
        const building = facade(side, start + (i + .5) * depth, depth, variant++);
        Object.assign(building.userData, { side, routeFrom: start + i * depth, routeTo: start + (i + 1) * depth });
        city.add(building);
      }
    }
  }
  const waterfront = createAleksiWaterfront(paving);
  city.add(...createAleksiLandmarks(), waterfront.root, paving.finish());
  const traffic = createRunnerTraffic(root, 'Aleksanterinkatu', aleksanterinkatuMap.runner);
  const finish = createRunnerFinish(root, 'Aleksanterinkatu', ALEKSI_LENGTH);
  let currentState = { distance: 0, elapsed: 0, traffic: [], crossings: [] }, colliderTime = -1;
  const tramColliders = [], colliderPool = Array.from({ length: TRAFFIC_CAPACITY * 2 }, () => ({ minX: 0, maxX: 0, minZ: 0, maxZ: 0, height: 3.2 }));
  const tramPose = {};
  function dynamicColliders() {
    if (colliderTime !== currentState.elapsed) {
      colliderTime = currentState.elapsed; tramColliders.length = 0;
      for (const agent of currentState.traffic) if (agent.kind === 'tram' && !agent.cleared) {
        for (const offset of [-TRAM_CAR_OFFSET, TRAM_CAR_OFFSET]) {
          aleksiTramRoute(agent.progress + offset, TRAM_LANES[agent.lane], tramPose);
          const c = colliderPool[tramColliders.length], s = Math.abs(Math.sin(tramPose.heading)), cos = Math.abs(Math.cos(tramPose.heading));
          const halfX = TRAM_CAR_HALF_WIDTH * cos + TRAM_CAR_HALF_LENGTH * s, halfZ = TRAM_CAR_HALF_LENGTH * cos + TRAM_CAR_HALF_WIDTH * s;
          c.minX = tramPose.x - halfX; c.maxX = tramPose.x + halfX;
          c.minZ = currentState.distance + tramPose.z - halfZ; c.maxZ = currentState.distance + tramPose.z + halfZ;
          tramColliders.push(c);
        }
      }
    }
    return tramColliders;
  }
  function updateRunner(state) {
    if (state !== currentState) colliderTime = -1;
    currentState = state;
    city.position.z = state.distance;
    waterfront.update(state.elapsed);
    // Fade nearby hanging lamps before they can conceal a rider or the hero
    // under the following camera. Geometry stays shared across all fixtures.
    for (const lamp of lamps) {
      lamp.material.opacity = THREE.MathUtils.clamp(-(state.distance + lamp.position.z) / 8, 0, 1);
      lamp.visible = lamp.material.opacity > .005;
    }
    for (let i = 0; i < squares.length; i++) {
      const event = state.crossings?.[i];
      for (let side = 0; side < 2; side++) {
        const arrow = squares[i].arrows[side];
        arrow.visible = !!event && (event.phase === 'warning' || event.phase === 'crossing') && (event.side < 0 ? side === 0 : side === 1);
        arrow.children[0].material.opacity = .75 + Math.sin(state.elapsed * 5) * .25;
      }
      for (const [index, marker] of squares[i].targets.entries()) {
        const pass = event?.passes?.[index];
        const active = event && (event.phase === 'warning' || event.phase === 'crossing');
        const expiry = pass ? pass.launchAt + Math.abs(event.side * 14 - TRAM_LANES[pass.targetLane]) / pass.speed + .25 : 0;
        marker.visible = !!pass && active && state.elapsed < expiry && state.distance < pass.progress + 2;
        if (marker.visible) {
          marker.position.set(TRAM_LANES[pass.targetLane], 0, event.progress - pass.progress);
          marker.scale.x = event.side < 0 ? 1 : -1;
          const first = event.passes[0], firstExpiry = first.launchAt + Math.abs(event.side * 14 - TRAM_LANES[first.targetLane]) / first.speed + .25;
          marker.children[0].material.opacity = index === 0 || state.elapsed >= firstExpiry ? .75 + Math.sin(state.elapsed * 5) * .2 : .4;
        }
      }
    }
    traffic.update(state); finish.update(state);
  }
  return { colliders: [], dynamicColliders, updateRunner, reset() { colliderTime = -1; updateRunner({ distance: 0, elapsed: 0, traffic: [], crossings: [] }); } };
}
