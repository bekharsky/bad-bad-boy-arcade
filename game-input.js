const LEFT_BUTTON = 1;
const RIGHT_BUTTON = 2;
const FIRE_BUTTONS = LEFT_BUTTON | RIGHT_BUTTON;

export function bindGameInput({
  canvas, movementZone, movementHandle, sprayZone, canInteract, setFiring, beginSpray, pointMouseAim,
  clickMoveEnabled = () => false, onClickCommand = () => {},
}) {
  let buttons = 0;

  function focusGame() {
    if (canInteract()) canvas.focus({ preventScroll: true });
  }

  function onPlayfield(event) {
    if (event.target === canvas || event.target === sprayZone) return true;
    if (event.target !== movementZone) return false;
    const handle = movementHandle?.getBoundingClientRect();
    return !handle || event.clientX < handle.left || event.clientX > handle.right || event.clientY < handle.top || event.clientY > handle.bottom;
  }

  function reset() {
    if (!buttons) return;
    buttons = 0;
    setFiring(false, false);
  }

  function updateButtons(event) {
    const next = event.buttons & FIRE_BUTTONS;
    if (next === buttons) return;
    const airborne = !!(next & RIGHT_BUTTON);
    const startsSpray = next && (!buttons || (airborne && !(buttons & RIGHT_BUTTON)));
    buttons = next;
    setFiring(!!next, airborne);
    if (startsSpray) {
      pointMouseAim(event);
      beginSpray(true, airborne);
    }
  }

  window.addEventListener('pointerdown', event => {
    focusGame();
    if (event.pointerType !== 'mouse' || (event.button !== 0 && event.button !== 2) || !canInteract() || !onPlayfield(event)) return;
    event.preventDefault();
    // The transparent joystick zone covers part of the playfield.
    if (event.target === movementZone) event.stopPropagation();
    if (event.button === 0 && clickMoveEnabled()) {
      reset();
      onClickCommand(event);
      return;
    }
    updateButtons(event);
  }, true);
  window.addEventListener('focus', focusGame);
  window.addEventListener('pointermove', event => {
    // Chorded mouse buttons report additional presses and releases as pointermove.
    if (!buttons || event.pointerType !== 'mouse') return;
    if (canInteract()) updateButtons(event);
    else reset();
  });
  window.addEventListener('contextmenu', event => {
    if (canInteract() && onPlayfield(event)) event.preventDefault();
  });
  for (const name of ['pointerup', 'pointercancel']) {
    window.addEventListener(name, event => {
      if (event.pointerType === 'mouse') reset();
    });
  }
  canvas.addEventListener('lostpointercapture', event => {
    if (event.pointerType === 'mouse') reset();
  });
  window.addEventListener('pointerout', event => {
    if (event.pointerType === 'mouse' && !event.relatedTarget) reset();
  });
  window.addEventListener('blur', reset);
  return { reset };
}
