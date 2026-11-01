import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';
import { createTramTurn, TRAM_CAR_OFFSET } from '../runner/tram-route.js';
import { createRunnerRun, TRAM_LANES } from '../runner/course.js';

registerHooks({ resolve(s, c, next) {
  if (s === 'three') s = new URL('../vendor/three-0.180.0/build/three.module.min.js', import.meta.url).href;
  if (s.startsWith('three/addons/')) s = new URL(`../vendor/three-0.180.0/examples/jsm/${s.slice(13)}`, import.meta.url).href;
  return next(s, c);
} });
globalThis.document = { createElement: () => ({ getContext: () => ({ fillRect() {}, fillText() {} }) }) };
const THREE = await import('three');
const { aleksanterinkatuMap } = await import('../maps/aleksanterinkatu.js');
const { ALEKSI_TRAM_TURN, ALEKSI_SHORE, aleksiTramRoute } = await import('../maps/aleksi-waterfront.js');

test('tram paths join the street, concentric quarter turns and quay without position or heading jumps', () => {
  const { start, radius } = ALEKSI_TRAM_TURN;
  for (const lane of TRAM_LANES) {
    const r = radius + lane, end = start + r * Math.PI / 2;
    assert.deepEqual(aleksiTramRoute(start - 5, lane), { x: lane, z: -start + 5, heading: 0 });
    for (const join of [start, end]) {
      const a = aleksiTramRoute(join - .00001, lane), b = aleksiTramRoute(join + .00001, lane);
      assert.ok(Math.hypot(a.x - b.x, a.z - b.z) < .00003);
      assert.ok(Math.abs(a.heading - b.heading) < .00001);
    }
    const exit = aleksiTramRoute(end + 40, lane);
    assert.ok(Math.abs(exit.x + radius + 40) < 1e-8);
    assert.equal(exit.z, -start - r); assert.equal(exit.heading, Math.PI / 2);
  }
  assert.throws(() => createTramTurn({ start: 644, radius: 0 }));
});

test('rails, articulated cars and liquid blockers follow the same land route through the entire bend', () => {
  const map = aleksanterinkatuMap.create(), { start, radius } = ALEKSI_TRAM_TURN;
  for (const lane of TRAM_LANES) {
    map.reset();
    const laneIndex = TRAM_LANES.indexOf(lane), r = radius + lane;
    for (const offset of [-.76, .76]) for (const angle of [.05, .4, .9, 1.5]) {
      const railR = r + offset, p = aleksiTramRoute(start + railR * angle, lane + offset);
      map.root.updateMatrixWorld(true);
      const hits = new THREE.Raycaster(new THREE.Vector3(p.x, .3, p.z), new THREE.Vector3(0, -1, 0)).intersectObject(map.root, true);
      assert.ok(hits.some(hit => Math.abs(hit.point.y - .0855) < .001), 'A steel rail head sits under the sampled route');
    }
    for (let progress = start - 10; progress < start + r * Math.PI / 2 + 100; progress += 1.5) {
      const agent = { id: 1, kind: 'tram', color: 'tram', lane: laneIndex, progress, speed: 7.5, alive: true };
      map.updateRunner({ distance: 630, elapsed: progress, traffic: [agent], crossings: [] });
      map.root.updateMatrixWorld(true);
      const slot = map.root.children.find(node => node.name === 'Aleksanterinkatu traffic');
      const tram = slot.getObjectByName('tram tram'), bounds = new THREE.Box3().setFromObject(tram);
      assert.ok(bounds.min.z > 630 - ALEKSI_SHORE + .5, 'The complete body never reaches the sea');
      for (const part of tram.children.filter(node => node.userData.tramOffset !== undefined)) {
        const expected = aleksiTramRoute(progress - part.userData.tramOffset, lane), actual = part.getWorldPosition(new THREE.Vector3());
        assert.ok(Math.abs(actual.x - expected.x) < 1e-8 && Math.abs(actual.z - 630 - expected.z) < 1e-8);
        const length = .2, dx = Math.sin(expected.heading) * length, dz = Math.cos(expected.heading) * length;
        assert.equal(map.lineClear3D({ x: actual.x - dx, y: 1.4, z: actual.z - dz }, { x: actual.x + dx, y: 1.4, z: actual.z + dz }), false, 'Liquid blocks on both actual cars');
      }
    }
  }
  map.dispose();
});

test('bending trams have no phantom straight-lane collision and generated traffic never spawns over water', () => {
  for (const lane of [0, 1]) {
    const run = createRunnerRun({ ...aleksanterinkatuMap.runner, tramChance: 1, random: () => .2 });
    run.state.distance = 635; run.state.elapsed = 60; run.state.traffic.push({ id: -1, kind: 'tram', lane, progress: 700, speed: 7.5, alive: true, hit: false, passed: false });
    const result = run.update(.1), tram = run.state.traffic.find(a => a.id === -1);
    const expected = aleksiTramRoute(tram.progress, TRAM_LANES[lane]);
    assert.equal(result.hits, 0); assert.equal(tram.x, expected.x); assert.equal(tram.z, run.state.distance + expected.z);
  }
  for (const throttle of [-1, 0, 1]) {
    let seed = 42;
    const run = createRunnerRun({ ...aleksanterinkatuMap.runner, random: () => ((seed = seed * 16807 % 2147483647) - 1) / 2147483646 });
    run.setThrottle(throttle);
    while (!run.state.finished) {
      run.update(1 / 30);
      for (const agent of run.state.traffic) {
        if (agent.kind === 'tram') {
          const rear = aleksiTramRoute(agent.progress + TRAM_CAR_OFFSET, TRAM_LANES[agent.lane]);
          assert.ok(rear.z > -ALEKSI_SHORE + 4);
        } else if (!agent.crossing) assert.ok(agent.progress <= run.length);
      }
    }
  }
});
