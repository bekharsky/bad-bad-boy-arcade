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

function setup({ withHome = false } = {}) {
  globalThis.window = new EventTarget();
  globalThis.document = new EventTarget();
  const zone = new Element(), stick = new Element(), thumb = new Element(), fireButton = new Element(), fireHome = new Element();
  const home = withHome ? new Element() : undefined;
  if (home) home.getBoundingClientRect = () => ({ left: 40, top: 220, width: 112, height: 112 });
  zone.parentElement = new Element();
  fireButton.parentElement = zone.parentElement;
  zone.parentElement.getBoundingClientRect = () => ({ left: 0, top: 0, right: 400, bottom: 460 });
  fireButton.getBoundingClientRect = fireHome.getBoundingClientRect = () => ({ left: 256, top: 256, width: 88, height: 88 });
  let bursts = 0;
  let inputs = 0;
  const shots = [];
  const controls = createTouchControls({
    zone, stick, thumb, home, fireButton, fireHome,
    onFireStart(airborne, heading, fresh) { shots.push({ airborne, heading }); if (fresh) bursts++; },
    onInput: () => inputs++,
  });
  controls.setEnabled(true);
  return { controls, zone, stick, thumb, fireButton, shots, bursts: () => bursts, inputs: () => inputs };
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
  const { zone, controls, fireButton, bursts } = setup();
  pointer(zone, 'pointerdown');
  pointer(zone, 'pointermove', 1, 144, 200);
  pressAim(fireButton, 2);
  pointer(fireButton, 'pointerdown', 3);
  pointer(fireButton, 'pointerup', 3);
  pointer(zone, 'pointerdown', 4);
  pointer(zone, 'pointermove', 4, 0, 0);
  pointer(zone, 'pointerup', 4);
  assert.equal(controls.input.x, 1);
  assert.equal(controls.input.firing, true);
  assert.equal(bursts(), 1);
  pointer(fireButton, 'pointerup', 2);
  assert.equal(controls.input.firing, false);
  assert.equal(controls.input.x, 1);
  pressAim(fireButton, 5);
  pointer(zone, 'pointerup', 1);
  assert.equal(controls.input.x, 0);
  assert.equal(controls.input.firing, true);
});

test('release, cancellation, and lost capture clear movement and firing', () => {
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    const { zone, stick, controls, fireButton } = setup();
    pointer(zone, 'pointerdown');
    pointer(zone, 'pointermove', 1, 100, 156);
    assert.equal(controls.input.z, -1);
    pressAim(fireButton, 2);
    pointer(zone, event);
    pointer(fireButton, event, 2);
    assert.deepEqual(controls.input, idle);
    assert.equal(stick.hidden, true);
    assert.equal(zone.captures.size, 0);
    assert.equal(fireButton.captures.size, 0);
  }
});

test('blur, resize, and backgrounding reset both controls', () => {
  for (const event of ['blur', 'resize', 'visibilitychange']) {
    const { zone, controls, fireButton } = setup();
    pointer(zone, 'pointerdown');
    pointer(zone, 'pointermove', 1, 144, 200);
    pressAim(fireButton, 2);
    if (event === 'visibilitychange') {
      document.hidden = true;
      document.dispatchEvent(new Event(event));
    } else window.dispatchEvent(new Event(event));
    assert.deepEqual(controls.input, idle);
  }
});

test('disabled controls ignore input and a new round starts cleanly', () => {
  const { zone, controls, fireButton, stick, bursts } = setup();
  pointer(zone, 'pointerdown');
  pressAim(fireButton, 2);
  controls.setEnabled(false);
  pointer(zone, 'pointerdown', 3);
  pointer(fireButton, 'pointerdown', 4);
  assert.deepEqual(controls.input, idle);
  assert.equal(stick.hidden, true);
  assert.equal(bursts(), 1);
  controls.setEnabled(true);
  pointer(zone, 'pointerdown', 5);
  assert.equal(stick.hidden, false);
});


test('vertical speed and diagonal lane input preserve independent spray and release resets both axes', () => {
  const { controls, zone, thumb, fireButton } = setup();
  pointer(zone, 'pointerdown');
  pointer(zone, 'pointermove', 1, 100, 400);
  assert.deepEqual(controls.input, { ...idle, z: 1 });
  pointer(zone, 'pointermove', 1, 144, 200);
  assert.equal(controls.input.x, 1); assert.equal(controls.input.z, 0);
  assert.equal(thumb.style.transform, 'translate(44px, 0px)');
  pressAim(fireButton, 2);
  pointer(zone, 'pointermove', 1, 56, 156);
  assert.ok(controls.input.x < -.7 && controls.input.z < -.7);
  assert.equal(controls.input.firing, true);
  pointer(zone, 'pointerup'); assert.deepEqual(controls.input, { ...idle, aimX: 30 / 44, firing: true });
  pointer(zone, 'pointerdown', 3);
  pointer(zone, 'pointermove', 3, 100, 156);
  assert.equal(controls.input.z, -1);
});

test('the right stick starts at home, auto-fires past its deadzone and follows a long drag', () => {
  const { controls, zone, fireButton, bursts } = setup();
  pointer(zone, 'pointerdown'); pointer(zone, 'pointermove', 1, 144, 200);
  pointer(fireButton, 'pointerdown', 2, 300, 300, 0);
  assert.equal(controls.input.firing, false);
  pointer(fireButton, 'pointermove', 2, 310, 300, 50);
  assert.ok(controls.input.aimX > .15 && !controls.input.firing);
  pointer(fireButton, 'pointermove', 2, 369, 300, 100);
  assert.equal(controls.input.aimX, 1);
  assert.equal(controls.input.firing, true);
  assert.equal(fireButton.style['--aim-base-x'], '25px');
  assert.equal(fireButton.style['--aim-thumb-x'], '44px');
  assert.equal(controls.input.x, 1); assert.equal(bursts(), 1);
  pointer(fireButton, 'pointerup', 2);
  assert.equal(fireButton.style['--aim-base-x'], '0px');
  assert.ok(fireButton.classes.has('returning'));
  assert.deepEqual(controls.input, { ...idle, x: 1 });
});

test('a fast upward flick raises the spray from a held aim or a fresh touch', () => {
  const { controls, fireButton, bursts } = setup();
  pointer(fireButton, 'pointerdown', 2, 330, 300, 0);
  pointer(fireButton, 'pointermove', 2, 330, 265, 120);
  assert.equal(controls.input.airborne, false, 'A slow drag aims along the ground');
  pointer(fireButton, 'pointermove', 2, 330, 229, 160);
  assert.equal(controls.input.airborne, true);
  assert.equal(controls.input.firing, true);
  assert.equal(bursts(), 1, 'Pitch changes preserve a held charge');
  pointer(fireButton, 'pointermove', 2, 330, 240, 180);
  assert.equal(controls.input.airborne, true);
  pointer(fireButton, 'pointermove', 2, 330, 265, 210);
  assert.equal(controls.input.airborne, false, 'A downward flick lowers the spray');
  pointer(fireButton, 'pointerup', 2);
  pointer(fireButton, 'pointerdown', 3, 300, 300, 300);
  pointer(fireButton, 'pointermove', 3, 300, 258, 340);
  assert.equal(controls.input.airborne, true);
  assert.equal(bursts(), 2);
  pointer(fireButton, 'pointercancel', 3);
  assert.equal(controls.input.airborne, false);
  assert.equal(fireButton.classes.has('aiming-up'), false);
});

test('a flick across the centre still produces a short upward shot', () => {
  const { controls, fireButton, shots } = setup();
  pointer(fireButton, 'pointerdown', 2, 300, 334, 0);
  pointer(fireButton, 'pointermove', 2, 300, 300, 30);
  assert.equal(controls.input.firing, false, 'The centred stick does not keep firing');
  assert.deepEqual(shots.map(shot => shot.airborne), [false, true]);
});
