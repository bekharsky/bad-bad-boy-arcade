import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import test from 'node:test';

registerHooks({ resolve(specifier, context, next) {
  if (specifier === 'three') specifier = new URL('../vendor/three-0.180.0/build/three.module.min.js', import.meta.url).href;
  if (specifier.startsWith('three/addons/')) specifier = new URL(`../vendor/three-0.180.0/examples/jsm/${specifier.slice(13)}`, import.meta.url).href;
  return next(specifier, context);
} });
globalThis.document = { createElement: () => ({ getContext: () => ({ fillRect() {}, strokeRect() {}, fillText() {}, measureText: text => ({ width: text.length * 24 }) }) }) };
const THREE = await import('three');
const { createArenaCameos } = await import('../arena-cameos.js');
const { CAMEO_KINDS } = await import('../runner/cameo-roster.js');
const { createNavigation } = await import('../world/navigation.js');
const { createMapManager } = await import('../world/map-manager.js');
const { maps } = await import('../maps/index.js');
const { createLiquidStream } = await import('../liquid.js');
const { createCampaign, createWaveDirector } = await import('../waves.js');

function fixture() {
  const scene = new THREE.Scene(), player = { x: 0, z: 0, hp: 5, radius: .7 };
  const world = { ...createNavigation({ bounds: { minX: -25, maxX: 25, minZ: -25, maxZ: 25 } }), mode: 'arena',
    spawnPoint: (_player, index) => ({ x: (index - 6) * 4, z: -6 }) };
  const cameos = createArenaCameos(scene, world); cameos.reset(player);
  return { scene, world, player, cameos };
}

test('all four civilians flee from a nearby player without damage or combat objectives', () => {
  const { player, cameos } = fixture();
  assert.deepEqual(cameos.actors.map(actor => actor.kind), ['purra', 'orpo', 'marin', 'stubb']);
  const distances = cameos.actors.map(actor => Math.hypot(actor.x, actor.z));
  const plans = [], enemies = [];
  const waves = createWaveDirector({ campaign: createCampaign(['harbor']), onWave: plan => plans.push(plan.number), onReinforcements() {} });
  waves.start();
  for (let i = 0; i < 120; i++) { cameos.update(1 / 60, player); waves.update(1 / 60, enemies.length); }
  for (const [index, actor] of cameos.actors.entries()) {
    assert.ok(Math.hypot(actor.x, actor.z) > distances[index] + 3);
    assert.equal(actor.civilian, true); assert.equal(actor.alive, true);
  }
  assert.equal(player.hp, 5); assert.deepEqual(plans, [1, 2]);
  assert.equal(cameos.actors.length, CAMEO_KINDS.length, 'The next wave needs no civilian to be sprayed');
  cameos.dispose();
});

test('splashing is optional and only triggers a temporary reaction, never a kill', () => {
  const { scene, world, player, cameos } = fixture();
  const actor = cameos.actors[1], emitter = new THREE.Object3D();
  emitter.position.set(actor.x, 1.25, 0);
  let hits = 0;
  const liquid = createLiquidStream(scene, world, target => { hits++; cameos.splash(target); }, { refraction: false });
  for (let i = 0; i < 240; i++) liquid.update(1 / 60, true, emitter, { dx: 0, dz: -1 }, [actor]);
  assert.ok(hits > 0); assert.ok(actor.panic > 0);
  for (let i = 0; i < 100; i++) cameos.splash(actor);
  assert.equal(actor.alive, true); assert.equal(cameos.actors.length, CAMEO_KINDS.length); assert.equal(player.hp, 5);
  cameos.update(2, { ...player, x: 20, z: 20 });
  assert.equal(actor.flash, 0); assert.equal(actor.panic, 0);
  liquid.clear(); cameos.dispose();
});

test('pause, restart and switching to a runner reuse the pool without stale actors or resource leaks', () => {
  const { scene, world, player, cameos } = fixture(), resources = new Set();
  scene.traverse(node => { if (node.geometry) resources.add(node.geometry); if (node.material) resources.add(node.material); });
  const actor = cameos.actors[0], before = [actor.x, actor.z, actor.gait];
  cameos.update(0, player); assert.deepEqual([actor.x, actor.z, actor.gait], before);
  cameos.splash(actor); actor.nextJetHit = 100;
  cameos.clear(); assert.equal(cameos.actors.length, 0); assert.equal(actor.root.visible, false); assert.equal(cameos.splash(actor), false);
  cameos.reset(player); assert.equal(cameos.actors[0], actor); assert.equal(actor.nextJetHit, 0); assert.equal(actor.panic, 0);
  world.mode = 'runner'; cameos.reset(player); assert.equal(cameos.actors.length, 0);
  world.mode = 'arena'; cameos.reset(player);
  scene.traverse(node => { if (node.geometry) assert.ok(resources.has(node.geometry)); if (node.material) assert.ok(resources.has(node.material)); });
  const disposals = new Map();
  for (const resource of resources) resource.addEventListener('dispose', () => disposals.set(resource, (disposals.get(resource) ?? 0) + 1));
  cameos.dispose(); cameos.dispose();
  assert.equal(disposals.size, resources.size); assert.ok([...disposals.values()].every(count => count === 1));
});

test('every arena spawns the full roster on reachable ground and moving trams keep them clear', () => {
  const scene = new THREE.Scene(), world = createMapManager(scene, maps), cameos = createArenaCameos(scene, world);
  for (const definition of maps.filter(map => map.mode !== 'runner')) {
    world.activate(definition.id);
    const player = { ...world.spawn, hp: 5, radius: .74, root: new THREE.Group() };
    cameos.reset(player); assert.equal(cameos.actors.length, CAMEO_KINDS.length, definition.id);
    let moved = 0;
    for (let frame = 0; frame < 900; frame++) {
      world.update(1 / 60, [player, ...cameos.actors]);
      if (frame % 240 === 0) {
        const actor = cameos.actors[Math.floor(frame / 240) % CAMEO_KINDS.length];
        player.x = actor.x; player.z = actor.z;
      }
      const previous = cameos.actors.map(actor => [actor.x, actor.z]);
      cameos.update(1 / 60, player);
      for (const [index, actor] of cameos.actors.entries()) {
        assert.equal(world.canStandAt(actor.x, actor.z, actor.size), true, `${definition.id}, ${actor.kind}, frame ${frame}`);
        moved += Math.hypot(actor.x - previous[index][0], actor.z - previous[index][1]);
      }
    }
    assert.ok(moved > 20, `${definition.id}: civilians can move through the district`);
    assert.equal(player.hp, 5);
  }
  cameos.dispose(); world.dispose();
});
