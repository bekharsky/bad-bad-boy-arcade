// Use the real cursor so aiming works before the first shot and without pointer lock.
export function createMouseAim({ canvas }) {
  const position = { x: 0, y: 0 };
  let pointer = null;
  let enabled = false;
  let onCanvas = false;
  let following = true;

  function updatePosition() {
    if (!pointer) return;
    const bounds = canvas.getBoundingClientRect();
    const x = (pointer.x - bounds.left) / bounds.width;
    const y = (pointer.y - bounds.top) / bounds.height;
    onCanvas = x >= 0 && x <= 1 && y >= 0 && y <= 1;
    if (onCanvas) {
      position.x = x;
      position.y = y;
    }
  }

  function point(event) {
    if (event.pointerType !== 'mouse') return false;
    const moved = pointer?.x !== event.clientX || pointer?.y !== event.clientY;
    pointer = { x: event.clientX, y: event.clientY };
    updatePosition();
    return moved && onCanvas;
  }

  function clearPointer() {
    pointer = null;
    onCanvas = false;
  }

  window.addEventListener('pointermove', event => {
    if (point(event)) following = true;
  });
  window.addEventListener('pointerdown', event => {
    if (!enabled) point(event);
  }, true);
  window.addEventListener('pointerout', event => {
    if (event.pointerType === 'mouse' && !event.relatedTarget) clearPointer();
  });
  window.addEventListener('blur', clearPointer);
  window.addEventListener('resize', updatePosition);

  return {
    position,
    point,
    resetSteering() { following = true; },
    yieldToKeyboard() { following = false; },
    get enabled() { return enabled; },
    get aiming() { return enabled && onCanvas; },
    get following() { return enabled && following; },
    setEnabled(value) { enabled = value; },
  };
}
