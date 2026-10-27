import assert from 'node:assert/strict';
import test from 'node:test';
import { createMouseAim } from '../mouse-aim.js';

function setup() {
  globalThis.document = new EventTarget();
  globalThis.window = new EventTarget();
  const doc = document;
  let requests = 0, unlocks = 0, errors = 0;
  const canvas = {
    clientWidth: 800, clientHeight: 600,
    requestPointerLock() { requests++; },
    focus() { doc.activeElement = canvas; }
  };
  function lock(value = canvas) {
    doc.pointerLockElement = value;
    doc.dispatchEvent(new Event('pointerlockchange'));
  }
  doc.exitPointerLock = () => lock(null);
  const mouse = createMouseAim({
    canvas, getInitialPosition: () => ({ x: 400, y: 200 }),
    onUnlock: () => unlocks++, onError: () => errors++
  });
  const move = (x, y) => {
    const event = new Event('mousemove');
    Object.assign(event, { movementX: x, movementY: y });
    doc.dispatchEvent(event);
  };
  return { mouse, canvas, lock, move, requests: () => requests, unlocks: () => unlocks, errors: () => errors };
}

test('mouse capture needs enabling, deduplicates requests and starts along the current aim', () => {
  const { mouse, lock, requests } = setup();
  mouse.request();
  assert.equal(requests(), 0);
  mouse.setEnabled(true);
  mouse.request(); mouse.request();
  assert.equal(requests(), 1);
  lock();
  assert.equal(mouse.locked, true);
  assert.deepEqual(mouse.position, { x: 400, y: 200 });
});

test('capturing the mouse transfers keyboard focus from settings to the game', () => {
  const { mouse, canvas, lock } = setup();
  document.activeElement = { tagName: 'INPUT' };
  mouse.setEnabled(true); lock();
  assert.equal(document.activeElement, canvas);
});

test('capture alone never steers; keyboard steering cancels the helper until fresh mouse movement', () => {
  const { mouse, lock, move } = setup();
  mouse.setEnabled(true); lock();
  assert.equal(mouse.aiming, false);
  move(12, -3);
  assert.equal(mouse.aiming, true);
  mouse.resetAim();
  assert.equal(mouse.aiming, false);
  move(0, 0);
  assert.equal(mouse.aiming, false);
  move(.1, 0);
  assert.equal(mouse.aiming, true);
  lock(null); lock();
  assert.equal(mouse.aiming, false);
});

test('locked mouse deltas move the aim point in both axes and keep it inside the game', () => {
  const { mouse, lock, move } = setup();
  mouse.setEnabled(true); lock();
  move(.5, -.75);
  assert.deepEqual(mouse.position, { x: 400.5, y: 199.25 });
  move(1000, -1000);
  assert.deepEqual(mouse.position, { x: 788, y: 12 });
  move(-1, 1);
  assert.deepEqual(mouse.position, { x: 787, y: 13 });
});

test('native unlock notifies the game to pause exactly once', () => {
  const { mouse, lock, move, unlocks } = setup();
  mouse.setEnabled(true); lock(); lock(null); lock(null);
  assert.equal(mouse.locked, false);
  assert.equal(unlocks(), 1);
  const before = { ...mouse.position };
  move(20, 20);
  assert.deepEqual(mouse.position, before);
});

test('pausing or disabling releases capture without triggering another pause', () => {
  const { mouse, lock, unlocks } = setup();
  mouse.setEnabled(true); lock();
  mouse.setEnabled(false);
  assert.equal(document.pointerLockElement, null);
  assert.equal(mouse.locked, false);
  assert.equal(unlocks(), 0);
});

test('a late capture after pausing is immediately released', () => {
  const { mouse, lock, unlocks } = setup();
  mouse.setEnabled(true); mouse.request();
  mouse.setEnabled(false); lock();
  assert.equal(document.pointerLockElement, null);
  assert.equal(mouse.locked, false);
  assert.equal(unlocks(), 0);
});

test('capture denial is handled once and can be retried without breaking keyboard controls', async () => {
  const { mouse, canvas, errors } = setup();
  canvas.requestPointerLock = () => Promise.reject(new Error('Denied'));
  mouse.setEnabled(true); mouse.request();
  await Promise.resolve();
  document.dispatchEvent(new Event('pointerlockerror'));
  assert.equal(errors(), 1);
  assert.equal(mouse.locked, false);
  canvas.requestPointerLock = () => { throw new Error('Denied'); };
  mouse.request();
  assert.equal(errors(), 2);
});

test('unsupported capture and lock owned by another element do not activate mouse aim', () => {
  const { mouse, canvas, lock } = setup();
  delete canvas.requestPointerLock;
  mouse.setEnabled(true); mouse.request(); lock({});
  assert.equal(mouse.locked, false);
});

test('resizing reclamps the cursor without changing its direction or clearing capture', () => {
  const { mouse, canvas, lock, move } = setup();
  mouse.setEnabled(true); lock(); move(300, 300);
  canvas.clientWidth = 320; canvas.clientHeight = 240;
  window.dispatchEvent(new Event('resize'));
  assert.deepEqual(mouse.position, { x: 308, y: 228 });
  assert.equal(mouse.locked, true);
});
