import assert from 'node:assert/strict';
import test from 'node:test';
import { preventGameZoom } from '../gesture-guard.js';

function dispatch(surface, type, touches = 0) {
  const event = new Event(type, { cancelable: true });
  Object.assign(event, { touches: Array.from({ length: touches }, () => ({})) });
  surface.dispatchEvent(event);
  return event.defaultPrevented;
}

test('Safari zoom gestures and multi-touch browser gestures are cancelled', () => {
  const surface = new EventTarget();
  preventGameZoom(surface);
  for (const type of ['gesturestart', 'gesturechange', 'gestureend']) assert.equal(dispatch(surface, type), true);
  assert.equal(dispatch(surface, 'touchmove', 2), true);
  assert.equal(dispatch(surface, 'touchmove', 3), true);
});

test('single-finger scrolling and gameplay pointer events are not swallowed', () => {
  const surface = new EventTarget();
  preventGameZoom(surface);
  assert.equal(dispatch(surface, 'touchmove', 1), false);
  for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) assert.equal(dispatch(surface, type), false);
});
