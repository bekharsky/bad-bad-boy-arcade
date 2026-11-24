import assert from 'node:assert/strict';
import test from 'node:test';
import { bindGameInput } from '../game-input.js';
import { createMouseAim } from '../mouse-aim.js';

function pointer(surface, type, target = surface, properties = {}) {
  const event = new Event(type, { cancelable: true });
  Object.defineProperty(event, 'target', { value: target });
  Object.assign(event, { pointerType: 'mouse', button: 0, buttons: type === 'pointerdown' ? 1 : 0, clientX: 200, clientY: 300, ...properties });
  surface.dispatchEvent(event);
  return event;
}

function setup({ aiming = false } = {}) {
  globalThis.window = new EventTarget();
  globalThis.document = new EventTarget();
  const canvas = new EventTarget();
  canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 600, height: 800 });
  canvas.focus = () => { document.activeElement = canvas; };
  const movementZone = {};
  const movementHandle = { getBoundingClientRect: () => ({ left: 24, right: 112, top: 680, bottom: 768 }) };
  let interactive = true, firing = false, bursts = 0, shotAim, mouseShot;
  const mouseAim = createMouseAim({ canvas });
  mouseAim.setEnabled(aiming);
  const input = bindGameInput({
    canvas, movementZone, movementHandle,
    canInteract: () => interactive,
    setFiring: value => { firing = value; },
    beginSpray: mouse => { bursts++; mouseShot = mouse; shotAim = mouseAim.aiming ? { ...mouseAim.position } : null; },
    pointMouseAim: mouseAim.point,
  });
  return {
    canvas, movementZone,
    reset: input.reset,
    setInteractive(value) { interactive = value; },
    firing: () => firing, bursts: () => bursts, shotAim: () => shotAim, mouseShot: () => mouseShot,
  };
}

test('the first mouse press updates the heading before emitting a spray', () => {
  const game = setup({ aiming: true });
  document.activeElement = { tagName: 'BUTTON' };
  const press = pointer(window, 'pointerdown', game.canvas);
  assert.equal(press.defaultPrevented, true, 'Default pointer focus must not undo the explicit canvas focus');
  assert.equal(game.firing(), true);
  assert.equal(game.bursts(), 1);
  assert.deepEqual(game.shotAim(), { x: 1 / 3, y: .375 });
  assert.equal(game.mouseShot(), true);
  assert.equal(document.activeElement, game.canvas);
  pointer(window, 'pointerup');
  assert.equal(game.firing(), false);
});

test('the invisible touch movement zone does not swallow mouse shots over the world', () => {
  const game = setup();
  const event = pointer(window, 'pointerdown', game.movementZone);
  assert.equal(game.firing(), true);
  assert.equal(game.bursts(), 1);
  assert.equal(event.cancelBubble, true, 'The virtual joystick must not also claim this mouse press');
  assert.equal(event.defaultPrevented, true);
  assert.equal(document.activeElement, game.canvas);
});

test('dragging the visible stick with a mouse and touching the playfield still belong to the joystick', () => {
  const game = setup();
  const drag = pointer(window, 'pointerdown', game.movementZone, { clientX: 50, clientY: 720 });
  assert.equal(game.bursts(), 0);
  assert.equal(drag.cancelBubble, false);
  for (const pointerType of ['touch', 'pen']) {
    const touch = pointer(window, 'pointerdown', game.movementZone, { pointerType });
    assert.equal(touch.cancelBubble, false);
    assert.equal(game.bursts(), 0);
    assert.equal(document.activeElement, game.canvas);
  }
});

test('returning focus or pressing a screen control restores keyboard focus only during gameplay', () => {
  const game = setup();
  document.activeElement = { tagName: 'BUTTON' };
  window.dispatchEvent(new Event('focus'));
  assert.equal(document.activeElement, game.canvas);
  const settingsInput = { tagName: 'INPUT' };
  game.setInteractive(false);
  document.activeElement = settingsInput;
  window.dispatchEvent(new Event('focus'));
  pointer(window, 'pointerdown', settingsInput, { pointerType: 'touch' });
  pointer(window, 'pointerdown', game.canvas);
  assert.equal(document.activeElement, settingsInput, 'Settings and title-screen controls keep their focus');
  assert.equal(game.bursts(), 0);
  game.setInteractive(true);
  pointer(window, 'pointerdown', {}, { pointerType: 'touch' });
  assert.equal(document.activeElement, game.canvas);
});

test('right clicks do not fire, and release, cancellation and exit never leave a stuck spray', () => {
  const game = setup();
  pointer(window, 'pointerdown', game.canvas, { button: 2, buttons: 2 });
  assert.equal(game.bursts(), 0);
  for (const name of ['pointerup', 'pointercancel', 'pointerout', 'blur']) {
    pointer(window, 'pointerdown', game.canvas);
    assert.equal(game.firing(), true);
    if (name === 'blur') window.dispatchEvent(new Event('blur'));
    else pointer(window, name);
    assert.equal(game.firing(), false);
  }
});

test('secondary buttons on the map do not trigger gameplay or open the browser menu', () => {
  const game = setup({ aiming: true });
  for (const [button, buttons] of [[2, 2], [1, 4]]) {
    pointer(window, 'pointerdown', game.movementZone, { button, buttons });
    assert.equal(game.firing(), false);
    assert.equal(game.bursts(), 0);
  }
  assert.equal(pointer(window, 'contextmenu', game.movementZone).defaultPrevented, true);
});

test('a held spray ends on left-button release or gameplay reset', () => {
  const game = setup({ aiming: true });
  pointer(window, 'pointerdown', game.canvas);
  pointer(window, 'pointermove', game.canvas, { buttons: 3 });
  assert.equal(game.firing(), true);
  assert.equal(game.bursts(), 1);
  pointer(window, 'pointermove', game.canvas, { buttons: 2 });
  assert.equal(game.firing(), false);
  pointer(window, 'pointerdown', game.canvas);
  game.reset();
  pointer(window, 'pointermove', game.canvas, { buttons: 1 });
  assert.equal(game.firing(), false);
  assert.equal(game.bursts(), 2);
});
