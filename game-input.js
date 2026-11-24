const FIRE_BUTTON = 1;

export function bindGameInput({ canvas, movementZone, movementHandle, canInteract, setFiring, beginSpray, pointMouseAim }) {
  let firing = false;

  function focusGame() {
    if (canInteract()) canvas.focus({ preventScroll: true });
  }

  function onPlayfield(event) {
    if (event.target === canvas) return true;
    if (event.target !== movementZone) return false;
    const handle = movementHandle?.getBoundingClientRect();
    return !handle || event.clientX < handle.left || event.clientX > handle.right || event.clientY < handle.top || event.clientY > handle.bottom;
  }

  function reset() {
    if (!firing) return;
    firing = false;
    setFiring(false);
  }

  window.addEventListener('pointerdown', event => {
    focusGame();
    if (event.pointerType !== 'mouse' || event.button !== 0 || !canInteract() || !onPlayfield(event)) return;
    event.preventDefault();
    // The transparent joystick zone covers part of the playfield.
    if (event.target === movementZone) event.stopPropagation();
    pointMouseAim(event);
    firing = true;
    setFiring(true);
    beginSpray(true);
  }, true);
  window.addEventListener('focus', focusGame);
  window.addEventListener('pointermove', event => {
    // With another mouse button held, releasing left may arrive as pointermove.
    if (firing && event.pointerType === 'mouse' && !(event.buttons & FIRE_BUTTON)) reset();
  });
  window.addEventListener('contextmenu', event => {
    if (canInteract() && onPlayfield(event)) event.preventDefault();
  });
  for (const name of ['pointerup', 'pointercancel']) {
    window.addEventListener(name, event => {
      if (event.pointerType === 'mouse') reset();
    });
  }
  window.addEventListener('pointerout', event => {
    if (event.pointerType === 'mouse' && !event.relatedTarget) reset();
  });
  window.addEventListener('blur', reset);
  return { reset };
}
