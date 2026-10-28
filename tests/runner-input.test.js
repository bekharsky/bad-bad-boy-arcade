import assert from 'node:assert/strict';
import test from 'node:test';
import { bindRunnerInput } from '../runner/runner-input.js';

function setup() {
  globalThis.window = new EventTarget(); globalThis.document = new EventTarget();
  const canvas = new EventTarget(), left = new EventTarget(), right = new EventTarget(), fire = new EventTarget(), steps = [], firing = [];
  let enabled = true, focused = 0;
  canvas.focus = () => focused++; canvas.setPointerCapture = () => { throw new Error('No capture'); };
  const input = bindRunnerInput({ canvas, left, right, fire, setFiring: value => firing.push(value), canInteract: () => enabled, dodge: value => steps.push(value) });
  function pointer(type, x = 100, y = 100, id = 1) {
    const event = new Event(type); Object.assign(event, { pointerId: id, button: 0, clientX: x, clientY: y }); canvas.dispatchEvent(event);
  }
  return { canvas, left, right, fire, firing, input, steps, pointer, focused: () => focused, enable: value => { enabled = value; } };
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


test('spray holds independently of a touch dodge and stops on release, capture loss or pause', () => {
  for (const stop of ['pointerup', 'pointercancel', 'lostpointercapture', 'reset', 'blur']) {
    const game = setup();
    const down = new Event('pointerdown'); Object.assign(down, { button: 0, pointerId: 8 });
    game.fire.dispatchEvent(down); assert.equal(game.firing.at(-1), true);
    game.pointer('pointerdown'); game.pointer('pointermove', 150);
    const otherUp = new Event('pointerup'); Object.assign(otherUp, { pointerId: 1 });
    window.dispatchEvent(otherUp); game.pointer('pointerup');
    assert.equal(game.firing.at(-1), true, 'Lifting the dodging finger keeps spray held');
    if (stop === 'reset') game.input.reset();
    else if (stop === 'blur') window.dispatchEvent(new Event('blur'));
    else {
      const event = new Event(stop); Object.assign(event, { pointerId: 8 });
      (stop === 'lostpointercapture' ? game.fire : window).dispatchEvent(event);
    }
    assert.equal(game.firing.at(-1), false, stop);
  }
  const game = setup(); game.enable(false);
  const event = new Event('pointerdown'); Object.assign(event, { button: 0, pointerId: 8 });
  game.fire.dispatchEvent(event); assert.deepEqual(game.firing, []);
});
