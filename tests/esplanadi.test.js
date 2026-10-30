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
const { esplanadiMap, ESPLANADI_LENGTH } = await import('../maps/esplanadi.js');
const { baanaMap } = await import('../maps/baana.js');
const { senateSquareMap } = await import('../maps/senate-square.js');
const { maps, mapOrder } = await import('../maps/index.js');
const { createMapManager } = await import('../world/map-manager.js');
const { createCampaign, createWaveDirector } = await import('../waves.js');
const { createRunnerRun, TRAFFIC_CAPACITY, trafficProfile } = await import('../runner/course.js');
const seeded = seed => () => ((seed = seed * 16807 % 2147483647) - 1) / 2147483646;

test('Esplanadi occupies its own runner block between Kamppi and Senate Square', () => {
  assert.deepEqual(maps.map(map => map.id), ['harbor', 'baana', 'kamppi', 'esplanadi', 'senate-square']);
  assert.deepEqual(mapOrder('esplanadi').map(map => map.id), ['esplanadi', 'senate-square', 'harbor', 'baana', 'kamppi']);
  const campaign = createCampaign(maps.map(map => map.id)), entered = [];
  const waves = createWaveDirector({ campaign, onWave: plan => entered.push(plan), onReinforcements() {} });
  waves.start();
  for (let wave = 2; wave <= 4; wave++) waves.update(1.4, 0);
  waves.completeMap();
  for (let wave = 8; wave <= 10; wave++) waves.update(1.4, 0);
  assert.equal(entered.at(-1).mapId, 'esplanadi');
  waves.completeMap();
  assert.equal(entered.at(-1).number, 13);
  assert.equal(entered.at(-1).mapId, 'senate-square');
  for (let wave = 14; wave <= 16; wave++) waves.update(1.4, 0);
  assert.equal(entered.at(-1).mapId, 'harbor');
});

test('the new course is finishable at several frame rates with cyclists and every roadwork type', () => {
  for (const fps of [15, 30, 60, 120]) for (const seed of [1, 42, 819]) {
    const run = createRunnerRun({ ...esplanadiMap.runner, random: seeded(seed) });
    const kinds = new Set(); let hits = 0;
    while (!run.state.finished) {
      const upcoming = run.state.traffic.filter(agent => agent.progress - run.state.distance > -trafficProfile(agent.kind).depth - .6).sort((a, b) => a.progress - b.progress)[0];
      if (upcoming) run.dodge(upcoming.safeLane - run.state.lane);
      hits += run.update(1 / fps).hits;
      for (const agent of run.state.traffic) kinds.add(agent.kind);
      assert.ok(run.state.traffic.length <= TRAFFIC_CAPACITY);
    }
    assert.equal(hits, 0, `${fps} FPS, seed ${seed}`);
    assert.equal(run.state.distance, ESPLANADI_LENGTH);
    assert.deepEqual([...kinds].sort(), ['barrier', 'bike', 'cone', 'tractor', 'trench']);
  }
  assert.throws(() => createRunnerRun({ riderKinds: [] }), /rider kinds/);
  assert.throws(() => createRunnerRun({ riderKinds: ['bus'] }), /rider kinds/);
});

test('theatre, park landmarks, fountain and waterfront occur once along the route and reset', () => {
  const map = esplanadiMap.create();
  const names = ['Svenska Teatern', 'Runeberg monument', 'Kappeli restaurant', 'Havis Amanda fountain', 'Kauppatori waterfront'];
  const landmarks = names.map(name => map.root.getObjectByName(name));
  assert.ok(landmarks.every(Boolean));
  assert.deepEqual(landmarks.map(node => node.userData.routeProgress), [5, 255, 475, 620, 570]);
  assert.ok(map.root.getObjectByName('Kauppatori ferry'));
  assert.ok(map.root.getObjectByName('Esplanadi Baltic Sea'));
  assert.ok(map.root.getObjectByName('Amanda water jets'));
  const pool = map.root.children.filter(node => node.name === 'Esplanadi traffic');
  assert.equal(pool.length, TRAFFIC_CAPACITY);
  assert.ok(pool.every(node => node.children.every(variant => !variant.name.includes('scooter'))));
  for (const distance of [0, 150, 300, 475, 540, 600]) {
    map.updateRunner({ distance, elapsed: distance / 10, traffic: [] });
    for (const landmark of landmarks) assert.equal(landmark.position.z, distance - landmark.userData.routeProgress);
    for (const x of [-3, 0, 3]) assert.equal(map.canStandAt(x, 0, .736), true);
  }
  const sections = map.root.children.filter(node => node.name === 'Esplanadi street section');
  assert.equal(sections.length, 5);
  assert.ok(sections.every(node => !node.visible), 'The park gives way to a real plaza at the finish');
  const fountainBounds = new THREE.Box3().setFromObject(landmarks[3]);
  assert.ok(fountainBounds.min.x > 5.5, 'The fountain leaves all three lanes clear');
  const finish = map.root.getObjectByName('Esplanadi finish');
  assert.equal(finish.visible, true); assert.equal(finish.position.z, 0);
  map.reset();
  assert.equal(landmarks[0].position.z, -5);
  assert.equal(finish.visible, false);
  map.dispose();
});

test('runner switches use map-specific length and release all map resources exactly once', () => {
  const scene = new THREE.Scene(), world = createMapManager(scene, [baanaMap, esplanadiMap, senateSquareMap], .736);
  world.activate('baana'); assert.equal(world.runner.length, 700);
  world.activate('esplanadi'); assert.equal(world.runner.length, 600);
  const root = scene.children[0], resources = new Set(), disposals = new Map();
  root.traverse(node => {
    if (node.geometry) resources.add(node.geometry);
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) if (material) {
      resources.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) resources.add(value);
    }
  });
  const count = resources.size;
  for (const resource of resources) resource.addEventListener('dispose', () => disposals.set(resource, (disposals.get(resource) ?? 0) + 1));
  for (let i = 0; i <= 60; i++) world.updateRunner({ distance: i * 10, elapsed: i, traffic: [] });
  const current = new Set(); root.traverse(node => { if (node.geometry) current.add(node.geometry); });
  assert.ok([...current].every(resource => resources.has(resource)), 'Updates allocate no new geometry');
  world.activate('senate-square');
  assert.equal(world.mode, 'arena'); assert.equal(world.runner, undefined);
  assert.equal(disposals.size, count);
  assert.ok([...disposals.values()].every(value => value === 1));
  world.dispose();
});
