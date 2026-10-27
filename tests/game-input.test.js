import assert from 'node:assert/strict';
import test from 'node:test';
import { bindGameInput } from '../game-input.js';
import { createMouseAim } from '../mouse-aim.js';

function pointer(surface, type, target = surface, properties = {}) {
  const event = new Event(type, { cancelable: true });
  Object.defineProperty(event, 'target', { value: target });
  Object.assign(event, { pointerType: 'mouse', button: 0, clientX: 200, clientY: 300, ...properties });
  surface.dispatchEvent(event);
  return event;
}

function setup({ capture = false } = {}) {
  globalThis.window = new EventTarget();
  globalThis.document = new EventTarget();
  const canvas = new EventTarget();
  canvas.clientWidth = 600;
  canvas.clientHeight = 800;
  canvas.focus = () => { document.activeElement = canvas; };
  canvas.requestPointerLock = () => Promise.reject(new Error('Not supported in this webview'));
  const movementZone = {};
  const movementHandle = { getBoundingClientRect: () => ({ left: 24, right: 112, top: 680, bottom: 768 }) };
  let interactive = true, firing = false, bursts = 0, errors = 0;
  const mouseAim = createMouseAim({
    canvas, reticle: { style: {}, hidden: true },
    getInitialPosition: () => ({ x: 300, y: 400 }),
    onUnlock() {}, onError() { errors++; }
  });
  mouseAim.setEnabled(capture);
  bindGameInput({
    canvas, movementZone, movementHandle,
    canInteract: () => interactive,
    setFiring: value => { firing = value; },
    beginSpray: () => { bursts++; },
    requestMouseAim: () => mouseAim.request(),
  });
  return {
    canvas, movementZone,
    setInteractive(value) { interactive = value; },
    firing: () => firing, bursts: () => bursts, errors: () => errors,
  };
}

test('a primary mouse click fires on its first press even when pointer lock is rejected', async () => {
  const game = setup({ capture: true });
  document.activeElement = { tagName: 'BUTTON' };
  const press = pointer(game.canvas, 'pointerdown');
  assert.equal(press.defaultPrevented, true, 'Default pointer focus must not undo the explicit canvas focus');
  assert.equal(game.firing(), true);
  assert.equal(game.bursts(), 1);
  await Promise.resolve();
  assert.equal(game.errors(), 1);
  assert.equal(game.firing(), true, 'Aiming-helper failure must not cancel the shot');
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

test('dragging MOVE with a mouse and touching the playfield still belong to the joystick', () => {
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
  pointer(game.canvas, 'pointerdown');
  assert.equal(document.activeElement, settingsInput, 'Settings and title-screen controls keep their focus');
  assert.equal(game.bursts(), 0);
  game.setInteractive(true);
  pointer(window, 'pointerdown', {}, { pointerType: 'touch' });
  assert.equal(document.activeElement, game.canvas);
});

test('right clicks do not fire, and release, cancellation and blur never leave a stuck spray', () => {
  const game = setup();
  pointer(game.canvas, 'pointerdown', game.canvas, { button: 2 });
  assert.equal(game.bursts(), 0);
  for (const name of ['pointerup', 'pointercancel', 'blur']) {
    pointer(game.canvas, 'pointerdown');
    assert.equal(game.firing(), true);
    if (name === 'blur') window.dispatchEvent(new Event('blur'));
    else pointer(window, name);
    assert.equal(game.firing(), false);
  }
});
