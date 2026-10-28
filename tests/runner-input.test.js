import assert from 'node:assert/strict';
import test from 'node:test';
import { bindRunnerInput } from '../runner/runner-input.js';

function setup() {
  globalThis.window = new EventTarget(); globalThis.document = new EventTarget();
  const canvas = new EventTarget(), left = new EventTarget(), right = new EventTarget(), steps = [];
  let enabled = true, focused = 0;
  canvas.focus = () => focused++; canvas.setPointerCapture = () => { throw new Error('No capture'); };
  const input = bindRunnerInput({ canvas, left, right, canInteract: () => enabled, dodge: value => steps.push(value) });
  function pointer(type, x = 100, y = 100, id = 1) {
    const event = new Event(type); Object.assign(event, { pointerId: id, button: 0, clientX: x, clientY: y }); canvas.dispatchEvent(event);
  }
  return { canvas, left, right, input, steps, pointer, focused: () => focused, enable: value => { enabled = value; } };
}

test('left/right buttons dodge once and restore game focus; paused controls do nothing', () => {
  const game = setup(); game.left.dispatchEvent(new Event('click')); game.right.dispatchEvent(new Event('click'));
  assert.deepEqual(game.steps, [-1, 1]); assert.equal(game.focused(), 2);
  game.enable(false); game.left.dispatchEvent(new Event('click')); assert.equal(game.steps.length, 2);
});

test('horizontal swipes work without pointer capture and cannot repeat within a gesture', () => {
  const game = setup(); game.pointer('pointerdown'); game.pointer('pointermove', 135); game.pointer('pointermove', 200);
  assert.deepEqual(game.steps, [1]);
  game.pointer('pointerup'); game.pointer('pointerdown'); game.pointer('pointermove', 60);
  assert.deepEqual(game.steps, [1, -1]);
  game.pointer('pointerup'); game.pointer('pointerdown'); game.pointer('pointermove', 110, 200);
  assert.equal(game.steps.length, 2, 'Vertical movement is not a dodge');
});

test('cancel, pause/reset and backgrounding discard an unfinished swipe', () => {
  for (const cancel of ['pointercancel', 'lostpointercapture', 'blur', 'visibilitychange', 'reset']) {
    const game = setup(); game.pointer('pointerdown');
    if (cancel === 'reset') game.input.reset();
    else if (cancel === 'blur') window.dispatchEvent(new Event(cancel));
    else if (cancel === 'visibilitychange') document.dispatchEvent(new Event(cancel));
    else game.pointer(cancel);
    game.pointer('pointermove', 200); assert.deepEqual(game.steps, [], cancel);
  }
});
