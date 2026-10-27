// Pointer lock tracks an aim point; the game renders its marker on the ground.
export function createMouseAim({ canvas, getInitialPosition, onUnlock, onError }) {
  const position = { x: 0, y: 0 };
  let enabled = false;
  let locked = false;
  let pending = false;
  let aiming = false;

  function setPosition(x, y) {
    position.x = Math.max(12, Math.min(canvas.clientWidth - 12, x));
    position.y = Math.max(12, Math.min(canvas.clientHeight - 12, y));
  }

  function fail() {
    if (!pending) return;
    pending = false;
    aiming = false;
    if (enabled) {
      canvas.focus({ preventScroll: true });
      onError();
    }
  }

  document.addEventListener('pointerlockchange', () => {
    const wasLocked = locked;
    locked = document.pointerLockElement === canvas;
    pending = false;
    aiming = false;
    if (locked && !enabled) {
      locked = false;
      document.exitPointerLock();
    }
    if (locked && !wasLocked) {
      canvas.focus({ preventScroll: true });
      const start = getInitialPosition();
      setPosition(start.x, start.y);
    }
    if (wasLocked && !locked && enabled) onUnlock();
  });
  document.addEventListener('pointerlockerror', fail);
  document.addEventListener('mousemove', event => {
    if (locked && enabled && (event.movementX || event.movementY)) {
      setPosition(position.x + event.movementX, position.y + event.movementY);
      aiming = true;
    }
  });
  window.addEventListener('resize', () => setPosition(position.x, position.y));

  return {
    position,
    setPosition,
    get locked() { return locked; },
    get aiming() { return locked && aiming; },
    resetAim() { aiming = false; },
    setEnabled(value) {
      enabled = value;
      if (!enabled) {
        aiming = false;
        pending = false;
        if (document.pointerLockElement === canvas) document.exitPointerLock();
      }
    },
    request() {
      if (!enabled || locked || pending || !canvas.requestPointerLock) return;
      pending = true;
      try {
        // Older browsers return void; newer ones return a Promise.
        canvas.requestPointerLock()?.catch(fail);
      } catch { fail(); }
    }
  };
}
