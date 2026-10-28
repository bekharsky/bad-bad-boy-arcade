import assert from 'node:assert/strict';
import test from 'node:test';
import { bindRunnerInput, createLaneSteering } from '../runner/runner-input.js';

function setup() {
  globalThis.window = new EventTarget(); globalThis.document = new EventTarget();
  const canvas = new EventTarget(), steps = [], firing = [];
  let enabled = true, focused = 0;
  canvas.focus = () => focused++; canvas.setPointerCapture = () => { throw new Error('No capture'); };
  const input = bindRunnerInput({ canvas, setFiring: value => firing.push(value), canInteract: () => enabled, dodge: value => steps.push(value) });
  function pointer(type, x = 100, y = 100, id = 1) {
    const event = new Event(type); Object.assign(event, { pointerId: id, button: 0, clientX: x, clientY: y }); canvas.dispatchEvent(event);
  }
  return { canvas, firing, input, steps, pointer, focused: () => focused, enable: value => { enabled = value; } };
}

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


test('mouse spray stops on release/capture loss and paused canvas cannot fire', () => {
  for (const stop of ['pointerup', 'pointercancel', 'lostpointercapture', 'reset', 'blur']) {
    const game = setup();
    const down = new Event('pointerdown'); Object.assign(down, { button: 0, pointerId: 8, pointerType: 'mouse', clientX: 100, clientY: 100 });
    game.canvas.dispatchEvent(down); assert.equal(game.firing.at(-1), true);
    if (stop === 'reset') game.input.reset();
    else if (stop === 'blur') window.dispatchEvent(new Event('blur'));
    else {
      const event = new Event(stop); Object.assign(event, { pointerId: 8 });
      (stop === 'lostpointercapture' ? game.canvas : window).dispatchEvent(event);
    }
    assert.equal(game.firing.at(-1), false, stop);
  }
  const game = setup(); game.enable(false); game.pointer('pointerdown');
  assert.deepEqual(game.firing, []);
});

test('horizontal joystick steps promptly, repeats while held and resets on neutral, reversal and pause', () => {
  const steps = [], steering = createLaneSteering(value => steps.push(value));
  steering.update(.1, 1); assert.deepEqual(steps, []);
  steering.update(1, .01); assert.deepEqual(steps, [1]);
  steering.update(1, .1); assert.deepEqual(steps, [1]);
  steering.update(1, .19); assert.deepEqual(steps, [1, 1]);
  steering.update(-1, .01); assert.deepEqual(steps, [1, 1, -1]);
  steering.update(0, .01); steering.update(-1, .01); assert.equal(steps.length, 4);
  steering.reset(); steering.update(0, 20); assert.equal(steps.length, 4);
  steering.update(1, .01); assert.equal(steps.at(-1), 1);
});
