import assert from 'node:assert/strict';
import test from 'node:test';
import { createRunnerRun, TRAM_LANES, RUNNER_BRAKE, RUNNER_BOOST, SCOOTER_HEALTH } from '../runner/course.js';

// Begin after normal traffic stops spawning, isolating a real generated pair.
function crossingRun(throttle, lane = 0) {
  const run = createRunnerRun({ length: 180, lanes: TRAM_LANES, crossingPoints: [140], roadworkKinds: [], startSpeed: 18, speedLimit: 18, acceleration: 0, random: () => .5 });
  run.state.distance = 115; run.dodge(lane); run.state.x = TRAM_LANES[lane];
  run.setThrottle(throttle); run.state.speed = 18 * (throttle < 0 ? RUNNER_BRAKE : throttle > 0 ? RUNNER_BOOST : 1);
  return run;
}

test('both fixed lanes take scooter contact damage at every speed and refresh rate', () => {
  for (const fps of [15, 30, 60, 120]) for (const throttle of [-1, 0, 1]) for (const lane of [0, 1]) {
    const run = crossingRun(throttle, lane); let hits = 0;
    const seen = new Map();
    while (!run.state.finished) {
      hits += run.update(1 / fps).hits;
      for (const agent of run.state.traffic) if (!seen.has(agent.id)) seen.set(agent.id, { progress: agent.progress, speed: Math.abs(agent.vx), hp: agent.hp });
    }
    assert.equal(hits, 1, `${fps} FPS, throttle ${throttle}, lane ${lane}`);
    assert.equal(run.state.passed, 1, 'A hit cannot also award dodge points');
    assert.deepEqual([...seen.values()], [{ progress: 134, speed: 18, hp: SCOOTER_HEALTH }, { progress: 147, speed: 20, hp: SCOOTER_HEALTH }]);
  }
});

test('a timely lane change clears both gates; following the dangerous lanes takes two distinct hits', () => {
  for (const fps of [15, 30, 60, 120]) for (const throttle of [-1, 0, 1]) for (const correct of [true, false]) {
    const run = crossingRun(throttle, correct ? 1 : 0); let hits = 0;
    while (!run.state.finished) {
      const second = run.state.distance >= 140;
      const lane = (correct === second) ? 0 : 1;
      run.dodge(lane - run.state.lane);
      hits += run.update(1 / fps).hits;
    }
    assert.equal(hits, correct ? 0 : 2, `${fps} FPS, throttle ${throttle}, correct ${correct}`);
    assert.equal(run.state.passed, correct ? 2 : 0);
  }
});

test('scooter damage is not silently absorbed by one weak splash, while a direct charged hit clears it once', () => {
  const run = crossingRun(0); while (!run.state.traffic.length) run.update(1 / 60);
  const scooter = run.state.traffic[0];
  assert.equal(run.sprayHit(scooter.id, { damage: .6, charge: 1, groundSplash: true }), false);
  assert.equal(run.state.cleared, 0); assert.equal(scooter.alive, true);
  assert.equal(run.sprayHit(scooter.id, { damage: 1, charge: 1 }), true);
  assert.equal(run.sprayHit(scooter.id, { damage: 1, charge: 1 }), false);
  assert.equal(run.state.cleared, 1); assert.equal(run.state.bonus, 50);
});
