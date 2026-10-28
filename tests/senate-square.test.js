import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import test from 'node:test';

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'three') specifier = new URL('../vendor/three-0.180.0/build/three.module.min.js', import.meta.url).href;
    if (specifier.startsWith('three/addons/')) specifier = new URL(`../vendor/three-0.180.0/examples/jsm/${specifier.slice(13)}`, import.meta.url).href;
    return nextResolve(specifier, context);
  },
});
globalThis.document = {
  createElement: () => ({ getContext: () => ({ fillRect() {}, strokeRect() {}, fillText() {}, measureText: text => ({ width: text.length * 24 }) }) }),
};
const THREE = await import('three');
const { senateSquareMap } = await import('../maps/senate-square.js');
const { harborMap } = await import('../maps/harbor.js');
const { maps, mapOrder } = await import('../maps/index.js');
const { createCampaign } = await import('../waves.js');
const { createMapManager } = await import('../world/map-manager.js');
const { createGameCamera } = await import('../world/game-camera.js');

function heroProjection(camera, spawn) {
  camera.updateMatrixWorld(true);
  const foot = new THREE.Vector3(spawn.x, 0, spawn.z).project(camera);
  const head = new THREE.Vector3(spawn.x, 3.45, spawn.z).project(camera);
  return { height: head.y - foot.y, footY: foot.y, fov: camera.fov };
}

test('switching between actual districts preserves hero size, screen position and lens on desktop and touch', () => {
  for (const [width, height, touch] of [[1280, 720, false], [577, 774, true], [844, 390, true]]) {
    const scene = new THREE.Scene(), world = createMapManager(scene, maps, .736), rig = createGameCamera();
    rig.resize(width, height, touch);
    let previous;
    for (const id of ['harbor', 'baana', 'kamppi', 'senate-square', 'harbor']) {
      world.activate(id);
      rig.frame(world.spawn.x, world.spawn.z, 0, true);
      const next = heroProjection(rig.camera, world.spawn);
      if (previous) {
        assert.ok(Math.abs(previous.height - next.height) < 1e-10, 'A map transition must not zoom the hero');
        assert.ok(Math.abs(previous.footY - next.footY) < 1e-10, 'A map transition must not tilt the view');
        assert.equal(previous.fov, next.fov, 'The lens belongs to the viewport, not the map');
      }
      previous = next;
    }
    world.dispose();
  }
});

test('the common scale falls between the previous close harbor and distant square views', () => {
  const spawn = { x: 0, z: 0 };
  for (const [width, height, touch] of [[1280, 720, false], [577, 774, true]]) {
    const oldSize = (y, distance, lookHeight, ahead, fov) => {
      const camera = new THREE.PerspectiveCamera(fov, width / height, .1, 150);
      camera.position.set(0, y, distance); camera.lookAt(0, lookHeight, -ahead);
      return heroProjection(camera, spawn).height;
    };
    const close = oldSize(10, 12, 1.38, 0, touch ? 56 : 47);
    const distant = oldSize(14, 18, 3.2, 11, 58);
    const rig = createGameCamera(); rig.resize(width, height, touch); rig.frame(0, 0, 0, true);
    const size = heroProjection(rig.camera, spawn).height;
    assert.ok(size > distant && size < close, 'Use an intermediate view in both districts');
  }
});

test('Senate Square is the fourth district and direct links preserve the new campaign order', () => {
  const campaign = createCampaign(maps.map(map => map.id));
  assert.equal(campaign.plan(1).mapId, 'harbor');
  assert.equal(campaign.plan(4).mapId, 'baana');
  assert.equal(campaign.plan(7).mapId, 'kamppi');
  assert.equal(campaign.plan(10).mapId, 'senate-square');
  assert.equal(campaign.plan(13).mapId, 'harbor');
  assert.deepEqual(mapOrder('senate-square').map(map => map.id), ['senate-square', 'harbor', 'baana', 'kamppi']);
  assert.deepEqual(mapOrder('unknown'), maps);
  assert.equal(maps[0].id, 'harbor', 'Previewing never mutates the campaign registry');
});

test('Senate Square has walkable combat aisles and blocks stalls, the monument and raised steps', () => {
  const map = senateSquareMap.create();
  const { x, z } = map.spawn;
  assert.equal(map.canStandAt(x, z, .736), true);
  for (const point of [[-11, -10], [11, -10], [-21, 0], [21, 0], [0, 7], [0, -13]]) {
    assert.equal(map.canStandAt(...point, .736), true, `Combat aisle ${point} stays open`);
  }
  for (const point of [[0, -4.5], [17, 1], [-17, -10], [0, -18]]) {
    assert.equal(map.canStandAt(...point, .736), false, `Solid scenery at ${point} blocks actors`);
  }
  assert.equal(map.lineClear3D({ x: 14, y: 1, z: 1 }, { x: 20, y: 1, z: 1 }), false, 'Spray cannot pass through a stall');
  assert.equal(map.lineClear3D({ x: 14, y: 4, z: 1 }, { x: 20, y: 4, z: 1 }), true, 'Spray can pass above a stall');
  assert.equal(map.canStandAt(0, 34, .736), false);
  map.dispose();
});

test('all nine pickups are reachable around the merchant blocks and palaces', () => {
  const map = senateSquareMap.create();
  const medkits = map.pickupPoints('medkit', .86), batteries = map.pickupPoints('battery', .86);
  assert.equal(medkits.length, 5);
  assert.equal(batteries.length, 4);
  for (const point of [...medkits, ...batteries]) {
    assert.equal(map.canStandAt(point.x, point.z, .86), true);
    map.routeTo(point.x, point.z);
    const actor = { ...map.spawn };
    for (let i = 0; i < 5000 && Math.hypot(actor.x - point.x, actor.z - point.z) > .5; i++) {
      const step = map.chase(actor.x, actor.z, point.x, point.z), length = Math.hypot(step.x, step.z);
      if (!length) break;
      map.move(actor, step.x / length * .05, step.z / length * .05, .736);
    }
    assert.ok(Math.hypot(actor.x - point.x, actor.z - point.z) <= .5, `Pickup ${point.x}, ${point.z} is reachable by the full-size hero`);
  }
  for (const point of [...medkits.slice(1), ...batteries]) {
    assert.equal(map.lineClear(map.spawn.x, map.spawn.z, point.x, point.z, .1), false, 'Most rewards remain behind solid scenery');
  }
  map.dispose();
});

test('the square tram clears actors, blocks liquid while passing and resets its route', () => {
  const map = senateSquareMap.create();
  const tram = map.root.getObjectByName('Helsinki tram');
  const actors = [{ x: 0, z: 14.5, radius: .736, root: new THREE.Group() }, { x: 0, z: 14.5, size: .52, alive: true, root: new THREE.Group() }];
  const crossing = () => map.lineClear3D({ x: 0, y: 1, z: 11.5 }, { x: 0, y: 1, z: 17.5 });
  assert.equal(tram.visible, false);
  assert.equal(crossing(), true);
  for (let i = 0; i < 14.5 * 60; i++) map.update(1 / 60, actors);
  assert.equal(tram.visible, true);
  assert.equal(crossing(), false);
  for (const actor of actors) {
    assert.ok(Math.abs(actor.z - 14.5) > 1.4);
    assert.equal(map.canStandAt(actor.x, actor.z, actor.radius ?? actor.size), true);
  }
  for (let i = 0; i < 10 * 60; i++) map.update(1 / 60, []);
  assert.equal(crossing(), true);
  map.reset();
  assert.equal(tram.visible, false);
  assert.equal(map.canStandAt(map.spawn.x, map.spawn.z, .736), true);
  map.dispose();
});

test('the cathedral fits the shared camera and real map switches dispose their own geometry', () => {
  const scene = new THREE.Scene();
  const world = createMapManager(scene, maps, .736);
  world.activate('senate-square');
  const root = scene.children[0];
  for (const name of ['Helsinki Cathedral', 'Cathedral steps', 'Alexander II monument', 'Government Palace', 'University of Helsinki', 'Senate Square market rows']) {
    assert.ok(root.getObjectByName(name), `${name} is present`);
  }
  const church = root.getObjectByName('Helsinki Cathedral');
  const box = new THREE.Box3().setFromObject(church);
  assert.ok(box.max.y > 17, 'The cathedral rises above the town');
  const rig = createGameCamera();
  rig.resize(577, 774, true);
  rig.frame(world.spawn.x, world.spawn.z, 0, true);
  const { camera } = rig;
  camera.updateMatrixWorld(true);
  const top = new THREE.Vector3(0, box.max.y, -35).project(camera);
  assert.ok(top.y < .95 && top.y > -.9, 'The main dome stays in frame on a portrait screen');
  const geometry = church.children[0].geometry;
  let disposed = 0;
  geometry.addEventListener('dispose', () => disposed++);
  world.activate(harborMap.id);
  assert.equal(disposed, 1);
  assert.equal(root.parent, null);
  assert.equal(scene.children.length, 1);
  assert.equal(world.canStandAt(world.spawn.x, world.spawn.z, .736), true);
  world.dispose();
});
