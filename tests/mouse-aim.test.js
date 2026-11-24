import assert from 'node:assert/strict';
import test from 'node:test';
import { createMouseAim } from '../mouse-aim.js';

function setup() {
  globalThis.window = new EventTarget();
  const canvas = { getBoundingClientRect: () => ({ left: 40, top: 20, width: 800, height: 600 }) };
  const aim = createMouseAim({ canvas });

  function move(clientX, clientY, pointerType = 'mouse') {
    const event = new Event('pointermove');
    Object.assign(event, { pointerType, clientX, clientY });
    window.dispatchEvent(event);
  }

  return { aim, move };
}

test('hover tracks the real cursor before firing without a pointer lock', () => {
  const { aim, move } = setup();
  move(440, 170);
  assert.equal(aim.aiming, false);
  aim.setEnabled(true);
  move(440, 170);
  assert.equal(aim.aiming, true);
  assert.deepEqual(aim.position, { x: .5, y: .25 });
  move(441, 171);
  assert.deepEqual(aim.position, { x: .50125, y: 151 / 600 });
});

test('touch and pen do not take over mouse aim', () => {
  const { aim, move } = setup();
  aim.setEnabled(true);
  move(440, 170, 'touch');
  assert.equal(aim.aiming, false);
  move(640, 470);
  move(440, 170, 'pen');
  assert.equal(aim.aiming, true);
  assert.deepEqual(aim.position, { x: .75, y: .75 });
});

test('aim clears when the pointer leaves the playfield or the game loses focus', () => {
  const { aim, move } = setup();
  aim.setEnabled(true);
  move(640, 470);
  move(39, 470);
  assert.equal(aim.aiming, false);
  move(640, 470);
  const exit = new Event('pointerout');
  Object.assign(exit, { pointerType: 'mouse', relatedTarget: null });
  window.dispatchEvent(exit);
  assert.equal(aim.aiming, false);
  for (const type of ['blur', 'resize']) {
    move(640, 470);
    window.dispatchEvent(new Event(type));
    assert.equal(aim.aiming, false);
  }
});

test('pausing clears the target and a later mouse point can take over again', () => {
  const { aim, move } = setup();
  aim.setEnabled(true);
  move(440, 170);
  aim.setEnabled(false);
  move(640, 470);
  aim.setEnabled(true);
  assert.equal(aim.aiming, false);
  aim.point({ pointerType: 'mouse', clientX: 640, clientY: 470 });
  assert.deepEqual(aim.position, { x: .75, y: .75 });
  assert.equal(aim.aiming, true);
});
