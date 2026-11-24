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

test('mouse steering starts with the pointer position already available in the menu', () => {
  const { aim, move } = setup();
  move(440, 170);
  assert.equal(aim.aiming, false);
  aim.setEnabled(true);
  assert.equal(aim.aiming, true);
  assert.equal(aim.following, true);
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
  move(640, 470);
  window.dispatchEvent(new Event('blur'));
  assert.equal(aim.aiming, false);
  assert.equal(aim.following, true);
});

test('resuming restores mouse steering with the pointer position from the pause menu', () => {
  const { aim, move } = setup();
  aim.setEnabled(true);
  move(440, 170);
  aim.yieldToKeyboard();
  aim.setEnabled(false);
  move(640, 470);
  assert.equal(aim.aiming, false);
  aim.resetSteering();
  window.dispatchEvent(new Event('resize'));
  aim.setEnabled(true);
  assert.deepEqual(aim.position, { x: .75, y: .75 });
  assert.equal(aim.aiming, true);
  assert.equal(aim.following, true);
});

test('keyboard steering stops following until the mouse actually moves again', () => {
  const { aim, move } = setup();
  aim.setEnabled(true);
  move(440, 170);
  assert.equal(aim.following, true);
  aim.yieldToKeyboard();
  move(440, 170);
  assert.equal(aim.following, false);
  assert.equal(aim.aiming, true, 'A held mouse shot can still use the current position');
  move(441, 170);
  assert.equal(aim.following, true);
  move(39, 170);
  assert.equal(aim.aiming, false);
  assert.equal(aim.following, true, 'Keep steering forward on the last heading after exiting');
});
