import assert from 'node:assert/strict';
import test from 'node:test';
import { createTouchControls } from '../touch-controls.js';

class Element extends EventTarget {
  hidden = false;
  style = { setProperty(name, value) { this[name] = value; } };
  classes = new Set();
  captures = new Set();
  classList = {
    add: name => this.classes.add(name),
    remove: name => this.classes.delete(name),
    toggle: (name, value) => value ? this.classes.add(name) : this.classes.delete(name)
  };
  getBoundingClientRect() { return { left: 10, top: 120 }; }
  setPointerCapture(id) { this.captures.add(id); }
  hasPointerCapture(id) { return this.captures.has(id); }
  releasePointerCapture(id) {
    this.captures.delete(id);
    pointer(this, 'lostpointercapture', id);
  }
}

function pointer(element, type, pointerId = 1, clientX = 100, clientY = 200, timeStamp) {
  const event = new Event(type, { cancelable: true });
  Object.assign(event, { pointerId, clientX, clientY, button: 0 });
  if (timeStamp !== undefined) Object.defineProperty(event, 'timeStamp', { value: timeStamp });
  element.dispatchEvent(event);
}

function setup({ withHome = false, heading = 0 } = {}) {
  globalThis.window = new EventTarget();
  globalThis.document = new EventTarget();
  const zone = new Element(), stick = new Element(), thumb = new Element(), fireZone = new Element(), fireButton = new Element(), fireHome = new Element();
  const home = withHome ? new Element() : undefined;
  if (home) home.getBoundingClientRect = () => ({ left: 40, top: 220, width: 112, height: 112 });
  zone.parentElement = new Element();
  fireHome.getBoundingClientRect = () => ({ left: 256, top: 256, width: 88, height: 88 });
  let bursts = 0;
  let inputs = 0;
  const shots = [];
  const controls = createTouchControls({
    zone, stick, thumb, home, fireZone, fireButton, fireHome,
    getAimHeading: previous => previous ?? heading,
    onFireStart(airborne, heading, fresh) { shots.push({ airborne, heading }); if (fresh) bursts++; },
    onInput: () => inputs++,
  });
  controls.setEnabled(true);
  return { controls, zone, stick, thumb, fireZone, fireButton, shots, bursts: () => bursts, inputs: () => inputs };
}

const idle = { x: 0, z: 0, aimX: 0, aimZ: 0, firing: false, airborne: false };

function pressAim(button, id) {
  pointer(button, 'pointerdown', id, 330, 300);
}

test('joystick starts under the finger, ignores jitter, and supports analog speed', () => {
  const { zone, stick, controls } = setup();
  pointer(zone, 'pointerdown');
  assert.equal(stick.hidden, false);
  assert.equal(stick.style.left, '90px');
  assert.equal(stick.style.top, '80px');
  pointer(zone, 'pointermove', 1, 103, 200);
  assert.equal(controls.input.x, 0);
  pointer(zone, 'pointermove', 1, 122, 200);
  assert.ok(controls.input.x > .4 && controls.input.x < .5);
  assert.equal(controls.input.z, 0);
});

test('joystick responds promptly after the deadzone and reaches full speed at the edge', () => {
  const { zone, controls } = setup();
  pointer(zone, 'pointerdown');
  let previous = 0;
  for (const distance of [6, 10, 16, 22, 30, 38, 44]) {
    pointer(zone, 'pointermove', 1, 100 + distance, 200);
    assert.ok(controls.input.x > previous);
    previous = controls.input.x;
    assert.equal(controls.input.z, 0);
    if (distance <= 10) assert.ok(controls.input.x < .15);
  }
  assert.equal(controls.input.x, 1);
});

test('long drags keep the base stable, cap diagonal speed, and reverse across the neutral point', () => {
  const { zone, stick, controls } = setup();
  pointer(zone, 'pointerdown');
  pointer(zone, 'pointermove', 1, 300, 400);
  assert.ok(Math.abs(Math.hypot(controls.input.x, controls.input.z) - 1) < 1e-10);
  assert.equal(stick.style.left, '90px');
  assert.equal(stick.style.top, '80px');
  pointer(zone, 'pointermove', 1, 80, 180);
  assert.ok(controls.input.x < 0 && controls.input.z < 0);
});

test('pressing the visible stick uses its centre; touching elsewhere creates a floating origin', () => {
  const { zone, stick, controls, inputs } = setup({ withHome: true });
  pointer(zone, 'pointerdown', 1, 120, 276);
  assert.equal(stick.style.left, '86px');
  assert.equal(stick.style.top, '156px');
  assert.ok(controls.input.x > .4, 'An edge press starts moving without another drag');
  assert.equal(controls.input.z, 0);
  pointer(zone, 'pointerup', 1);
  pointer(zone, 'pointerdown', 2, 200, 150);
  assert.equal(stick.style.left, '190px');
  assert.equal(stick.style.top, '30px');
  assert.equal(controls.input.x, 0);
  assert.equal(controls.input.z, 0);
  assert.equal(inputs(), 2);
});

test('movement and spray keep separate pointers, including extra fingers and releases', () => {
  const { zone, controls, fireZone, bursts } = setup();
  pointer(zone, 'pointerdown');
  pointer(zone, 'pointermove', 1, 144, 200);
  pressAim(fireZone, 2);
  pointer(fireZone, 'pointerdown', 3);
  pointer(fireZone, 'pointerup', 3);
  pointer(zone, 'pointerdown', 4);
  pointer(zone, 'pointermove', 4, 0, 0);
  pointer(zone, 'pointerup', 4);
  assert.equal(controls.input.x, 1);
  assert.equal(controls.input.firing, true);
  assert.equal(bursts(), 1);
  pointer(fireZone, 'pointerup', 2);
  assert.equal(controls.input.firing, false);
  assert.equal(controls.input.x, 1);
  pressAim(fireZone, 5);
  pointer(zone, 'pointerup', 1);
  assert.equal(controls.input.x, 0);
  assert.equal(controls.input.firing, true);
});

test('release, cancellation, and lost capture clear movement and firing', () => {
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    const { zone, stick, controls, fireZone } = setup();
    pointer(zone, 'pointerdown');
    pointer(zone, 'pointermove', 1, 100, 156);
    assert.equal(controls.input.z, -1);
    pressAim(fireZone, 2);
    pointer(zone, event);
    pointer(fireZone, event, 2);
    assert.deepEqual(controls.input, idle);
    assert.equal(stick.hidden, true);
    assert.equal(zone.captures.size, 0);
    assert.equal(fireZone.captures.size, 0);
  }
});

test('blur, resize, and backgrounding reset both controls', () => {
  for (const event of ['blur', 'resize', 'visibilitychange']) {
    const { zone, controls, fireZone } = setup();
    pointer(zone, 'pointerdown');
    pointer(zone, 'pointermove', 1, 144, 200);
    pressAim(fireZone, 2);
    if (event === 'visibilitychange') {
      document.hidden = true;
      document.dispatchEvent(new Event(event));
    } else window.dispatchEvent(new Event(event));
    assert.deepEqual(controls.input, idle);
  }
});

test('disabled controls ignore input and a new round starts cleanly', () => {
  const { zone, controls, fireZone, stick, bursts } = setup();
  pointer(zone, 'pointerdown');
  pressAim(fireZone, 2);
  controls.setEnabled(false);
  pointer(zone, 'pointerdown', 3);
  pointer(fireZone, 'pointerdown', 4);
  assert.deepEqual(controls.input, idle);
  assert.equal(stick.hidden, true);
  assert.equal(bursts(), 1);
  controls.setEnabled(true);
  pointer(zone, 'pointerdown', 5);
  assert.equal(stick.hidden, false);
});


test('vertical speed and diagonal lane input preserve independent spray and release resets both axes', () => {
  const { controls, zone, thumb, fireZone } = setup();
  pointer(zone, 'pointerdown');
  pointer(zone, 'pointermove', 1, 100, 400);
  assert.deepEqual(controls.input, { ...idle, z: 1 });
  pointer(zone, 'pointermove', 1, 144, 200);
  assert.equal(controls.input.x, 1); assert.equal(controls.input.z, 0);
  assert.equal(thumb.style.transform, 'translate(44px, 0px)');
  pressAim(fireZone, 2);
  pointer(zone, 'pointermove', 1, 56, 156);
  assert.ok(controls.input.x < -.7 && controls.input.z < -.7);
  assert.equal(controls.input.firing, true);
  pointer(zone, 'pointerup'); assert.deepEqual(controls.input, { ...idle, aimZ: 1, firing: true });
  pointer(zone, 'pointerdown', 3);
  pointer(zone, 'pointermove', 3, 100, 156);
  assert.equal(controls.input.z, -1);
});

test('each touch fires from its own origin and reuses the last aim across bursts', () => {
  const { controls, zone, fireZone, fireButton, shots, bursts } = setup({ heading: .7 });
  pointer(zone, 'pointerdown'); pointer(zone, 'pointermove', 1, 144, 200);
  pointer(fireZone, 'pointerdown', 2, 260, 180, 0);
  assert.equal(controls.input.firing, true);
  assert.equal(controls.aimHeading, .7);
  assert.deepEqual(shots, [{ airborne: false, heading: .7 }]);
  assert.equal(fireButton.style['--aim-base-x'], '-40px');
  assert.equal(fireButton.style['--aim-base-y'], '-120px');
  pointer(fireZone, 'pointermove', 2, 270, 180, 50);
  assert.equal(controls.aimHeading, .7, 'A small shift keeps the previous heading');
  pointer(fireZone, 'pointermove', 2, 329, 180, 100);
  assert.equal(controls.input.aimX, 1);
  assert.equal(controls.aimHeading, Math.PI / 2);
  assert.equal(fireButton.style['--aim-base-x'], '-15px');
  assert.ok(Math.abs(parseFloat(fireButton.style['--aim-thumb-x']) - 44) < 1e-10);
  assert.equal(controls.input.x, 1);
  assert.equal(bursts(), 1, 'Steering leaves a held charge intact');
  pointer(fireZone, 'pointerup', 2);
  assert.equal(fireButton.style['--aim-base-x'], '0px');
  assert.ok(fireButton.classes.has('returning'));
  assert.deepEqual(controls.input, { ...idle, x: 1 });
  for (const [id, x, y, time] of [[3, 375, 390, 120], [4, 220, 190, 170]]) {
    pointer(fireZone, 'pointerdown', id, x, y, time);
    assert.equal(controls.input.firing, true);
    assert.equal(fireButton.style['--aim-base-x'], `${x - 300}px`);
    assert.deepEqual(shots.at(-1), { airborne: false, heading: Math.PI / 2 });
    pointer(fireZone, 'pointerup', id, x, y, time + 10);
    assert.equal(controls.input.firing, false);
  }
  assert.equal(bursts(), 3, 'Each tap starts a fresh burst');
});

test('a flick preserves horizontal aim while raising or lowering the spray', () => {
  const { controls, fireZone, fireButton, shots, bursts } = setup();
  pointer(fireZone, 'pointerdown', 2, 250, 300, 0);
  pointer(fireZone, 'pointermove', 2, 285, 300, 60);
  assert.equal(controls.aimHeading, Math.PI / 2);
  pointer(fireZone, 'pointermove', 2, 285, 285, 80);
  pointer(fireZone, 'pointermove', 2, 285, 266, 105);
  assert.equal(controls.input.airborne, true);
  assert.equal(controls.aimHeading, Math.PI / 2);
  assert.equal(controls.input.firing, true);
  assert.equal(bursts(), 1, 'Pitch changes preserve a held charge');
  pointer(fireZone, 'pointermove', 2, 286, 230, 245);
  assert.equal(controls.aimHeading, Math.PI / 2, 'Vertical follow-through keeps the same aim');
  pointer(fireZone, 'pointermove', 2, 286, 275, 285);
  assert.equal(controls.input.airborne, false);
  assert.deepEqual(shots.slice(-2), [
    { airborne: true, heading: Math.PI / 2 },
    { airborne: false, heading: Math.PI / 2 },
  ]);
  pointer(fireZone, 'pointerup', 2);
  pointer(fireZone, 'pointerdown', 3, 300, 300, 300);
  pointer(fireZone, 'pointermove', 3, 300, 258, 340);
  assert.equal(controls.input.airborne, true);
  assert.equal(controls.aimHeading, Math.PI / 2);
  assert.equal(bursts(), 2);
  pointer(fireZone, 'pointercancel', 3);
  assert.equal(controls.input.airborne, false);
  assert.equal(fireButton.classes.has('aiming-up'), false);
});

test('the first samples of a fast vertical swipe keep the old aim but a slow drag can aim north', () => {
  const { controls, fireZone } = setup({ heading: .7 });
  pointer(fireZone, 'pointerdown', 2, 300, 330, 0);
  pointer(fireZone, 'pointermove', 2, 300, 310, 30);
  assert.equal(controls.aimHeading, .7);
  assert.equal(controls.input.airborne, false);
  pointer(fireZone, 'pointermove', 2, 300, 300, 45);
  assert.equal(controls.aimHeading, .7);
  assert.equal(controls.input.airborne, true);
  pointer(fireZone, 'pointerup', 2);
  pointer(fireZone, 'pointerdown', 3, 330, 330, 100);
  pointer(fireZone, 'pointermove', 3, 330, 302, 230);
  assert.equal(controls.aimHeading, Math.PI);
  assert.equal(controls.input.airborne, false);
});
