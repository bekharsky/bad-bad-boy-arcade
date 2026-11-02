import assert from 'node:assert/strict';
import test from 'node:test';
import { createFrameClock } from '../world/frame-clock.js';

test('simulation time and movement agree at 10, 30, 60 and 120 FPS', () => {
  for (const fps of [10, 30, 60, 120]) {
    const clock = createFrameClock();
    let time = 0, distance = 0, steps = 0;
    const update = dt => { assert.equal(dt, 1 / 60); time += dt; distance += 3.6 * dt; steps++; };
    clock.advance(0, update);
    for (let frame = 1; frame <= fps * 10; frame++) clock.advance(frame * 1000 / fps, update);
    assert.equal(steps, 600, `${fps} FPS`);
    assert.ok(Math.abs(time - 10) < 1e-9);
    assert.ok(Math.abs(distance - 36) < 1e-9);
  }
});

test('stalls have bounded catch-up, reset discards pause time and fractional debt', () => {
  const clock = createFrameClock();
  let steps = 0;
  clock.advance(0, () => steps++);
  clock.advance(10000, () => steps++);
  assert.equal(steps, 12);
  clock.advance(10005, () => steps++);
  assert.equal(steps, 12, 'No stale backlog');
  clock.reset();
  assert.equal(clock.advance(100000, () => steps++), 0);
  clock.advance(100010, () => steps++);
  assert.equal(steps, 12, 'Fractional pre-pause step was discarded');
  clock.advance(100020, () => steps++);
  assert.equal(steps, 13);
});

test('pausing inside a simulation frame cancels its remaining steps', () => {
  const clock = createFrameClock();
  clock.advance(0, () => {});
  let steps = 0;
  assert.equal(clock.advance(100, () => { steps++; return false; }), 1 / 60);
  assert.equal(steps, 1);
  clock.advance(110, () => steps++);
  assert.equal(steps, 1);
});
