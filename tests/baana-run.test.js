import assert from 'node:assert/strict';
import test from 'node:test';
import { createBaanaRun, trafficContact, TRAFFIC_CAPACITY, RUN_LANES } from '../runner/baana-run.js';

const seeded = seed => () => ((seed = seed * 16807 % 2147483647) - 1) / 2147483646;

test('continuous movement accelerates, lane changes are bounded and reset clears a run', () => {
  const run = createBaanaRun({ random: seeded(42) });
  run.dodge(-1); run.dodge(-1); run.update(.3);
  assert.equal(run.state.x, -3); assert.equal(run.state.lane, 0);
  run.dodge(1); run.dodge(1); run.dodge(1); run.update(.5);
  assert.equal(run.state.x, 3); assert.equal(run.state.lane, 2);
  run.update(5);
  assert.ok(run.state.distance > 50); assert.ok(run.state.speed > 9);
  assert.ok(run.state.traffic.length > 0);
  run.reset();
  assert.equal(run.state.distance, 0); assert.equal(run.state.x, 0);
  assert.equal(run.state.lane, 1); assert.equal(run.state.passed, 0);
  assert.equal(run.state.invulnerable, 0); assert.equal(run.state.traffic.length, 0);
  assert.throws(() => run.update(-1)); assert.throws(() => createBaanaRun({ length: 0 }));
});

test('swept contact detects crossing a vehicle, including a lateral dodge, without phantom hits', () => {
  assert.equal(trafficContact(0, 8, 0, -8, 0), true);
  assert.equal(trafficContact(-3, 8, 3, -8, 0), true);
  assert.equal(trafficContact(-3, 8, -3, -8, 0), false);
  assert.equal(trafficContact(-3, 8, 3, 5, 0), false);
});

test('one contact costs one hit, grace prevents stacked damage and collided traffic earns no dodge points', () => {
  const run = createBaanaRun({ random: seeded(1) });
  for (let id = 0; id < 2; id++) run.state.traffic.push({ id, lane: 1, progress: 2, speed: 5.2, hit: false, passed: false });
  assert.equal(run.update(.3).hits, 1);
  assert.equal(run.update(.3).hits, 0);
  assert.equal(run.state.passed, 0);
  assert.ok(run.state.invulnerable > 0);
  run.reset();
  run.state.traffic.push({ id: 1, lane: 0, progress: 2, speed: 5.2, hit: false, passed: false });
  assert.equal(run.update(.5).passed, 1);
  assert.equal(run.state.passed, 1);
  assert.equal(run.update(.5).passed, 0);
});

test('generated traffic always permits a complete run at multiple refresh rates and varied seeds', () => {
  for (const fps of [30, 60, 120]) for (const seed of [1, 42, 371, 819]) {
    const run = createBaanaRun({ random: seeded(seed) });
    let hits = 0, peakTraffic = 0; const colors = new Set(), kinds = new Set();
    for (let frame = 0; frame < fps * 160 && !run.state.finished; frame++) {
      const upcoming = run.state.traffic.filter(agent => agent.progress - run.state.distance > -3).sort((a, b) => a.progress - b.progress)[0];
      if (upcoming) run.dodge(upcoming.safeLane - run.state.lane);
      hits += run.update(1 / fps).hits;
      peakTraffic = Math.max(peakTraffic, run.state.traffic.length);
      for (const agent of run.state.traffic) { colors.add(agent.color); kinds.add(agent.kind); }
    }
    assert.equal(hits, 0, `A safe path exists at ${fps} FPS, seed ${seed}`);
    assert.equal(run.state.finished, true); assert.equal(run.state.distance, 1300);
    assert.ok(run.state.passed > 150); assert.ok(peakTraffic <= TRAFFIC_CAPACITY);
    assert.deepEqual([...colors].sort(), ['blue', 'green', 'red']);
    assert.deepEqual([...kinds].sort(), ['bike', 'cone', 'scooter', 'tractor']);
    assert.ok(RUN_LANES.includes(run.state.x));
    const distance = run.state.distance; run.update(10); assert.equal(run.state.distance, distance);
  }
});


test('spraying clears riders, charged hits are stronger and clearing prevents damage and duplicate rewards', () => {
  const run = createBaanaRun({ random: seeded(42) });
  run.update(.01);
  for (const kind of ['bike', 'scooter']) {
    const agent = run.state.traffic[0];
    Object.assign(agent, { kind, hp: 1.5, alive: true, cleared: false, lane: 1, progress: run.state.distance + 3 });
    assert.equal(run.sprayHit(agent.id, { charge: 0, damage: .5 }), false);
    assert.ok(agent.hitUntil > run.state.elapsed);
    const before = run.state.bonus;
    while (agent.alive) run.sprayHit(agent.id, { charge: 1 });
    assert.equal(run.state.bonus - before, 150);
    assert.equal(run.sprayHit(agent.id, { charge: 1 }), false);
    assert.equal(run.state.bonus - before, 150);
    assert.equal(run.update(.3).hits, 0);
  }
  run.reset(); assert.equal(run.state.bonus, 0); assert.equal(run.state.cleared, 0);
});


test('cones and tractors are solid obstacles immune to repeated fully charged spray', () => {
  for (const kind of ['cone', 'tractor']) {
    const run = createBaanaRun({ random: seeded(42) }); run.update(.01);
    const agent = run.state.traffic[0];
    Object.assign(agent, { kind, hp: 4, alive: true, lane: 1, progress: run.state.distance + 3 });
    for (let hit = 0; hit < 100; hit++) assert.equal(run.sprayHit(agent.id, { damage: 10, charge: 1 }), false);
    assert.equal(agent.hp, 4); assert.equal(agent.alive, true); assert.equal(agent.hitUntil, 0);
    assert.equal(run.state.bonus, 0); assert.equal(run.state.cleared, 0);
    assert.equal(run.update(.3).hits, 1, `${kind} still collides`);
  }
});
