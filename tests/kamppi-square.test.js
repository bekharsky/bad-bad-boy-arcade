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
const { createCampaign, createWaveDirector } = await import('../waves.js');
const { createMapManager } = await import('../world/map-manager.js');

test('Kamppi follows Baana, supports direct/debug starts and retains normal difficulty', () => {
  const campaign = createCampaign(maps.map(map => map.id));
  assert.equal(campaign.plan(7).mapId, 'kamppi');
  assert.equal(campaign.plan(10).mapId, 'esplanadi');
  assert.equal(campaign.plan(13).mapId, 'senate-square');
  assert.deepEqual(mapOrder('kamppi').map(map => map.id), ['kamppi', 'esplanadi', 'senate-square', 'harbor', 'baana']);
  campaign.setStartingMap('kamppi');
  assert.deepEqual(campaign.plan(1), { number: 1, enemyCount: 8, healthBonus: 0, mapId: 'kamppi' });
});

test('Narinkkatori has open combat lanes, solid landmarks and visible perimeter markers', () => {
  const map = kamppiSquareMap.create();
  assert.equal(map.canStandAt(map.spawn.x, map.spawn.z, .736), true);
  for (const [x, z] of [[0, -14], [0, -6], [8, 0], [12, -5], [-32, 19], [33, 19], [0, 26], [0, 35], [35, 52], [0, 61.5], [0, -39]]) {
    assert.equal(map.canStandAt(x, z, .736), true, `Open lane at ${x}, ${z}`);
  }
  for (const [x, z] of [[0, -29], [-31.5, -12], [-28, 7.5], [-22.8, 6.6], [5, 19], [14, -8], [30, 9], [0, 52], [-27, 42], [27, 42], [-17, 35], [-10, 31.5]]) {
    assert.equal(map.canStandAt(x, z, .736), false, `Solid scenery at ${x}, ${z}`);
  }
  assert.equal(map.lineClear3D({ x: -34, y: 1, z: 7.5 }, { x: -20, y: 1, z: 7.5 }), false, 'The chapel blocks liquid');
  assert.equal(map.lineClear3D({ x: -10, y: 1, z: -19 }, { x: -7, y: 1, z: -19 }), true, 'Actors can pass under the mall canopy');
  assert.equal(map.lineClear3D({ x: -40, y: .4, z: -7 }, { x: -38.5, y: .4, z: -7 }), false);
  assert.equal(map.lineClear3D({ x: -40, y: 1.5, z: -7 }, { x: -38.5, y: 1.5, z: -7 }), true, 'Liquid clears the low bench');
  assert.equal(map.lineClear(-37.5, -23, -37.5, 20, .736), true, 'Seating and planting leave the chapel promenade clear');
  assert.ok(map.root.getObjectByName('Kamppi Square boundary'));
  for (const [x, z] of [[43, 0], [-43, 0], [0, -43], [0, 68.5]]) assert.equal(map.canStandAt(x, z, .736), false);
  map.dispose();
});

test('the chapel is left of the mall and Kasarmi, Lasipalatsi and tram form successive districts', () => {
  const map = kamppiSquareMap.create();
  const centre = name => new THREE.Box3().setFromObject(map.root.getObjectByName(name)).getCenter(new THREE.Vector3());
  const chapel = centre('Kamppi Chapel of Silence'), mall = centre('Kamppi shopping centre');
  const kasarmi = centre('Kulttuurikasarmi'), lasipalatsi = centre('Lasipalatsi'), clock = centre('Lasipalatsi clock tower');
  assert.ok(chapel.x < mall.x - 10, 'The chapel belongs on the left when facing the mall');
  assert.ok(Math.abs(chapel.z - map.spawn.z) < 3, 'The chapel is at the near end of Narinkkatori');
  assert.ok(clock.x < 0, 'The clock moves toward the chapel side of the courtyard');
  assert.equal(map.canStandAt(-22, -6.5, .736), true, 'The old chapel footprint no longer blocks walking');
  assert.equal(map.canStandAt(8, 38, .736), true, 'The old clock footprint no longer blocks walking');
  assert.ok(kasarmi.z > map.spawn.z && kasarmi.z - map.spawn.z < 15, 'The barracks sit close to the player');
  assert.ok(kasarmi.z < clock.z && clock.z < lasipalatsi.z, 'The clock courtyard sits behind Kasarmi');
  assert.ok(lasipalatsi.z < map.root.getObjectByName('Helsinki tram').position.z);
  const bounds = kamppiSquareMap.bounds;
  assert.ok((bounds.maxX - bounds.minX) * (bounds.maxZ - bounds.minZ) > 70 * 71 * 1.8, 'The playable footprint grows substantially');
  assert.ok(bounds.maxZ - map.root.getObjectByName('Helsinki tram').position.z < 10, 'The map ends just behind the tram corridor');
  const mallBounds = new THREE.Box3().setFromObject(map.root.getObjectByName('Kamppi shopping centre'));
  assert.ok(mallBounds.max.x - mallBounds.min.x > 54, 'The mall itself is larger too');
  map.dispose();
});

test('surrounding city stays outside combat bounds, keeps tram portals clear and fades around the camera', () => {
  const map = kamppiSquareMap.create(), city = map.root.getObjectByName('Kamppi surrounding city');
  assert.ok(city.children.length >= 10, 'Street walls surround the district');
  const bounds = kamppiSquareMap.bounds;
  for (const block of city.children) {
    const box = new THREE.Box3().setFromObject(block);
    assert.ok(box.max.x < bounds.minX || box.min.x > bounds.maxX || box.max.z < bounds.minZ || box.min.z > bounds.maxZ, `${block.name} stays outside the playable map`);
    assert.ok(box.max.z < 60.5 || box.min.z > 62.5, `${block.name} leaves the tram entry and exit clear`);
  }
  const camera = new THREE.PerspectiveCamera(56, 1, .1, 150), hero = new THREE.Group();
  hero.position.set(0, 0, 67); camera.position.set(0, 12, 82); camera.lookAt(0, 2, 67);
  map.updateVisibility(camera, hero, 3.45, 1);
  const sokos = city.getObjectByName('Sokos Helsinki backdrop');
  assert.ok(sokos.children.every(mesh => mesh.material.opacity < .2), 'The outside building cannot hide the player near the far edge');
  map.reset();
  assert.ok(sokos.children.every(mesh => mesh.material.opacity === 1));
  map.dispose();
});

test('both sides of Kasarmi connect the playable squares and the far tram edge', () => {
  const map = kamppiSquareMap.create();
  for (const point of [{ x: -22, z: 27 }, { x: 33, z: 27 }, { x: 0, z: 35 }, { x: 8, z: 43 }, { x: 35, z: 61.5 }, { x: -35, z: 61.5 }]) {
    map.routeTo(point.x, point.z);
    const actor = { ...map.spawn };
    for (let step = 0; step < 7000 && Math.hypot(actor.x - point.x, actor.z - point.z) > .5; step++) {
      const direction = map.chase(actor.x, actor.z, point.x, point.z), length = Math.hypot(direction.x, direction.z);
      if (!length) break;
      map.move(actor, direction.x / length * .05, direction.z / length * .05, .736);
    }
    assert.ok(Math.hypot(actor.x - point.x, actor.z - point.z) <= .5, `Walk to ${point.x}, ${point.z} stopped at ${actor.x}, ${actor.z}`);
  }
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

test('Mannerheimintie tram clears player and enemies, blocks liquid and resets with the map', () => {
  const map = kamppiSquareMap.create();
  const tram = map.root.getObjectByName('Helsinki tram');
  const actors = [{ x: 0, z: 61.5, radius: .736, root: new THREE.Group() }, { x: 0, z: 61.5, size: .52, alive: true, root: new THREE.Group() }];
  const crossing = () => map.lineClear3D({ x: 0, y: 1, z: 59 }, { x: 0, y: 1, z: 64 });
  assert.equal(tram.visible, false); assert.equal(crossing(), true);
  for (let i = 0; i < 17 * 60; i++) map.update(1 / 60, actors);
  assert.equal(tram.visible, true); assert.equal(crossing(), false);
  for (const actor of actors) {
    assert.ok(Math.abs(actor.z - 61.5) > 1.4);
    assert.equal(map.canStandAt(actor.x, actor.z, actor.radius ?? actor.size), true);
  }
  for (let i = 0; i < 11 * 60; i++) map.update(1 / 60, []);
  assert.equal(crossing(), true);
  map.reset(); assert.equal(tram.visible, false);
  map.dispose();
});

test('switching away from Kamppi releases landmark geometry and paving textures exactly once', () => {
  const scene = new THREE.Scene(), world = createMapManager(scene, maps, .736);
  world.activate('kamppi');
  const root = scene.children[0];
  for (const name of ['Kamppi shopping centre', 'Kamppi Chapel of Silence', 'Kulttuurikasarmi', 'Lasipalatsi', 'Lasipalatsi clock tower', 'Amos Rex skylight mound', 'Entrepreneurs monument', 'Narinkkatori cafe terrace']) {
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


test('the real campaign goes harbor → Baana → Kamppi → Esplanadi → Senate Square and loops after runner completion', () => {
  const campaign = createCampaign(maps.map(map => map.id)), entered = [];
  const director = createWaveDirector({ campaign, onWave: plan => entered.push([plan.number, plan.mapId]), onReinforcements() {} });
  director.start();
  for (let wave = 2; wave <= 4; wave++) director.update(1.4, 0);
  assert.deepEqual(entered.at(-1), [4, 'baana']);
  director.completeMap();
  assert.deepEqual(entered.at(-1), [7, 'kamppi']);
  for (let wave = 8; wave <= 10; wave++) director.update(1.4, 0);
  assert.deepEqual(entered.at(-1), [10, 'esplanadi']);
  director.completeMap();
  for (let wave = 14; wave <= 16; wave++) director.update(1.4, 0);
  assert.deepEqual(entered.filter(([wave]) => [1, 4, 7, 10, 13, 16].includes(wave)), [[1, 'harbor'], [4, 'baana'], [7, 'kamppi'], [10, 'esplanadi'], [13, 'senate-square'], [16, 'harbor']]);
  assert.deepEqual(mapOrder('baana').map(map => map.id), ['baana', 'kamppi', 'esplanadi', 'senate-square', 'harbor']);
});
