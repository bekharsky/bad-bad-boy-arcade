export function bindRunnerInput({ canvas, left, right, canInteract, dodge, fire, setFiring = () => {}, beginSpray = () => {} }) {
  let swipe = null, firePointer = null;
  function step(direction) {
    if (!canInteract()) return;
    dodge(direction); canvas.focus({ preventScroll: true });
  }
  left.addEventListener('click', () => step(-1));
  right.addEventListener('click', () => step(1));
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
    swipe.used = true; step(Math.sign(dx));
  });
  fire?.addEventListener('pointerdown', event => {
    if (!canInteract() || event.button !== 0) return;
    event.preventDefault(); canvas.focus({ preventScroll: true });
    firePointer = event.pointerId; setFiring(true); beginSpray();
    try { fire.setPointerCapture(event.pointerId); } catch { /* Optional capture. */ }
  });
  const stopFiring = event => {
    if (event && event.pointerId !== firePointer) return;
    firePointer = null; setFiring(false);
  };
  for (const name of ['pointerup', 'pointercancel']) window.addEventListener(name, stopFiring);
  fire?.addEventListener('lostpointercapture', stopFiring);
  canvas.addEventListener('lostpointercapture', stopFiring);
  const reset = () => { swipe = null; stopFiring(); };
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(name, () => { swipe = null; });
  window.addEventListener('blur', reset);
  document.addEventListener('visibilitychange', reset);
  return { reset };
}
