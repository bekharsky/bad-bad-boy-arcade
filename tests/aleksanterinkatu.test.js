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
const { aleksanterinkatuMap, ALEKSI_LENGTH, ALEKSI_CROSSINGS, aleksiRoadSpans } = await import('../maps/aleksanterinkatu.js');
const { ALEKSI_LANDMARKS, WATERFRONT_OPENING, QUAY_OPENING, remainingFacadeSpans } = await import('../maps/aleksi-landmarks.js');
const { baanaMap } = await import('../maps/baana.js');
const { senateSquareMap } = await import('../maps/senate-square.js');
const { maps, mapOrder } = await import('../maps/index.js');
const { createMapManager } = await import('../world/map-manager.js');
const { createCampaign, createWaveDirector } = await import('../waves.js');
const { createMedkits } = await import('../medkits.js');
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
// marked lanes of each warned side-street approach. No invulnerability or kills.
function steer(run) {
  const state = run.state;
  const next = state.traffic.filter(a => !a.crossing && a.progress - state.distance > -trafficProfile(a.kind).depth - .6).sort((a, b) => a.progress - b.progress)[0];
  const crossing = state.crossings.find(c => (c.phase === 'warning' || c.phase === 'crossing') && c.progress + 10 > state.distance);
  const closeTraffic = next && next.progress - state.distance < (state.speed + next.speed) * .75 + trafficProfile(next.kind).depth;
  if (crossing && !closeTraffic) {
    const pass = crossing.passes.find(pass => pass.progress + 2 > state.distance);
    if (pass) {
      run.dodge((1 - pass.targetLane) - state.lane); return;
    }
  }
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

test('both runners leave a safe path at full brake, boost and changing pace between crossings', () => {
  for (const definition of [baanaMap, aleksanterinkatuMap]) for (const fps of [15, 60]) for (const seed of [1, 42, 17, 113]) for (const mode of [-1, 1, 'vary']) {
    const run = createRunnerRun({ ...definition.runner, random: seeded(seed) });
    let hits = 0;
    while (!run.state.finished) {
      const committedCrossing = run.state.crossings.some(c => c.phase === 'warning' || c.phase === 'crossing');
      if (mode !== 'vary' || !committedCrossing) run.setThrottle(mode === 'vary' ? Math.sin(run.state.elapsed * 1.7) : mode);
      steer(run); hits += run.update(1 / fps).hits;
    }
    assert.equal(hits, 0, `${definition.id}, ${fps} FPS, seed ${seed}, throttle ${mode}`);
    assert.equal(run.state.distance, definition.runner.length);
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
  assert.ok(facades.length > 20);
  for (const facade of facades) for (const reserved of [...ALEKSI_LANDMARKS, WATERFRONT_OPENING, QUAY_OPENING]) {
    const { side, routeFrom, routeTo } = facade.userData;
    assert.ok(side !== reserved.side || routeTo <= reserved.from + 1e-8 || routeFrom >= reserved.to - 1e-8, 'Generic fronts never cover a landmark or the open square');
  }
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
  assert.ok(map.root.getObjectByName('Aleksanterinkatu traffic templates').children.some(variant => variant.name === 'tram tram'));
  assert.ok(pool.every(node => node.children.length <= 1));
  map.reset(); assert.ok(pool.every(node => !node.visible));
  map.dispose();
});


test('crossing lane markers match both randomized gates, advance priority and reset without new meshes', () => {
  const map = aleksanterinkatuMap.create();
  const square = map.root.getObjectByName('Aleksanterinkatu street').children.find(n => n.name === 'Aleksi crossing square');
  const markers = square.children.filter(n => n.name === 'Scooter crossing lane marker');
  assert.equal(markers.length, 2);
  for (const seed of [42, 99991]) {
    const run = createRunnerRun({ ...aleksanterinkatuMap.runner, random: seeded(seed) }), state = run.state, crossing = state.crossings[0];
    while (crossing.phase !== 'warning') run.update(1 / 60);
    map.updateRunner(state);
    for (const [i, marker] of markers.entries()) {
      assert.ok(marker.visible);
      assert.equal(marker.position.x, TRAM_LANES[crossing.passes[i].targetLane]);
      assert.equal(marker.position.z, crossing.progress - crossing.passes[i].progress);
      assert.equal(marker.scale.x, -crossing.side);
    }
    assert.ok(markers[0].children[0].material.opacity > markers[1].children[0].material.opacity);
    const first = crossing.passes[0];
    state.elapsed = first.launchAt + Math.abs(crossing.side * 14 - TRAM_LANES[first.targetLane]) / first.speed + .3;
    map.updateRunner(state);
    assert.equal(markers[0].visible, false);
    assert.ok(markers[1].visible);
    assert.ok(markers[1].children[0].material.opacity > .4);
    run.reset(); map.updateRunner(state);
    assert.ok(markers.every(n => !n.visible));
  }
  map.dispose();
});

test('the complete tram body blocks liquid and map switches release every owned resource once', () => {
  const scene = new THREE.Scene(), world = createMapManager(scene, [baanaMap, aleksanterinkatuMap, senateSquareMap], .736);
  world.activate('baana'); assert.equal(world.runner.lanes, undefined);
  world.activate('aleksanterinkatu'); assert.deepEqual(world.runner.lanes, TRAM_LANES);
  const root = scene.children[0], resources = new Set(), disposals = new Map();
  root.traverse(node => {
    if (node.geometry) resources.add(node.geometry);
    if (node.material) {
      resources.add(node.material);
      for (const value of Object.values(node.material)) if (value?.isTexture) resources.add(value);
    }
  });
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

test('real frontages keep their street sides, opposite neighbours and a lower Sederholm roofline', () => {
  const map = aleksanterinkatuMap.create();
  const city = map.root.getObjectByName('Aleksanterinkatu street');
  const buildings = city.children.filter(node => node.userData.landmarkId);
  assert.deepEqual(buildings.map(node => node.userData.landmarkId), ['stockmann', 'pohjola', 'lundqvist', 'university', 'sederholm']);
  for (const building of buildings) {
    const bounds = new THREE.Box3().setFromObject(building);
    assert.ok(building.userData.side > 0 ? bounds.min.x > 5.3 : bounds.max.x < -5.3, `${building.name} leaves both tram lanes clear`);
    assert.equal(building.position.z, -(building.userData.routeFrom + building.userData.routeTo) / 2);
  }
  const [stockmann, pohjola, lundqvist, , sederholm] = buildings;
  assert.equal(pohjola.position.z, lundqvist.position.z, 'The two buildings face one another');
  assert.equal(pohjola.userData.side, 1); assert.equal(lundqvist.userData.side, -1);
  const height = node => new THREE.Box3().setFromObject(node).getSize(new THREE.Vector3()).y;
  assert.ok(height(sederholm) < height(stockmann) * .6);
  assert.equal(map.root.getObjectByName('Helsinki Cathedral'), undefined);
  const ferry = map.root.getObjectByName('Aleksi finishing ferry');
  assert.ok(ferry);
  const ferryBounds = new THREE.Box3().setFromObject(ferry);
  assert.ok(ferryBounds.max.z < -664, 'The ferry sits beyond the quay in the water');
  const water = new THREE.Box3().setFromObject(map.root.getObjectByName('Aleksi Baltic water'));
  assert.ok(Math.abs(water.max.z + 664) < .001);
  map.updateRunner({ distance: ALEKSI_LENGTH, elapsed: 50, traffic: [], crossings: [] });
  assert.ok(ferry.getWorldPosition(new THREE.Vector3()).z < -50, 'The finish still looks across a quay and sea');
  const geometries = new Set(); map.root.traverse(node => { if (node.geometry) geometries.add(node.geometry); });
  assert.ok([...geometries].reduce((sum, geometry) => sum + geometry.attributes.position.count, 0) <= 563701, 'Landmark detail stays within the previous street geometry budget');
  map.dispose();
});

test('facade reservations split blocks without closing cross streets or the Senate Square opening', () => {
  assert.deepEqual(remainingFacadeSpans(1, -40, 120), [[-40, -20]]);
  assert.deepEqual(remainingFacadeSpans(-1, 300, 400), [[352, 400]]);
  assert.deepEqual(remainingFacadeSpans(1, 580, 680), [[580, 600]]);
  assert.deepEqual(remainingFacadeSpans(-1, 580, 680), []);
  for (const definition of ALEKSI_LANDMARKS) {
    // Only the reserved frontage may replace a facade; none spans a junction.
    assert.ok(ALEKSI_CROSSINGS.every(progress => definition.to <= progress - 20 || definition.from >= progress + 20));
  }
});

test('cross streets own one road surface and warnings only appear on the rails', () => {
  const map = aleksanterinkatuMap.create(); map.root.updateMatrixWorld(true);
  for (const progress of ALEKSI_CROSSINGS) {
    const ray = new THREE.Raycaster(new THREE.Vector3(1.8, 1, -progress - .8), new THREE.Vector3(0, -1, 0));
    const surfaces = ray.intersectObject(map.root, true).filter(hit => Math.abs(hit.point.y - .04) < .001);
    assert.equal(surfaces.length, 1, 'There is no second coplanar road at the junction');
    assert.ok(aleksiRoadSpans(-60, 642).every(([a, b]) => b <= progress - 6 || a >= progress + 6));
  }
  assert.equal(map.root.getObjectByName('Side-street scooter warning'), undefined);
  map.dispose();
});


test('Aleksi has one medkit after the second crossing, with moving scenery and one capped heal per run', () => {
  const scene = new THREE.Scene(), world = createMapManager(scene, [aleksanterinkatuMap, baanaMap, senateSquareMap], .736);
  world.activate('aleksanterinkatu');
  assert.deepEqual(world.pickupPoints('medkit', .86), [{ x: TRAM_LANES[0], z: -300 }]);
  const player = { x: TRAM_LANES[0], z: 0, radius: .736, hp: 5, maxHp: 5 };
  const medkits = createMedkits(scene, world), meshes = scene.children.filter(n => n.isInstancedMesh);
  assert.equal(meshes.length, 3);
  const matrix = new THREE.Matrix4(); let healed = 0;
  const collect = amount => { healed += amount; player.hp += amount; };
  const update = distance => medkits.update(.2, player, collect, { distance });
  medkits.reset(player); update(295);
  meshes[0].getMatrixAt(0, matrix);
  assert.ok(Math.abs(matrix.elements[14] + 5) < .0001, 'The kit follows the scrolling route');
  assert.ok(meshes.every(n => n.count === 1));
  update(300);
  assert.equal(healed, 0, 'Full health does not consume the kit');
  player.hp = 2; update(300);
  assert.equal(healed, 2); assert.equal(player.hp, 4);
  assert.ok(meshes.every(n => n.count === 0));
  update(301); assert.equal(healed, 2, 'No second heal');
  medkits.reset(player); update(295); update(300);
  assert.equal(player.hp, 5); assert.equal(healed, 3, 'Healing is capped at maximum health');
  medkits.clear(); assert.ok(meshes.every(n => n.count === 0));
  world.activate('baana'); medkits.reset(player);
  assert.ok(meshes.every(n => n.count === 0), 'A map switch removes the old runner pickup');
  world.dispose();
});

test('boosted pickup sweeps do not miss the kit, collect from the other rail or heal retroactively', () => {
  const map = aleksanterinkatuMap.create(), scene = new THREE.Scene(), medkits = createMedkits(scene, map);
  const player = { x: TRAM_LANES[0], z: 0, radius: .736, hp: 3, maxHp: 5 };
  let healed = 0; const collect = amount => { healed += amount; player.hp += amount; };
  const update = distance => medkits.update(.2, player, collect, { distance });
  medkits.reset(player); update(297); update(303);
  assert.equal(healed, 2, 'A fast frame crossing the whole pickup still heals');
  player.x = TRAM_LANES[1]; player.hp = 3; medkits.reset(player); update(297); update(303);
  assert.equal(healed, 2, 'The other rail cannot collect it');
  player.x = TRAM_LANES[0]; player.hp = 5; medkits.reset(player); update(297); update(303);
  player.hp = 3; update(306);
  assert.equal(healed, 2, 'Damage after passing the kit cannot collect it retroactively');
  map.dispose();
});
