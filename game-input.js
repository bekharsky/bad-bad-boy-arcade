// Pointer lock is an optional aiming helper, never a requirement for input.
export function bindGameInput({ canvas, movementZone, movementHandle, canInteract, setFiring, beginSpray, requestMouseAim }) {
  function focusGame() {
    if (canInteract()) canvas.focus({ preventScroll: true });
  }

  // The virtual joystick prevents the pointer's default action. Explicitly
  // focus the game even when a control rather than the canvas gets the click.
  function spray(event) {
    if (event.pointerType !== 'mouse' || event.button !== 0 || !canInteract()) return;
    event.preventDefault();
    focusGame();
    setFiring(true);
    beginSpray();
    requestMouseAim();
  }
  window.addEventListener('pointerdown', event => {
    focusGame();
    if (!canInteract() || event.target !== movementZone || event.pointerType !== 'mouse' || event.button !== 0) return;
    const handle = movementHandle?.getBoundingClientRect();
    const onHandle = handle && event.clientX >= handle.left && event.clientX <= handle.right && event.clientY >= handle.top && event.clientY <= handle.bottom;
    if (onHandle) return;
    // The transparent touch zone covers most of the left-hand playfield.
    // Keep mouse clicks there as shots; mouse dragging from MOVE still steers.
    event.stopPropagation();
    spray(event);
  }, true);
  window.addEventListener('focus', focusGame);
  canvas.addEventListener('pointerdown', spray);
  for (const name of ['pointerup', 'pointercancel']) {
    window.addEventListener(name, event => {
      if (event.pointerType === 'mouse') setFiring(false);
    });
  }
  window.addEventListener('blur', () => setFiring(false));
}
