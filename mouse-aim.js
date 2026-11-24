// Use the real cursor so aiming works before the first shot and without pointer lock.
export function createMouseAim({ canvas }) {
  const position = { x: 0, y: 0 };
  let enabled = false;
  let aiming = false;

  function resetAim() { aiming = false; }

  function point(event) {
    if (!enabled || event.pointerType !== 'mouse') return;
    const bounds = canvas.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width;
    const y = (event.clientY - bounds.top) / bounds.height;
    aiming = x >= 0 && x <= 1 && y >= 0 && y <= 1;
    if (aiming) {
      position.x = x;
      position.y = y;
    }
  }

  window.addEventListener('pointermove', point);
  window.addEventListener('pointerout', event => {
    if (event.pointerType === 'mouse' && !event.relatedTarget) resetAim();
  });
  window.addEventListener('blur', resetAim);
  window.addEventListener('resize', resetAim);

  return {
    position,
    point,
    resetAim,
    get enabled() { return enabled; },
    get aiming() { return aiming; },
    setEnabled(value) {
      enabled = value;
      if (!enabled) resetAim();
    },
  };
}
