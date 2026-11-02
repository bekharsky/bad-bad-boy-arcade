import assert from 'node:assert/strict';
import test from 'node:test';
import { createRunnerRun, trafficProfile, TRAFFIC_CAPACITY, TRAM_LANES, RUNNER_BRAKE, RUNNER_BOOST } from '../runner/course.js';

const seeded = seed => () => ((seed = seed * 16807 % 2147483647) - 1) / 2147483646;
const tracks = [
  { length: 700, variety: true },
  { length: 640, variety: true, lanes: TRAM_LANES, tramChance: .42, roadworkKinds: [], crossingPoints: [140, 280, 420, 560], startSpeed: 10.5, speedLimit: 18, acceleration: .12 },
];
function record(config, seed, fps = 60) {
  let calls = 0; const rng = seeded(seed), run = createRunnerRun({ ...config, random: () => { calls++; return rng(); } });
  const seen = new Set(), rows = [], patterns = new Set(), speeds = new Set(), spacing = [], roadworks = new Set();
  let previousRow = -1;
  const before = calls; run.update(0); run.update(0); assert.equal(calls, before, 'Pause cannot roll a new encounter');
  while (!run.state.finished) {
    run.update(1 / fps);
    assert.ok(run.state.traffic.length <= TRAFFIC_CAPACITY);
    for (const agent of run.state.traffic) if (!seen.has(agent.id)) {
      seen.add(agent.id);
      if (agent.crossing) continue;
      patterns.add(agent.encounter); speeds.add(agent.speed);
      if (agent.speed === 0) roadworks.add(agent.kind);
      rows.push([agent.id, agent.kind, agent.lane, agent.encounter, +agent.row.toFixed(4), +agent.speed.toFixed(4)]);
      const lead = (agent.progress - run.state.distance - trafficProfile(agent.kind).depth) / (run.state.speed + agent.speed);
      assert.ok(lead > 1.7, 'An obstacle must be visible in advance, including rush groups');
      if (agent.row !== previousRow) { if (previousRow >= 0) spacing.push(agent.row - previousRow); previousRow = agent.row; }
    }
  }
  return { run, rows, patterns, speeds, spacing, roadworks };
}

test('seeded encounter sequences reproduce across frame rates and differ between runs', () => {
  for (const config of tracks) {
    const a = record(config, 42, 30), b = record(config, 42, 60), c = record(config, 819, 60);
    assert.deepEqual(a.rows, b.rows);
    assert.notDeepEqual(a.rows, c.rows);
    assert.ok(new Set(a.spacing.map(t => t.toFixed(1))).size >= 4, 'Arrival rhythm is not a metronome');
    assert.ok(a.speeds.size >= 6);
  }
});

test('both levels use the full encounter vocabulary and random riders never overtake same-lane obstacles', () => {
  for (const config of tracks) {
    const patterns = new Set(), work = new Set();
    for (const seed of [1, 42, 819, 17, 113, 371]) {
      const recorded = record(config, seed, 30);
      for (const pattern of recorded.patterns) patterns.add(pattern);
      for (const kind of recorded.roadworks) work.add(kind);
      const run = createRunnerRun({ ...config, random: seeded(seed) });
      while (!run.state.finished) {
        run.update(1 / 30);
        const traffic = run.state.traffic.filter(a => !a.crossing);
        for (let i = 0; i < traffic.length; i++) for (let j = i + 1; j < traffic.length; j++) {
          const a = traffic[i], b = traffic[j];
          if (a.lane !== b.lane) continue;
          assert.ok(Math.abs(a.progress - b.progress) >= trafficProfile(a.kind).halfLength + trafficProfile(b.kind).halfLength + 1.49);
        }
      }
    }
    assert.deepEqual([...patterns].sort(), config.tramChance ? ['flow', 'rush', 'slalom', 'trams'] : ['flow', 'rush', 'slalom', 'worksite']);
    if (!config.tramChance) assert.deepEqual([...work].sort(), ['barrier', 'cone', 'tractor', 'trench']);
  }
});

test('random crossing arrows expose varied sides, gate order and speed, and react to an early pace change', () => {
  const orders = new Set(), speeds = new Set(), directions = new Set();
  for (const fps of [15, 60]) for (const seed of [1, 42, 819, 17, 99991]) for (const initial of [-1, 1]) for (const next of [-1, 1]) {
    const run = createRunnerRun({ length: 180, variety: true, lanes: TRAM_LANES, crossingPoints: [140], roadworkKinds: [], startSpeed: 18, speedLimit: 18, acceleration: 0, random: seeded(seed) });
    const crossing = run.state.crossings[0];
    directions.add(crossing.side); orders.add(crossing.passes.map(p => p.targetLane).join(','));
    for (const pass of crossing.passes) speeds.add(pass.speed.toFixed(2));
    run.state.distance = 75; run.setThrottle(initial); run.state.speed = 18 * (initial < 0 ? RUNNER_BRAKE : RUNNER_BOOST);
    let changed = false, hits = 0;
    while (!run.state.finished) {
      if (!changed && crossing.phase === 'warning') { run.setThrottle(next); changed = true; }
      const pass = crossing.passes.find(p => p.progress + 2 > run.state.distance);
      if (pass) run.dodge((1 - pass.targetLane) - run.state.lane);
      hits += run.update(1 / fps).hits;
      // This scenario isolates cross traffic from the normal encounter stream.
      for (let i = run.state.traffic.length - 1; i >= 0; i--) if (!run.state.traffic[i].crossing) run.state.traffic.splice(i, 1);
    }
    assert.equal(hits, 0, `${fps} FPS, seed ${seed}, ${initial} to ${next}`);
    assert.ok(changed);
  }
  assert.equal(orders.size, 2); assert.equal(directions.size, 2); assert.ok(speeds.size >= 6);
});
