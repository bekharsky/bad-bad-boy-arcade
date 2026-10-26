import assert from 'node:assert/strict';
import test from 'node:test';
import { createEnemyPressure } from '../enemy-pressure.js';

function advance(pressure, seconds, living = 5, fps = 60) {
  let added = 0;
  for (let i = 0; i < Math.round(seconds * fps); i++) added += pressure.update(1 / fps, living + added);
  return added;
}

test('avoiding kills brings increasingly frequent and larger reinforcements at every frame rate', () => {
  for (const fps of [30, 60, 120]) {
    const pressure = createEnemyPressure();
    assert.equal(advance(pressure, 17, 5, fps), 0);
    assert.equal(advance(pressure, 1, 5, fps), 2);
    assert.equal(advance(pressure, 8, 7, fps), 2);
    assert.equal(advance(pressure, 6, 9, fps), 3);
    assert.equal(advance(pressure, 4, 12, fps), 3);
    assert.equal(advance(pressure, 4, 15, fps), 4);
  }
});

test('kills relieve pressure, including after reinforcements have already arrived', () => {
  const pressure = createEnemyPressure();
  assert.ok(advance(pressure, 40) > 0);
  pressure.onKill();
  assert.equal(advance(pressure, 17), 0);
  assert.equal(advance(pressure, 1), 2);
  for (let i = 0; i < 10; i++) { pressure.onKill(); assert.equal(advance(pressure, 10), 0); }
});

test('empty waves and restarts begin with a fresh grace period', () => {
  const pressure = createEnemyPressure();
  advance(pressure, 17);
  pressure.update(1, 0);
  assert.equal(advance(pressure, 17), 0);
  pressure.reset();
  assert.equal(advance(pressure, 17), 0);
  assert.equal(advance(pressure, 1), 2);
});

test('long evasion caps the crowd at 48 without stockpiling missed arrivals', () => {
  const pressure = createEnemyPressure();
  assert.equal(advance(pressure, 200), 43);
  assert.equal(advance(pressure, 20, 48), 0);
  assert.equal(pressure.update(1 / 60, 47), 0);
  pressure.onKill();
  assert.equal(advance(pressure, 18, 47), 1);
});
