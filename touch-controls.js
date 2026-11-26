// Each control owns its pointer so moving and spraying work with two thumbs.
export function createTouchControls({ zone, stick, thumb, home, fireZone, fireButton, fireHome, getAimHeading, onFireStart, onRunnerDodge, onFireCancel = () => {}, onInput = () => {} }) {
  const radius = 44;
  const deadzone = 0.1;
  const aimDeadzone = 16;
  const input = { x: 0, z: 0, aimX: 0, aimZ: 0, firing: false, airborne: false };
  let enabled = false;
  let movePointer = null, firePointer = null;
  let originX = 0, originY = 0;
  let moveStartX = 0, moveStartY = 0, moveSwipe = false;
  let fireStartX = 0, fireStartY = 0, fireSwipe = false;
  let aimBaseX = 0, aimBaseY = 0, homeX = 0, homeY = 0;
  let aimHeading = null, flickX = null;
  const flickSamples = [];

  function resetMove() {
    const pointer = movePointer;
    movePointer = null;
    moveSwipe = false;
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
    flickX = null;
    flickSamples.length = 0;
    fireSwipe = false;
    aimBaseX = homeX; aimBaseY = homeY;
    fireButton.classList.toggle('returning', !immediate);
    drawAim(0, 0);
    fireButton.classList.remove('pressed');
    fireButton.classList.remove('aiming-up');
    if (pointer !== null && fireZone.hasPointerCapture(pointer)) fireZone.releasePointerCapture(pointer);
  }

  function reset() {
    resetMove();
    resetFire(true);
    aimHeading = null;
  }

  function move(event) {
    if (event.pointerId !== movePointer) return;
    event.preventDefault();
    const swipeX = event.clientX - moveStartX, swipeY = event.clientY - moveStartY;
    // Handle a short lane swipe here instead of waiting for the next simulation frame.
    if (!moveSwipe && Math.abs(swipeX) >= 32 && Math.abs(swipeX) > Math.abs(swipeY)) {
      moveSwipe = onRunnerDodge?.(Math.sign(swipeX)) === true;
    }
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
    input.x = !moveSwipe && length ? dx / length * strength : 0;
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
    moveStartX = event.clientX;
    moveStartY = event.clientY;
    moveSwipe = false;
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
    fireZone.addEventListener(name, event => {
      if (event.pointerId === firePointer) resetFire();
    });
  }

  function setAim(heading) {
    aimHeading = heading;
    input.aimX = Math.sin(heading);
    input.aimZ = Math.cos(heading);
  }

  function aim(event) {
    const { clientX: x, clientY: y, timeStamp: time } = event;
    while (flickSamples.length && flickSamples[0].time < time - 120) flickSamples.shift();
    let flick = 0;
    let fastVerticalDrag = false;
    for (let i = flickSamples.length - 1; i >= 0; i--) {
      const sample = flickSamples[i];
      const dy = y - sample.y;
      const duration = Math.max(16, time - sample.time);
      if (Math.abs(dy) >= 8 && Math.abs(dy) >= Math.abs(x - sample.x) * 1.5 && Math.abs(dy) / duration >= .42) {
        fastVerticalDrag = true;
        if (Math.abs(dy) < 24) continue;
        flick = Math.sign(dy);
        break;
      }
    }
    if (flick) flickSamples.length = 0;
    if (flickSamples.at(-1)?.time !== time) flickSamples.push({ x, y, time });

    if (flick) {
      flickX = aimBaseX = x;
      aimBaseY = y;
      drawAim(0, 0);
      const airborne = flick < 0;
      if (airborne !== input.airborne) {
        input.airborne = airborne;
        fireButton.classList.toggle('aiming-up', airborne);
        onFireStart(airborne, aimHeading, false);
      }
      return;
    }
    if (flickX !== null && Math.abs(x - flickX) < aimDeadzone) {
      aimBaseY = y;
      drawAim(x - aimBaseX, 0);
      return;
    }
    flickX = null;
    let dx = x - aimBaseX, dy = y - aimBaseY;
    const distance = Math.hypot(dx, dy);
    if (distance > radius) {
      dx *= radius / distance;
      dy *= radius / distance;
      aimBaseX = x - dx;
      aimBaseY = y - dy;
    }
    if (distance >= aimDeadzone && !fastVerticalDrag) setAim(Math.atan2(dx, dy));
    drawAim(dx, dy);
  }

  fireZone.addEventListener('pointerdown', event => {
    if (!enabled || firePointer !== null || event.button !== 0 || event.pointerType === 'mouse') return;
    event.preventDefault();
    firePointer = event.pointerId;
    fireStartX = event.clientX;
    fireStartY = event.clientY;
    fireSwipe = false;
    const homeBounds = fireHome.getBoundingClientRect();
    homeX = homeBounds.left + homeBounds.width / 2;
    homeY = homeBounds.top + homeBounds.height / 2;
    aimBaseX = event.clientX;
    aimBaseY = event.clientY;
    flickSamples.push({ x: event.clientX, y: event.clientY, time: event.timeStamp });
    fireButton.classList.remove('returning');
    fireButton.classList.add('pressed');
    fireZone.setPointerCapture(firePointer);
    setAim(getAimHeading(aimHeading));
    input.firing = true;
    drawAim(0, 0);
    onInput();
    onFireStart(false, aimHeading, true);
  });
  fireZone.addEventListener('pointermove', event => {
    if (event.pointerId !== firePointer) return;
    event.preventDefault();
    const dx = event.clientX - fireStartX, dy = event.clientY - fireStartY;
    // A horizontal swipe on the firing side is a dodge, not a spray gesture.
    if (!fireSwipe && Math.abs(dx) >= 32 && Math.abs(dx) > Math.abs(dy)
      && onRunnerDodge?.(Math.sign(dx)) === true) {
      fireSwipe = true;
      input.firing = false;
      input.airborne = false;
      input.aimX = input.aimZ = 0;
      fireButton.classList.remove('pressed', 'aiming-up');
      drawAim(0, 0);
      onFireCancel();
      return;
    }
    if (fireSwipe) return;
    aim(event);
  });
  for (const element of [zone, fireZone]) {
    element.addEventListener('contextmenu', event => event.preventDefault());
  }
  window.addEventListener('blur', reset);
  window.addEventListener('resize', reset);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) reset();
  });

  return {
    input,
    get aimHeading() { return aimHeading; },
    reset,
    setEnabled(value) {
      enabled = value;
      zone.parentElement.classList.toggle('enabled', value);
      reset();
    }
  };
}
