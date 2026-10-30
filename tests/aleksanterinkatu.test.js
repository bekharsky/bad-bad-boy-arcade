import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';

registerHooks({ resolve(specifier, context, next) {
  if (specifier === 'three') specifier = new URL('../vendor/three-0.180.0/build/three.module.min.js', import.meta.url).href;
  if (specifier.startsWith('three/addons/')) specifier = new URL(`../vendor/three-0.180.0/examples/jsm/${specifier.slice(13)}`, import.meta.url).href;
  return next(specifier, context);
} });
globalThis.document = { createElement: () => ({ getContext: () => ({ fillRect() {}, fillText() {} }) }) };
const THREE = await import('three');
const { aleksanterinkatuMap, ALEKSI_LENGTH, ALEKSI_CROSSINGS } = await import('../maps/aleksanterinkatu.js');
const { baanaMap } = await import('../maps/baana.js');
const { senateSquareMap } = await import('../maps/senate-square.js');
const { maps, mapOrder } = await import('../maps/index.js');
const { createMapManager } = await import('../world/map-manager.js');
const { createCampaign, createWaveDirector } = await import('../waves.js');
const { createRunnerRun, TRAFFIC_CAPACITY, TRAM_LANES, trafficProfile } = await import('../runner/course.js');
const seeded = seed => () => ((seed = seed * 16807 % 2147483647) - 1) / 2147483646;

test('Aleksanterinkatu replaces Esplanadi between Kamppi and Senate Square, retaining old preview links', () => {
  assert.deepEqual(maps.map(map => map.id), ['harbor', 'baana', 'kamppi', 'aleksanterinkatu', 'senate-square']);
  assert.equal(mapOrder('esplanadi')[0].id, 'aleksanterinkatu');
  assert.deepEqual(mapOrder('aleksanterinkatu').map(map => map.id), ['aleksanterinkatu', 'senate-square', 'harbor', 'baana', 'kamppi']);
  const campaign = createCampaign(maps.map(map => map.id)), entered = [];
  const waves = createWaveDirector({ campaign, onWave: plan => entered.push(plan), onReinforcements() {} });
  waves.start();
  for (let wave = 2; wave <= 4; wave++) waves.update(1.4, 0);
  waves.completeMap();
  for (let wave = 8; wave <= 10; wave++) waves.update(1.4, 0);
  assert.equal(entered.at(-1).mapId, 'aleksanterinkatu');
  waves.completeMap();
  assert.equal(entered.at(-1).number, 13);
  assert.equal(entered.at(-1).mapId, 'senate-square');
});

test('the tram course has exactly two bounded lanes while Baana retains three', () => {
  const run = createRunnerRun(aleksanterinkatuMap.runner);
  assert.deepEqual(run.lanes, TRAM_LANES);
  assert.equal(run.state.x, -2.2);
  for (let i = 0; i < 10; i++) run.dodge(1);
  run.update(.4); assert.equal(run.state.x, 2.2); assert.equal(run.state.lane, 1);
  for (let i = 0; i < 10; i++) run.dodge(-1);
  run.update(.4); assert.equal(run.state.x, -2.2); assert.equal(run.state.lane, 0);
  assert.deepEqual(createRunnerRun(baanaMap.runner).lanes, [-3, 0, 3]);
  assert.throws(() => createRunnerRun({ lanes: [0] }), /lanes/);
  assert.throws(() => createRunnerRun({ lanes: [2, -2] }), /lanes/);
});

// Use only the information a player can see: longitudinal traffic and the
// direction of each warned side-street approach. No invulnerability or kills.
function steer(run) {
  const state = run.state;
  const next = state.traffic.filter(a => !a.crossing && a.progress - state.distance > -trafficProfile(a.kind).depth - .6).sort((a, b) => a.progress - b.progress)[0];
  const crossing = state.crossings.find(c => (c.phase === 'warning' || c.phase === 'crossing') && c.progress - state.distance > -4);
  const closeTraffic = next && next.progress - state.distance < (state.speed + next.speed) * .75 + trafficProfile(next.kind).depth;
  if (crossing && !closeTraffic) { run.dodge((crossing.side < 0 ? 1 : 0) - state.lane); return; }
  if (next) run.dodge(next.safeLane - state.lane);
}

test('two-lane tram and cross-scooter traffic leaves a complete safe route across frame rates', () => {
  for (const fps of [15, 30, 60, 120]) for (const seed of [1, 42, 819, 17, 113]) {
    const run = createRunnerRun({ ...aleksanterinkatuMap.runner, random: seeded(seed) });
    const kinds = new Set(), sideWarnings = new Set(); let hits = 0, warnings = 0, crosses = 0;
    const seen = new Set();
    while (!run.state.finished) {
      steer(run);
      const result = run.update(1 / fps); hits += result.hits;
      if (result.warning) { warnings++; sideWarnings.add(result.warning.includes('LEFT') ? 'left' : 'right'); }
      for (const agent of run.state.traffic) {
        kinds.add(agent.kind);
        if (agent.crossing && !seen.has(agent.id)) { seen.add(agent.id); crosses++; }
      }
      assert.ok(run.state.traffic.length <= TRAFFIC_CAPACITY);
    }
    assert.equal(hits, 0, `${fps} FPS, seed ${seed}`);
    assert.equal(run.state.distance, ALEKSI_LENGTH);
    assert.deepEqual([...kinds].sort(), ['bike', 'scooter', 'tram']);
    assert.equal(warnings, ALEKSI_CROSSINGS.length);
    assert.equal(crosses, ALEKSI_CROSSINGS.length * 2);
    assert.deepEqual([...sideWarnings].sort(), ['left', 'right']);
  }
});

test('trams collide along their full length and cannot be destroyed by spray', () => {
  const run = createRunnerRun({ ...aleksanterinkatuMap.runner, tramChance: 1, crossingPoints: [], random: () => .2 });
  run.update(.01);
  const tram = run.state.traffic[0]; assert.equal(tram.kind, 'tram');
  Object.assign(tram, { lane: run.state.lane, x: run.state.x, progress: run.state.distance + 8.1 });
  for (let i = 0; i < 100; i++) assert.equal(run.sprayHit(tram.id, { damage: 100 }), false);
  assert.equal(tram.alive, true);
  assert.equal(run.update(.02).hits, 1, 'The front contacts before the tram centre reaches the hero');
  assert.equal(run.state.bonus, 0);
});

test('a fast lateral crossing uses swept contact, is shootable and resets with the round', () => {
  const run = createRunnerRun({ ...aleksanterinkatuMap.runner, tramChance: 0, random: () => .2 });
  const agent = { id: -1, kind: 'scooter', color: 'red', crossing: true, vx: 100, x: -5, progress: 0, speed: 0, hp: .4, alive: true, hit: false, passed: false, hitUntil: 0, size: .7, hitHeight: 1.2 };
  run.state.traffic.push(agent);
  assert.equal(run.update(.05).hits, 1, 'Crossing the hero between frames still hits');
  assert.equal(run.sprayHit(-1), true);
  assert.equal(run.sprayHit(-1), false);
  run.reset();
  assert.equal(run.state.traffic.length, 0);
  assert.ok(run.state.crossings.every(c => c.phase === 'approach' && c.launched === 0));
  const elapsed = run.state.elapsed; run.update(0); assert.equal(run.state.elapsed, elapsed);
});

test('facades frame real cross-street openings; traffic geometry and material count stay bounded', () => {
  const map = aleksanterinkatuMap.create(), run = createRunnerRun({ ...aleksanterinkatuMap.runner, random: seeded(42) });
  const city = map.root.getObjectByName('Aleksanterinkatu street');
  const facades = city.children.filter(node => node.name === 'Aleksi ornate facade');
  assert.ok(facades.length > 35);
  const squares = city.children.filter(node => node.name === 'Aleksi crossing square');
  assert.equal(squares.length, ALEKSI_CROSSINGS.length);
  assert.deepEqual(squares.map(node => -node.position.z), ALEKSI_CROSSINGS);
  const lamps = city.children.filter(node => node.name === 'Aleksi suspended lamp');
  assert.ok(lamps.length > 20);
  assert.equal(new Set(lamps.map(node => node.geometry)).size, 1);
  assert.ok(lamps.filter(node => node.position.z >= 0).every(node => !node.visible), 'Foreground lamps do not hide gameplay');
  const resources = new Set(); map.root.traverse(node => { if (node.geometry) resources.add(node.geometry); if (node.material) resources.add(node.material); });
  for (let i = 0; i < 100; i++) { steer(run); run.update(.5); map.updateRunner(run.state); }
  const after = new Set(); map.root.traverse(node => { if (node.geometry) after.add(node.geometry); if (node.material) after.add(node.material); });
  assert.deepEqual(after, resources);
  const pool = map.root.children.filter(node => node.name === 'Aleksanterinkatu traffic');
  assert.equal(pool.length, TRAFFIC_CAPACITY);
  assert.ok(pool.every(node => node.children.some(variant => variant.name === 'tram tram')));
  map.reset(); assert.ok(pool.every(node => !node.visible));
  map.dispose();
});

test('the complete tram body blocks liquid and map switches release every owned resource once', () => {
  const scene = new THREE.Scene(), world = createMapManager(scene, [baanaMap, aleksanterinkatuMap, senateSquareMap], .736);
  world.activate('baana'); assert.equal(world.runner.lanes, undefined);
  world.activate('aleksanterinkatu'); assert.deepEqual(world.runner.lanes, TRAM_LANES);
  const root = scene.children[0], resources = new Set(), disposals = new Map();
  root.traverse(node => { if (node.geometry) resources.add(node.geometry); if (node.material) resources.add(node.material); });
  for (const resource of resources) resource.addEventListener('dispose', () => disposals.set(resource, (disposals.get(resource) ?? 0) + 1));
  const state = { elapsed: 1, distance: 0, traffic: [{ id: 1, kind: 'tram', color: 'tram', lane: 0, x: -2.2, z: -10, progress: 10, speed: 7.5, alive: true }] };
  world.updateRunner(state);
  assert.equal(world.lineClear3D({ x: -2.2, y: 1.4, z: 0 }, { x: -2.2, y: 1.4, z: -4 }), false);
  assert.equal(world.lineClear3D({ x: 2.2, y: 1.4, z: 0 }, { x: 2.2, y: 1.4, z: -14 }), true);
  // The live state moves before its next draw call; collision must follow it.
  state.elapsed++; state.traffic[0].z = -30; state.traffic[0].progress = 30;
  assert.equal(world.lineClear3D({ x: -2.2, y: 1.4, z: 0 }, { x: -2.2, y: 1.4, z: -4 }), true);
  world.activate('senate-square');
  assert.equal(world.mode, 'arena'); assert.equal(world.runner, undefined);
  assert.equal(disposals.size, resources.size); assert.ok([...disposals.values()].every(count => count === 1));
  world.dispose();
});
