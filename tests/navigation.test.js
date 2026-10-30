import assert from 'node:assert/strict';
import test from 'node:test';
import { createNavigation } from '../world/navigation.js';

const bounds = { minX: -10, maxX: 10, minZ: -10, maxZ: 10 };
const wall = { minX: .12, maxX: .13, minZ: -2, maxZ: 2, height: 1 };
const point = (x, y = .5, z = 0) => ({ x, y, z });

test('segments cannot skip thin obstacles in either direction or at zero length', () => {
  const nav = createNavigation({ bounds, colliders: [wall] });
  for (const [a, b] of [[0, 1], [1, 0], [.125, .125], [.125, 1], [0, .125]]) {
    assert.equal(nav.lineClear(a, 0, b, 0, 0), false);
    assert.equal(nav.lineClear3D(point(a), point(b)), false);
  }
  assert.equal(nav.lineClear(0, 0, 0, 0, 0), true);
  assert.equal(nav.lineClear(0, 3, 1, 3, 0), true);
});

test('3D queries respect height, radius, grazing faces and world boundaries', () => {
  const nav = createNavigation({ bounds, colliders: [wall] });
  assert.equal(nav.lineClear3D(point(0, 1), point(1, 1)), true, 'Exact roof contact is clear');
  assert.equal(nav.lineClear3D(point(0, 1.01), point(1, 1.01), .02), false);
  assert.equal(nav.lineClear3D(point(0, -.1), point(1, -.1)), true);
  assert.equal(nav.lineClear3D(point(0, 2), point(1, 2)), true);
  assert.equal(nav.lineClear3D(point(0, 2), point(.125, .5)), false);
  assert.equal(nav.lineClear(0, 2, 1, 2, 0), true, 'Grazing side is clear');
  assert.equal(nav.lineClear(0, 2, 1, 2, .01), false);
  assert.equal(nav.lineClear(0, 3, 11, 3, 0), false);
  assert.equal(nav.lineClear3D(point(-11, 2), point(0, 2)), false);
  assert.equal(nav.lineClear(0, 3, 10, 3, 0), true);
  assert.equal(nav.lineClear(0, 3, 10, 3, .01), false);
});

test('dynamic collision data is read once per segment and reflects moving obstacles', () => {
  let calls = 0, active = [];
  const nav = createNavigation({ bounds, dynamicColliders() { calls++; return active; } });
  calls = 0;
  assert.equal(nav.lineClear(-9, 0, 9, 0, 0), true);
  assert.equal(calls, 1);
  active = [wall];
  assert.equal(nav.lineClear3D(point(-9), point(9)), false);
  assert.equal(calls, 2);
  active = [];
  assert.equal(nav.lineClear3D(point(-9), point(9)), true);
});

test('fast movement and knockback cannot tunnel through walls and still slide', () => {
  const nav = createNavigation({ bounds, colliders: [wall] });
  const actor = { x: -1, z: 0 };
  nav.move(actor, 3, .5, .05);
  assert.equal(actor.x, -1);
  assert.equal(actor.z, .5);
  actor.x = .125;
  nav.move(actor, -1, 0, .05);
  assert.ok(actor.x < 0, 'An embedded actor can escape');
});
