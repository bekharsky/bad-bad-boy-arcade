// Each control owns its pointer so moving and spraying work with two thumbs.
export function createTouchControls({ zone, stick, thumb, home, fireButton, fireHome, onFireStart, onInput = () => {} }) {
  const radius = 44;
  const deadzone = 0.1;
  const input = { x: 0, z: 0, aimX: 0, aimZ: 0, firing: false, airborne: false };
  let enabled = false;
  let movePointer = null, firePointer = null;
  let originX = 0, originY = 0;
  let aimBaseX = 0, aimBaseY = 0, homeX = 0, homeY = 0, aimBounds;
  const flickSamples = [];

  function resetMove() {
    const pointer = movePointer;
    movePointer = null;
    input.x = input.z = 0;
    stick.hidden = true;
    thumb.style.transform = '';
    zone.classList.remove('engaged');
    if (pointer !== null && zone.hasPointerCapture(pointer)) zone.releasePointerCapture(pointer);
  }

  function drawAim(dx, dy) {
    fireButton.style.setProperty('--aim-base-x', `${aimBaseX - homeX}px`);
    fireButton.style.setProperty('--aim-base-y', `${aimBaseY - homeY}px`);
    fireButton.style.setProperty('--aim-thumb-x', `${dx}px`);
    fireButton.style.setProperty('--aim-thumb-y', `${dy}px`);
  }

  function resetFire(immediate = false) {
    const pointer = firePointer;
    firePointer = null;
    input.firing = false;
    input.airborne = false;
    input.aimX = input.aimZ = 0;
    flickSamples.length = 0;
    aimBaseX = homeX; aimBaseY = homeY;
    fireButton.classList.toggle('returning', !immediate);
    drawAim(0, 0);
    fireButton.classList.remove('pressed');
    fireButton.classList.remove('aiming-up');
    if (pointer !== null && fireButton.hasPointerCapture(pointer)) fireButton.releasePointerCapture(pointer);
  }

  function reset() {
    resetMove();
    resetFire(true);
  }

  function move(event) {
    if (event.pointerId !== movePointer) return;
    event.preventDefault();
    let dx = event.clientX - originX, dy = event.clientY - originY;
    const distance = Math.hypot(dx, dy);
    if (distance > radius) {
      // Keep a stable centre for the whole gesture, like a physical stick.
      // The thumb is clamped; long drags cannot move the neutral point.
      dx *= radius / distance;
      dy *= radius / distance;
    }
    const length = Math.min(distance, radius);
    const deflection = Math.max(0, (length / radius - deadzone) / (1 - deadzone));
    const strength = deflection;
    input.x = length ? dx / length * strength : 0;
    input.z = length ? dy / length * strength : 0;
    const bounds = zone.getBoundingClientRect();
    stick.style.left = `${originX - bounds.left}px`;
    stick.style.top = `${originY - bounds.top}px`;
    thumb.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  zone.addEventListener('pointerdown', event => {
    if (!enabled || movePointer !== null || event.button !== 0) return;
    event.preventDefault();
    movePointer = event.pointerId;
    originX = event.clientX;
    originY = event.clientY;
    const bounds = home?.getBoundingClientRect();
    if (bounds && Math.hypot(event.clientX - (bounds.left + bounds.width / 2), event.clientY - (bounds.top + bounds.height / 2)) <= bounds.width / 2) {
      originX = bounds.left + bounds.width / 2;
      originY = bounds.top + bounds.height / 2;
    }
    zone.setPointerCapture(movePointer);
    stick.hidden = false;
    zone.classList.add('engaged');
    onInput();
    move(event);
  });
  zone.addEventListener('pointermove', move);
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    zone.addEventListener(name, event => {
      if (event.pointerId === movePointer) resetMove();
    });
    fireButton.addEventListener(name, event => {
      if (event.pointerId === firePointer) resetFire();
    });
  }

  function aimAndFire(event) {
    const { clientX: x, clientY: y, timeStamp: time } = event;
    while (flickSamples.length && flickSamples[0].time < time - 120) flickSamples.shift();
    let flick = 0;
    for (let i = flickSamples.length - 1; i >= 0; i--) {
      const sample = flickSamples[i];
      const dy = y - sample.y;
      const duration = Math.max(16, time - sample.time);
      if (Math.abs(dy) >= 24 && Math.abs(dy) >= Math.abs(x - sample.x) * 1.5 && Math.abs(dy) / duration >= .42) {
        flick = Math.sign(dy);
        break;
      }
    }
    if (flick) flickSamples.length = 0;
    if (flickSamples.at(-1)?.time !== time) flickSamples.push({ x, y, time });

    let dx = x - aimBaseX, dy = y - aimBaseY;
    const distance = Math.hypot(dx, dy);
    if (distance > radius) {
      aimBaseX = Math.max(aimBounds.left + radius, Math.min(aimBounds.right - radius, x - dx / distance * radius));
      aimBaseY = Math.max(aimBounds.top + radius, Math.min(aimBounds.bottom - radius, y - dy / distance * radius));
      dx = x - aimBaseX; dy = y - aimBaseY;
      const length = Math.hypot(dx, dy);
      if (length > radius) { dx *= radius / length; dy *= radius / length; }
    }
    const strength = Math.hypot(dx, dy) / radius;
    const wasFiring = input.firing, wasAirborne = input.airborne;
    const previousHeading = input.aimX || input.aimZ ? Math.atan2(input.aimX, input.aimZ) : Math.PI;
    input.firing = strength >= (wasFiring ? .22 : .3);
    input.airborne = input.firing && (flick ? flick < 0 : wasAirborne);
    input.aimX = strength > .15 ? dx / radius : 0;
    input.aimZ = strength > .15 ? dy / radius : 0;
    drawAim(dx, dy);
    fireButton.classList.toggle('pressed', input.firing);
    fireButton.classList.toggle('aiming-up', input.airborne);
    const flickShot = flick < 0 && !wasAirborne;
    if (flickShot || (input.firing && !wasFiring)) {
      const heading = input.aimX || input.aimZ ? Math.atan2(input.aimX, input.aimZ) : previousHeading;
      onFireStart(flickShot || input.airborne, heading, !wasFiring);
    }
  }

  fireButton.addEventListener('pointerdown', event => {
    if (!enabled || firePointer !== null || event.button !== 0) return;
    event.preventDefault();
    firePointer = event.pointerId;
    const homeBounds = fireHome.getBoundingClientRect();
    const baseBounds = fireButton.getBoundingClientRect();
    aimBounds = fireButton.parentElement.getBoundingClientRect();
    homeX = homeBounds.left + homeBounds.width / 2;
    homeY = homeBounds.top + homeBounds.height / 2;
    aimBaseX = baseBounds.left + baseBounds.width / 2;
    aimBaseY = baseBounds.top + baseBounds.height / 2;
    flickSamples.push({ x: event.clientX, y: event.clientY, time: event.timeStamp });
    fireButton.classList.remove('returning');
    fireButton.setPointerCapture(firePointer);
    onInput();
    aimAndFire(event);
  });
  fireButton.addEventListener('pointermove', event => {
    if (event.pointerId !== firePointer) return;
    event.preventDefault();
    aimAndFire(event);
  });
  for (const element of [zone, fireButton]) {
    element.addEventListener('contextmenu', event => event.preventDefault());
  }
  window.addEventListener('blur', reset);
  window.addEventListener('resize', reset);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) reset();
  });

  return {
    input,
    reset,
    setEnabled(value) {
      enabled = value;
      zone.parentElement.classList.toggle('enabled', value);
      reset();
    }
  };
}
