// Apply physical mouse movement to the projected reticle, even as the camera follows the hero.
export function createMouseAim({ canvas, onAim = () => {}, projectAim = () => null }) {
  const position = { x: 0, y: 0 };
  let pointer = null;
  let enabled = false;
  let onCanvas = false;
  let following = true;

  function updatePosition(previous = null, changed = false) {
    if (!pointer) return;
    const bounds = canvas.getBoundingClientRect();
    const x = (pointer.x - bounds.left) / bounds.width;
    const y = (pointer.y - bounds.top) / bounds.height;
    const wasOnCanvas = onCanvas;
    onCanvas = x >= 0 && x <= 1 && y >= 0 && y <= 1;
    if (!onCanvas || (enabled && wasOnCanvas && !changed)) return;
    const anchor = enabled && wasOnCanvas && previous && following ? projectAim() : null;
    position.x = anchor ? Math.max(0, Math.min(1, anchor.x + (pointer.x - previous.x) / bounds.width)) : x;
    position.y = anchor ? Math.max(0, Math.min(1, anchor.y + (pointer.y - previous.y) / bounds.height)) : y;
    if (enabled) onAim(position);
  }

  function point(event) {
    if (event.pointerType !== 'mouse') return false;
    const previous = pointer;
    const moved = previous?.x !== event.clientX || previous?.y !== event.clientY;
    pointer = { x: event.clientX, y: event.clientY };
    updatePosition(previous, moved || (!following && event.type === 'pointerdown'));
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
  window.addEventListener('resize', () => updatePosition());

  return {
    position,
    point,
    resetSteering() { following = true; },
    yieldToKeyboard() { following = false; },
    get enabled() { return enabled; },
    get aiming() { return enabled && onCanvas; },
    get following() { return enabled && following; },
    setEnabled(value) {
      if (enabled === value) return;
      enabled = value;
      if (enabled) updatePosition(null, true);
    },
  };
}
