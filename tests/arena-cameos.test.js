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
const { createGameCamera } = await import('../world/game-camera.js');

function fixture() {
  const scene = new THREE.Scene(), player = { x: 0, z: 0, hp: 5, radius: .7 };
  const world = { ...createNavigation({ bounds: { minX: -25, maxX: 25, minZ: -25, maxZ: 25 } }), mode: 'arena',
    pedestrianRoutes: [-4, 0, 4, 8].map(x => [[x, -6], [x, 1]]) };
  const cameos = createArenaCameos(scene, world, () => 0); cameos.reset();
  return { scene, world, player, cameos };
}

test('passers-by walk towards the square and stay calm close to the player', () => {
  const { player, cameos } = fixture();
  assert.deepEqual(cameos.actors.map(actor => actor.kind), ['purra', 'orpo', 'marin', 'stubb']);
  const walker = cameos.actors[1];
  player.z = -4;
  const plans = [], enemies = [];
  const waves = createWaveDirector({ campaign: createCampaign(['harbor']), onWave: plan => plans.push(plan.number), onReinforcements() {} });
  waves.start();
  for (let i = 0; i < 120; i++) { cameos.update(1 / 60, player); waves.update(1 / 60, enemies.length); }
  assert.ok(walker.z > -6 && walker.z < -5.3, 'A pedestrian approaches but leaves room for the player');
  player.x = 3;
  for (let i = 0; i < 90; i++) cameos.update(1 / 60, player);
  assert.ok(walker.z > -4, 'A pedestrian resumes the route after the path clears');
  for (const actor of cameos.actors) {
    assert.equal(actor.fleeing, false);
    assert.equal(actor.civilian, true); assert.equal(actor.alive, true);
  }
  assert.equal(player.hp, 5); assert.deepEqual(plans, [1, 2]);
  assert.equal(cameos.actors.length, 4, 'The next wave needs no civilian to be sprayed');
  cameos.dispose();
});

test('the second arena wave brings fresh guests through clear entrances', () => {
  const { cameos, player } = fixture();
  const first = [...cameos.actors];
  cameos.nextWave();
  assert.equal(cameos.actors.length, 4, 'Occupied entrances are skipped');
  for (let frame = 0; frame < 240; frame++) cameos.update(1 / 60, player);
  cameos.nextWave();
  assert.deepEqual(cameos.actors.slice(0, 4), first);
  assert.equal(new Set(cameos.actors.map(actor => actor.kind)).size, 6);
  cameos.nextWave();
  assert.equal(cameos.actors.length, 6);
  cameos.dispose();
});

test('a politician repeatedly runs up, watches the hero, and backs off without contact', () => {
  const { player, cameos } = fixture();
  player.z = 6;
  const guest = cameos.actors[1], phases = [];
  for (let frame = 0; frame < 1200; frame++) {
    const oldDistance = Math.hypot(guest.x - player.x, guest.z - player.z);
    const phase = guest.phase;
    cameos.update(1 / 60, player, { x: 20, z: -5 });
    const engaging = cameos.actors.filter(actor => actor.phase === 'approach' || actor.phase === 'watch');
    assert.ok(engaging.length <= 2);
    if (guest.phase !== phase) phases.push(guest.phase);
    const distance = Math.hypot(guest.x - player.x, guest.z - player.z);
    assert.ok(distance >= guest.standoff - 1e-8);
    if (guest.phase === phase && phase === 'approach') assert.ok(distance < oldDistance);
    if (guest.phase === phase && phase === 'retreat') assert.ok(distance > oldDistance);
    if (phase === 'watch') assert.ok(Math.abs(guest.heading) < .1, 'The guest looks at the hero');
  }
  assert.deepEqual(phases.slice(0, 8), ['lookout', 'approach', 'watch', 'retreat', 'lookout', 'approach', 'watch', 'retreat']);
  assert.equal(player.hp, 5);
  cameos.dispose();
});

test('Central Station guests can repeat the approach from their routes while the hero stays at spawn', () => {
  const scene = new THREE.Scene(), world = createMapManager(scene, maps);
  world.activate('central-station');
  const cameos = createArenaCameos(scene, world, () => .95);
  const player = { ...world.spawn, hp: 5, radius: .74, root: new THREE.Group() };
  cameos.reset();
  const firstGuests = [...cameos.actors], visits = new Map();
  for (let frame = 0; frame < 44 * 60; frame++) {
    const phases = firstGuests.map(actor => actor.phase);
    world.update(1 / 60, [player, ...cameos.actors]);
    cameos.update(1 / 60, player);
    firstGuests.forEach((actor, i) => {
      if (actor.phase === 'approach' && phases[i] !== 'approach') visits.set(actor, (visits.get(actor) ?? 0) + 1);
    });
  }
  assert.ok([...visits.values()].some(count => count >= 2));
  assert.equal(player.hp, 5);
  cameos.dispose(); world.dispose();
});

test('splashing is optional and only triggers a temporary reaction, never a kill', () => {
  const { scene, world, player, cameos } = fixture();
  const actor = cameos.actors[1], emitter = new THREE.Object3D();
  cameos.update(1, player);
  emitter.position.set(actor.x, 1.25, 0);
  let hits = 0;
  const liquid = createLiquidStream(scene, world, (target, direction) => { hits++; cameos.splash(target, direction); }, { refraction: false });
  for (let i = 0; i < 240; i++) liquid.update(1 / 60, true, emitter, { dx: 0, dz: -1 }, [actor]);
  assert.ok(hits > 0); assert.ok(actor.panic > 0);
  const oldZ = actor.z;
  player.z = oldZ - 2;
  for (let i = 0; i < 30; i++) cameos.update(1 / 60, player);
  assert.equal(actor.fleeing, true);
  assert.ok(actor.z < oldZ - 1, 'The spray sends the pedestrian away from its incoming direction');
  for (let i = 0; i < 100; i++) cameos.splash(actor, { x: 0, z: -1 });
  assert.equal(actor.alive, true); assert.equal(cameos.actors.length, 4); assert.equal(player.hp, 5);
  cameos.update(2, { ...player, x: 20, z: 20 });
  assert.equal(actor.flash, 0); assert.equal(actor.panic, 0);
  liquid.clear(); cameos.dispose();
});

test('pause, restart and switching to a runner reuse the pool without stale actors or resource leaks', () => {
  const { scene, world, player, cameos } = fixture(), resources = new Set();
  scene.traverse(node => { if (node.geometry) resources.add(node.geometry); for (const material of [node.material].flat().filter(Boolean)) resources.add(material); });
  const actor = cameos.actors[0], before = [actor.x, actor.z, actor.gait];
  cameos.update(0, player); assert.deepEqual([actor.x, actor.z, actor.gait], before);
  cameos.splash(actor); actor.nextJetHit = 100;
  cameos.clear(); assert.equal(cameos.actors.length, 0); assert.equal(actor.root.visible, false); assert.equal(cameos.splash(actor), false);
  cameos.reset(); assert.equal(cameos.actors[0], actor); assert.equal(actor.nextJetHit, 0); assert.equal(actor.panic, 0);
  world.mode = 'runner'; cameos.reset(); assert.equal(cameos.actors.length, 0);
  world.mode = 'arena'; cameos.reset();
  scene.traverse(node => { if (node.geometry) assert.ok(resources.has(node.geometry)); for (const material of [node.material].flat().filter(Boolean)) assert.ok(resources.has(material)); });
  const disposals = new Map();
  for (const resource of resources) resource.addEventListener('dispose', () => disposals.set(resource, (disposals.get(resource) ?? 0) + 1));
  cameos.dispose(); cameos.dispose();
  assert.equal(disposals.size, resources.size); assert.ok([...disposals.values()].every(count => count === 1));
});

test('each arena samples reachable passers-by and moving trams keep them clear', () => {
  let seed = 819;
  const random = () => (seed = seed * 16807 % 2147483647) / 2147483647;
  const scene = new THREE.Scene(), world = createMapManager(scene, maps), cameos = createArenaCameos(scene, world, random);
  for (const definition of maps.filter(map => map.mode !== 'runner')) {
    world.activate(definition.id);
    const player = { ...world.spawn, hp: 5, radius: .74, root: new THREE.Group() };
    const cameraRig = createGameCamera();
    cameraRig.frame(player.x, player.z, 0, true);
    for (const route of world.pedestrianRoutes) {
      const [[x, z]] = route;
      const from = cameraRig.camera.position;
      assert.equal(world.canStandAt(x, z, .6), true, definition.id);
      for (const offset of [-.45, 0, .45]) {
        assert.equal(world.lineClear3D(from, { x: x + offset, y: 3.1, z }, .015), false,
          definition.id + ' pedestrian entrance is hidden from the starting camera');
      }
      for (let i = 1; i < route.length; i++) {
        assert.equal(world.lineClear(...route[i - 1], ...route[i], .6), true, definition.id);
      }
    }
    const seen = new Set();
    for (let attempt = 0; attempt < 30; attempt++) {
      cameos.reset();
      assert.equal(cameos.actors.length, 4, definition.id);
      assert.equal(new Set(cameos.actors.map(actor => actor.kind)).size, 4);
      for (const actor of cameos.actors) seen.add(actor.kind);
    }
    for (const kind of CAMEO_KINDS) assert.ok(seen.has(kind), definition.id + ' ' + kind);
    let moved = 0, arrivals = 0, departures = 0;
    for (let frame = 0; frame < 3900; frame++) {
      world.update(1 / 60, [player, ...cameos.actors]);
      if (frame % 240 === 0) {
        const actor = cameos.actors[Math.floor(frame / 240) % cameos.actors.length];
        player.x = actor.x; player.z = actor.z;
      }
      const previous = new Map(cameos.actors.map(actor => [actor, [actor.x, actor.z]]));
      cameos.update(1 / 60, player);
      for (const actor of cameos.actors) {
        assert.equal(world.canStandAt(actor.x, actor.z, actor.size), true, `${definition.id}, ${actor.kind}, frame ${frame}`);
        const position = previous.get(actor);
        if (position) moved += Math.hypot(actor.x - position[0], actor.z - position[1]);
        else arrivals++;
      }
      departures += [...previous.keys()].filter(actor => !actor.alive).length;
      assert.ok(cameos.actors.length <= 8);
      if (frame === 899) assert.ok(arrivals >= 2, definition.id + ' brings in guests during the first wave');
    }
    assert.ok(moved > 20, `${definition.id}: civilians can move through the district`);
    assert.ok(departures > 0 && arrivals > 4, definition.id + ' keeps welcoming guests as others leave');
    assert.equal(player.hp, 5);
  }
  cameos.dispose(); world.dispose();
});
