import assert from 'node:assert/strict';
import test from 'node:test';
import { createBaanaRun, trafficContact, TRAFFIC_CAPACITY, RUN_LANES, trafficProfile, trafficRoutesConflict, RIDER_HEALTH, RIDER_BONUS, RIDER_DODGE_BONUS, OBSTACLE_PASS_BONUS } from '../runner/baana-run.js';

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
  const seenKinds = new Set();
  for (const fps of [30, 60, 120]) for (const seed of [1, 42, 371, 819]) {
    const run = createBaanaRun({ random: seeded(seed) });
    let hits = 0, peakTraffic = 0; const colors = new Set(), kinds = new Set();
    for (let frame = 0; frame < fps * 160 && !run.state.finished; frame++) {
      const upcoming = run.state.traffic.filter(agent => agent.progress - run.state.distance > -trafficProfile(agent.kind).depth - .6).sort((a, b) => a.progress - b.progress)[0];
      if (upcoming) run.dodge(upcoming.safeLane - run.state.lane);
      hits += run.update(1 / fps).hits;
      peakTraffic = Math.max(peakTraffic, run.state.traffic.length);
      for (const agent of run.state.traffic) { colors.add(agent.color); kinds.add(agent.kind); }
    }
    assert.equal(hits, 0, `A safe path exists at ${fps} FPS, seed ${seed}`);
    assert.equal(run.state.finished, true); assert.equal(run.state.distance, 700); assert.ok(run.state.elapsed < 75);
    assert.ok(run.state.passed > 70); assert.ok(peakTraffic <= TRAFFIC_CAPACITY);
    assert.deepEqual([...colors].sort(), ['blue', 'green', 'red']);
    assert.ok(kinds.has('bike') && kinds.has('scooter'));
    assert.ok(['barrier', 'cone', 'tractor', 'trench'].some(kind => kinds.has(kind)));
    for (const kind of kinds) seenKinds.add(kind);
    assert.ok(RUN_LANES.includes(run.state.x));
    const distance = run.state.distance; run.update(10); assert.equal(run.state.distance, distance);
  }
  assert.deepEqual([...seenKinds].sort(), ['barrier', 'bike', 'cone', 'scooter', 'tractor', 'trench']);
});


test('spraying clears riders, charged hits are stronger and clearing prevents damage and duplicate rewards', () => {
  const run = createBaanaRun({ random: seeded(42) });
  run.update(.01);
  for (const kind of ['bike', 'scooter']) {
    const agent = run.state.traffic[0];
    Object.assign(agent, { kind, hp: RIDER_HEALTH, alive: true, cleared: false, lane: 1, progress: run.state.distance + 3 });
    assert.equal(run.sprayHit(agent.id, { charge: 0, damage: .5 }), false);
    assert.ok(agent.hitUntil > run.state.elapsed);
    const before = run.state.bonus;
    while (agent.alive) run.sprayHit(agent.id, { charge: 1 });
    assert.equal(run.state.bonus - before, RIDER_BONUS);
    assert.equal(run.sprayHit(agent.id, { charge: 1 }), false);
    assert.equal(run.state.bonus - before, RIDER_BONUS);
    assert.equal(run.update(.3).hits, 0);
  }
  run.reset(); assert.equal(run.state.bonus, 0); assert.equal(run.state.cleared, 0);
});


test('all roadworks are solid obstacles immune to repeated fully charged spray', () => {
  for (const kind of ['cone', 'tractor', 'barrier', 'trench']) {
    const run = createBaanaRun({ random: seeded(42) }); run.update(.01);
    const agent = run.state.traffic[0];
    Object.assign(agent, { kind, hp: 4, alive: true, lane: 1, progress: run.state.distance + 3 });
    for (let hit = 0; hit < 100; hit++) assert.equal(run.sprayHit(agent.id, { damage: 10, charge: 1 }), false);
    assert.equal(agent.hp, 4); assert.equal(agent.alive, true); assert.equal(agent.hitUntil, 0);
    assert.equal(run.state.bonus, 0); assert.equal(run.state.cleared, 0);
    assert.equal(run.update(.3).hits, 1, `${kind} still collides`);
  }
});

test('route reservations reject future overtaking and spawning inside every stationary roadwork', () => {
  for (const kind of ['cone', 'tractor', 'barrier', 'trench']) {
    const obstacle = { kind, lane: 1, progress: 50, speed: 0 };
    assert.equal(trafficRoutesConflict({ kind: 'bike', lane: 1, progress: 70, speed: 5.2 }, obstacle), true);
    assert.equal(trafficRoutesConflict(obstacle, { kind: 'scooter', lane: 1, progress: 70, speed: 5.2 }), true);
    assert.equal(trafficRoutesConflict({ kind: 'bike', lane: 1, progress: 50, speed: 5.2 }, obstacle), true);
    assert.equal(trafficRoutesConflict({ kind: 'bike', lane: 1, progress: 40, speed: 5.2 }, obstacle), false);
    assert.equal(trafficRoutesConflict({ kind: 'bike', lane: 0, progress: 70, speed: 5.2 }, obstacle), false);
  }
});

test('dense generated traffic never intersects or overtakes on its visible route, including at spawn', () => {
  for (const seed of [1, 42, 371, 819, 17, 67, 113, 201, 566, 978]) {
    const run = createBaanaRun({ random: seeded(seed) }), order = new Map();
    while (!run.state.finished) {
      run.update(1 / 30);
      const traffic = run.state.traffic;
      for (let i = 0; i < traffic.length; i++) for (let j = i + 1; j < traffic.length; j++) {
        const a = traffic[i], b = traffic[j];
        if (a.lane !== b.lane) continue;
        const gap = a.progress - b.progress;
        const clearance = trafficProfile(a.kind).halfLength + trafficProfile(b.kind).halfLength;
        assert.ok(Math.abs(gap) >= clearance + 1.49, `${a.kind} overlaps ${b.kind}, seed ${seed}`);
        const key = `${a.id}/${b.id}`;
        if (order.has(key)) assert.equal(Math.sign(gap), order.get(key), 'Riders cannot drive through other traffic');
        else order.set(key, Math.sign(gap));
      }
    }
  }
});


test('both generated rider types clear on one uncharged hit and award the bonus once', () => {
  for (const [kind, value] of [['bike', .3], ['scooter', .6]]) {
    const run = createBaanaRun({ random: () => value }); run.update(.01);
    const agent = run.state.traffic[0];
    assert.equal(agent.kind, kind);
    assert.equal(run.sprayHit(agent.id, { damage: 1, charge: 0 }), true);
    assert.equal(agent.alive, false); assert.equal(run.state.bonus, RIDER_BONUS);
    assert.equal(run.sprayHit(agent.id, { damage: 1, charge: 0 }), false);
    assert.equal(run.state.bonus, RIDER_BONUS);
  }
});

test('clean rider dodges beat spraying, including lateral exits, without double rewards', () => {
  assert.ok(RIDER_DODGE_BONUS > RIDER_BONUS);
  for (const kind of ['bike', 'scooter', 'tram', 'tractor']) {
    const run = createBaanaRun({ random: seeded(42) }); run.update(.01);
    run.state.traffic.length = 0;
    const agent = { id: 1000, kind, lane: 0, x: -3, progress: run.state.distance + 2, speed: 5.2, alive: true, hp: RIDER_HEALTH, hit: false, passed: false };
    run.state.traffic.push(agent);
    const rider = ['bike', 'scooter'].includes(kind);
    const result = run.update(1.1);
    assert.equal(result.hits, 0); assert.equal(result.passed, 1);
    assert.equal(result.dodged, rider ? 1 : 0);
    assert.equal(run.state.bonus, rider ? RIDER_DODGE_BONUS : OBSTACLE_PASS_BONUS);
    const bonus = run.state.bonus;
    assert.equal(run.sprayHit(agent.id), false, 'Passed riders cannot also award spray points');
    run.update(.01); assert.equal(run.state.bonus, bonus);
  }
  for (const side of [-1, 1]) {
    const run = createBaanaRun(); run.update(.01); run.state.traffic.length = 0;
    const agent = { id: 1000, kind: 'scooter', crossing: true, vx: side * 15, x: side * 4, progress: 15, speed: 0, alive: true, hp: RIDER_HEALTH, hit: false, passed: false };
    run.state.traffic.push(agent);
    assert.equal(run.update(.2).dodged, 1, 'A scooter that leaves sideways earns points even when braking before the junction');
    assert.equal(run.state.bonus, RIDER_DODGE_BONUS);
    run.update(.1); assert.equal(run.state.bonus, RIDER_DODGE_BONUS);
  }
  const sprayed = createBaanaRun(); sprayed.update(.01);
  const rider = sprayed.state.traffic[0];
  Object.assign(rider, { kind: 'bike', hp: RIDER_HEALTH, alive: true, lane: 0, progress: 2 });
  assert.equal(sprayed.sprayHit(rider.id), true);
  sprayed.update(.5); assert.equal(sprayed.state.bonus, RIDER_BONUS); assert.equal(sprayed.state.passed, 0);
});

test('analog speed ramps smoothly, releases to cruise and remains stable across frame rates and reset', () => {
  const distances = [];
  for (const fps of [15, 30, 60, 120]) {
    const run = createBaanaRun({ roadworkKinds: [], random: seeded(42) });
    run.setThrottle(-1);
    run.update(0); assert.equal(run.state.speed, 9);
    for (let i = 0; i < fps; i++) run.update(1 / fps);
    assert.ok(run.state.speed >= 4.05 && run.state.speed < 4.5);
    assert.ok(run.pace < -.99);
    const braked = run.state.speed;
    run.setThrottle(.5); run.update(.1);
    assert.ok(run.state.speed > braked && run.state.speed <= braked + 1.201, 'Acceleration has no instantaneous jump');
    run.update(2); assert.ok(run.state.speed > 11.4 && run.state.speed < 11.7);
    assert.ok(Math.abs(run.pace - .5) < .001, 'The camera receives achieved speed, not the requested input');
    run.setThrottle(0); run.update(2); assert.ok(Math.abs(run.state.speed - (9 + run.state.elapsed * .08)) < .001);
    distances.push(run.state.distance);
    run.setThrottle(100); assert.equal(run.state.throttle, 1);
    assert.throws(() => run.setThrottle(NaN));
    run.reset(); assert.equal(run.state.throttle, 0); assert.equal(run.state.speed, 9); assert.equal(run.pace, 0);
  }
  assert.ok(Math.max(...distances) - Math.min(...distances) < .02);
});

test('full boost and braking produce clearly different travel speeds and coast back to neutral', () => {
  const runs = [-1, 0, 1].map(throttle => {
    const run = createBaanaRun({ acceleration: 0, roadworkKinds: [], random: seeded(42) });
    run.setThrottle(throttle); run.update(3); return run;
  });
  assert.ok(runs[2].state.distance > runs[0].state.distance * 2.5);
  assert.equal(runs[0].state.speed, 4.05); assert.equal(runs[1].state.speed, 9); assert.equal(runs[2].state.speed, 13.5);
  for (const run of runs) {
    const before = run.pace; run.setThrottle(0);
    assert.equal(run.pace, before, 'Feedback cannot jump before physical speed changes');
    run.update(1); assert.equal(run.state.speed, 9); assert.equal(run.pace, 0);
  }
});
