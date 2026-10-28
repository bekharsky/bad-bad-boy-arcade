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
globalThis.document = { createElement: () => ({ getContext: () => ({ fillRect() {}, fillText() {} }) }) };
const THREE = await import('three');
const { kamppiSquareMap } = await import('../maps/kamppi-square.js');
const { maps, mapOrder } = await import('../maps/index.js');
const { createCampaign } = await import('../waves.js');
const { createMapManager } = await import('../world/map-manager.js');

test('Kamppi follows Senate Square, supports direct/debug starts and retains normal difficulty', () => {
  const campaign = createCampaign(maps.map(map => map.id));
  assert.equal(campaign.plan(11).mapId, 'kamppi');
  assert.equal(campaign.plan(16).mapId, 'harbor');
  assert.deepEqual(mapOrder('kamppi').map(map => map.id), ['kamppi', 'harbor', 'senate-square']);
  campaign.setStartingMap('kamppi');
  assert.deepEqual(campaign.plan(1), { number: 1, enemyCount: 8, healthBonus: 0, mapId: 'kamppi' });
});

test('Narinkkatori has open combat lanes, solid landmarks and visible perimeter markers', () => {
  const map = kamppiSquareMap.create();
  assert.equal(map.canStandAt(map.spawn.x, map.spawn.z, .736), true);
  for (const [x, z] of [[0, -14], [0, -6], [8, 0], [12, -5], [29, 4], [-16, 5], [0, 20.5], [0, -32]]) {
    assert.equal(map.canStandAt(x, z, .736), true, `Open lane at ${x}, ${z}`);
  }
  for (const [x, z] of [[-7, -24], [20, -4.5], [25.2, -5.4], [-27, -2], [-15, -7], [-20, 12]]) {
    assert.equal(map.canStandAt(x, z, .736), false, `Solid scenery at ${x}, ${z}`);
  }
  assert.equal(map.lineClear3D({ x: 18, y: 1, z: -4.5 }, { x: 26, y: 1, z: -4.5 }), false, 'The chapel blocks liquid');
  assert.equal(map.lineClear3D({ x: -10, y: 1, z: -16.5 }, { x: -7, y: 1, z: -16.5 }), true, 'Actors can pass under the mall canopy');
  assert.equal(map.lineClear3D({ x: 10, y: .4, z: 13 }, { x: 10, y: .4, z: 15 }), false);
  assert.equal(map.lineClear3D({ x: 10, y: 1.5, z: 13 }, { x: 10, y: 1.5, z: 15 }), true, 'Liquid clears the low bench');
  assert.ok(map.root.getObjectByName('Kamppi Square boundary'));
  for (const [x, z] of [[35, 0], [-35, 0], [0, -35], [0, 36]]) assert.equal(map.canStandAt(x, z, .736), false);
  map.dispose();
});

test('all nine Kamppi pickups are reachable by the full-size hero and eight stay hidden', () => {
  const map = kamppiSquareMap.create();
  const medkits = map.pickupPoints('medkit', .86), batteries = map.pickupPoints('battery', .86);
  assert.equal(medkits.length, 5); assert.equal(batteries.length, 4);
  for (const point of [...medkits, ...batteries]) {
    assert.equal(map.canStandAt(point.x, point.z, .86), true);
    map.routeTo(point.x, point.z);
    const actor = { ...map.spawn };
    for (let step = 0; step < 7000 && Math.hypot(actor.x - point.x, actor.z - point.z) > .5; step++) {
      const direction = map.chase(actor.x, actor.z, point.x, point.z), length = Math.hypot(direction.x, direction.z);
      if (!length) break;
      map.move(actor, direction.x / length * .05, direction.z / length * .05, .736);
    }
    assert.ok(Math.hypot(actor.x - point.x, actor.z - point.z) <= .5, `Reachable reward at ${point.x}, ${point.z}; route stopped at ${actor.x}, ${actor.z}; direction ${JSON.stringify(map.chase(actor.x, actor.z, point.x, point.z))}`);
  }
  for (const point of [...medkits.slice(1), ...batteries]) {
    assert.equal(map.lineClear(map.spawn.x, map.spawn.z, point.x, point.z, .1), false, `Hidden reward at ${point.x}, ${point.z}`);
  }
  map.dispose();
});

test('Simonkatu tram clears player and enemies, blocks liquid and resets with the map', () => {
  const map = kamppiSquareMap.create();
  const tram = map.root.getObjectByName('Helsinki tram');
  const actors = [{ x: 0, z: 20.5, radius: .736, root: new THREE.Group() }, { x: 0, z: 20.5, size: .52, alive: true, root: new THREE.Group() }];
  const crossing = () => map.lineClear3D({ x: 0, y: 1, z: 18 }, { x: 0, y: 1, z: 23 });
  assert.equal(tram.visible, false); assert.equal(crossing(), true);
  for (let i = 0; i < 16 * 60; i++) map.update(1 / 60, actors);
  assert.equal(tram.visible, true); assert.equal(crossing(), false);
  for (const actor of actors) {
    assert.ok(Math.abs(actor.z - 20.5) > 1.4);
    assert.equal(map.canStandAt(actor.x, actor.z, actor.radius ?? actor.size), true);
  }
  for (let i = 0; i < 11 * 60; i++) map.update(1 / 60, []);
  assert.equal(crossing(), true);
  map.reset(); assert.equal(tram.visible, false);
  map.dispose();
});

test('switching away from Kamppi releases landmark geometry and sign textures exactly once', () => {
  const scene = new THREE.Scene(), world = createMapManager(scene, maps, .736);
  world.activate('kamppi');
  const root = scene.children[0];
  for (const name of ['Kamppi shopping centre', 'Kamppi Chapel of Silence', 'Old Kamppi bus station', 'Entrepreneurs monument', 'Narinkkatori cafe terrace']) {
    assert.ok(root.getObjectByName(name), `${name} is present`);
  }
  const owned = new Set();
  root.traverse(node => {
    if (node.geometry) owned.add(node.geometry);
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
      if (!material) continue;
      owned.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) owned.add(value);
    }
  });
  const disposals = new Map();
  for (const resource of owned) resource.addEventListener('dispose', () => disposals.set(resource, (disposals.get(resource) ?? 0) + 1));
  world.activate('senate-square');
  assert.equal(root.parent, null); assert.equal(scene.children.length, 1);
  assert.equal(disposals.size, owned.size);
  assert.ok([...disposals.values()].every(count => count === 1));
  world.activate('kamppi');
  assert.equal(world.canStandAt(world.spawn.x, world.spawn.z, .736), true);
  assert.equal(scene.children[0].getObjectByName('Helsinki tram').visible, false);
  world.dispose();
});
