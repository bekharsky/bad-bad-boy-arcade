export function bindRunnerInput({ canvas, canInteract, dodge, setFiring = () => {}, beginSpray = () => {} }) {
  let swipe = null, firePointer = null;
  canvas.addEventListener('pointerdown', event => {
    if (!canInteract() || event.button !== 0) return;
    if (event.pointerType === 'mouse') { firePointer = event.pointerId; setFiring(true); beginSpray(); }
    swipe = { id: event.pointerId, x: event.clientX, y: event.clientY, used: false };
    canvas.focus({ preventScroll: true });
    try { canvas.setPointerCapture(event.pointerId); } catch { /* Capture is optional in embedded browsers. */ }
  });
  canvas.addEventListener('pointermove', event => {
    if (!canInteract() || !swipe || swipe.id !== event.pointerId || swipe.used) return;
    const dx = event.clientX - swipe.x, dy = event.clientY - swipe.y;
    if (Math.abs(dx) < 32 || Math.abs(dx) < Math.abs(dy)) return;
    swipe.used = true; dodge(Math.sign(dx));
  });
  const stopFiring = event => {
    if (event && event.pointerId !== firePointer) return;
    firePointer = null; setFiring(false);
  };
  for (const name of ['pointerup', 'pointercancel']) window.addEventListener(name, stopFiring);
  canvas.addEventListener('lostpointercapture', stopFiring);
  const reset = () => { swipe = null; stopFiring(); };
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(name, () => { swipe = null; });
  window.addEventListener('blur', reset);
  document.addEventListener('visibilitychange', reset);
  return { reset };
}

// A horizontal stick steps through lanes while held; neutral/reversal reacts
// immediately. Timing is simulation based, so pause cannot queue up lane changes.
export function createLaneSteering(dodge) {
  let direction = 0, repeat = 0;
  return {
    reset() { direction = 0; repeat = 0; },
    update(axis, dt) {
      const next = Math.abs(axis) > .25 ? Math.sign(axis) : 0;
      if (next !== direction) { direction = next; repeat = 0; }
      if (!direction) return;
      repeat -= dt;
      if (repeat <= 0) { dodge(direction); repeat = .28; }
    },
  };
}
