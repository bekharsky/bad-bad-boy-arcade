import assert from 'node:assert/strict';
import test from 'node:test';
import { movePlayer } from '../movement.js';

function setup({ heading = 0, codes = [], touch = { x: 0, z: 0 }, firing = false } = {}) {
  const player = { x: 0, z: 0, heading, turnSpeed: 0, moveSpeed: 0, speed: 3.6, radius: .5, runTime: 0, root: { rotation: {} } };
  const city = { move(entity, dx, dz) { entity.x += dx; entity.z += dz; } };
  const input = { keys: new Set(codes), touch, firing, dt: 1 / 60, height: 3.45 };
  const step = (frames = 1) => { for (let i = 0; i < frames; i++) movePlayer(player, city, input); };
  return { player, city, input, step };
}

test('forward and reverse use the current heading without turning the hero', () => {
  for (const heading of [0, .7, Math.PI]) {
    for (const [code, sign] of [['ArrowUp', 1], ['ArrowDown', -1]]) {
      const { player, step } = setup({ heading, codes: [code] });
      step();
      assert.ok(sign * (player.x * Math.sin(heading) + player.z * Math.cos(heading)) > 0);
      assert.ok(Math.abs(player.x * Math.cos(heading) - player.z * Math.sin(heading)) < 1e-10);
      assert.equal(player.heading, heading);
    }
  }
});

test('reversing WASD brakes before changing travel and keeps the shot ahead', () => {
  const { player, input, step } = setup({ heading: Math.PI, codes: ['KeyW'], firing: true });
  input.steerWithMouse = true;
  input.cursorHeading = Math.PI;
  step(30);
  const before = player.z;
  const incomingSpeed = player.moveSpeed;
  input.keys = new Set(['KeyS']);
  step();
  assert.ok(player.z < before);
  assert.ok(player.moveSpeed < incomingSpeed);
  step(15);
  assert.ok(player.z > before && Math.abs(player.x) < 1e-10);
  assert.equal(player.dz, -1);
  assert.equal(player.root.rotation.y, player.heading);
});

test('changing WASD direction rounds the corner without moving the aim', () => {
  const { player, input, step } = setup({ codes: ['KeyW'], heading: .4 });
  input.steerWithMouse = true;
  input.cursorHeading = .4;
  step(60);
  const before = { x: player.x, z: player.z };
  input.keys = new Set(['KeyD']);
  step();
  assert.ok(player.x > before.x && player.z < before.z);
  assert.ok(player.moveX > 0 && player.moveX < .16 && player.moveZ < -.98);
  step(45);
  assert.ok(player.moveX > .999 && Math.abs(player.moveZ) < .001);
  assert.equal(player.heading, .4);
});

test('the right touch stick aims independently while the left stick moves', () => {
  const { player, input, step } = setup({ touch: { x: 0, z: -1, aimX: 1, aimZ: 0 }, firing: true });
  step(32);
  assert.ok(player.z < -.7 && player.x === 0);
  assert.ok(player.dx > .999 && Math.abs(player.dz) < .001);
  input.touch = { x: 0, z: -1 };
  input.touchHeading = Math.PI / 2;
  input.firing = false;
  const before = player.z;
  step(24);
  assert.ok(player.z < before - .9 && player.x === 0);
  assert.ok(Math.abs(player.heading - Math.PI / 2) < .001);
  input.touchHeading = -Math.PI / 2;
  step();
  assert.ok(player.heading > 1.3 && player.heading < 1.5, 'The hero starts to turn without snapping after the finger lifts');
  step(36);
  assert.ok(Math.abs(player.heading + Math.PI / 2) < .002, 'A final aim change is retained after the finger lifts');
  assert.equal(player.x, 0);
});

test('direct facing takes the short path across the angle boundary', () => {
  const heading = Math.PI - .02;
  const { player, step } = setup({ heading });
  player.targetHeading = -Math.PI + .02;
  step();
  const change = Math.atan2(Math.sin(player.heading - heading), Math.cos(player.heading - heading));
  assert.ok(change > 0 && change <= .04 + 1e-10);
  assert.ok(Math.abs(player.heading - (-Math.PI + .02)) < .0001);
});

test('keyboard turn acceleration is frame-rate independent and stops when released', () => {
  const headings = [];
  for (const fps of [30, 60, 120]) {
    const { player, input, step } = setup({ codes: ['ArrowRight'] });
    input.dt = 1 / fps;
    step(fps / 2);
    headings.push(player.heading);
    assert.ok(player.heading < -1);
    input.keys.clear();
    step(fps);
    assert.equal(player.heading, headings.at(-1));
  }
  assert.ok(Math.max(...headings) - Math.min(...headings) < 1e-10);
});

test('touch aim eases into small corrections at the same rate while firing at any FPS', () => {
  for (const fps of [30, 60, 120]) {
    const angle = .05;
    const { player, input, step } = setup({
      touch: { x: 0, z: -1, aimX: Math.sin(angle) * .25, aimZ: Math.cos(angle) * .25 }, firing: true,
    });
    input.dt = 1 / fps;
    step();
    assert.ok(player.heading > 0 && player.heading < angle);
    step(fps / 5 - 1);
    assert.ok(Math.abs(player.heading - angle * (1 - Math.exp(-4))) < 1e-10);
    assert.equal(player.dx, Math.sin(player.heading));
    assert.equal(player.dz, Math.cos(player.heading));
  }
});

test('a sudden half turn from the right stick stays smooth and takes the short path across the angle boundary', () => {
  for (const fps of [30, 60, 120]) {
    const heading = 2.8, target = -.35;
    const { player, input, step } = setup({ heading, touch: { x: 0, z: 0 }, firing: true });
    input.touchHeading = target;
    input.dt = 1 / fps;
    for (let frame = 0; frame < fps / 2; frame++) {
      const before = player.heading;
      step();
      const turn = Math.atan2(Math.sin(player.heading - before), Math.cos(player.heading - before));
      assert.ok(turn > 0 && turn <= 10 / fps + 1e-10);
    }
    assert.ok(Math.abs(player.heading - target) < .005);
  }
});

test('releasing forward movement stops within eight centimetres at full speed', () => {
  const { player, input, step } = setup({ codes: ['KeyW'] });
  step(120);
  const before = player.z;
  input.keys.clear();
  step(60);
  assert.equal(player.moveSpeed, 0);
  const coast = Math.abs(player.z - before);
  assert.ok(coast > 0 && coast < .08);
});

test('diagonal WASD movement and combined arrow throttle stay within the normal speed cap', () => {
  const straight = setup({ codes: ['KeyW'] });
  const diagonal = setup({ codes: ['KeyW', 'KeyA'] });
  const combined = setup({ heading: 0, codes: ['KeyA', 'ArrowUp'] });
  straight.step(60); diagonal.step(60); combined.step(60);
  for (const { player } of [diagonal, combined]) {
    assert.ok(Math.abs(Math.hypot(player.x, player.z) - Math.abs(straight.player.z)) < 1e-10);
    assert.equal(player.moveSpeed, straight.player.moveSpeed);
    assert.ok(player.x < 0);
  }
  assert.ok(diagonal.player.z < 0 && combined.player.z > 0);
});

test('direct joystick preserves analog speed and takes priority over keyboard input', () => {
  const slow = setup({ touch: { x: .25, z: 0 }, codes: ['KeyW'] });
  const fast = setup({ touch: { x: 1, z: 0 } });
  slow.step(60); fast.step(60);
  assert.ok(Math.abs(slow.player.x / fast.player.x - .25) < 1e-10);
  assert.ok(Math.abs(slow.player.z) < 1e-10);
});

test('Tank turning accelerates smoothly, reverses promptly and stops without drift', () => {
  const { player, input, step } = setup({ codes: ['ArrowRight'], firing: true });
  step();
  const firstTurn = -player.heading;
  assert.ok(firstTurn > 0 && firstTurn < Math.PI / 180);
  step();
  assert.ok(-player.heading - firstTurn > firstTurn);
  step(28);
  assert.ok(player.heading < -.4);
  const beforeReverse = player.heading;
  input.keys = new Set(['ArrowLeft']);
  step();
  assert.ok(player.heading > beforeReverse);
  const beforeRelease = player.heading;
  input.keys.clear();
  step(30);
  assert.equal(player.heading, beforeRelease);
  assert.equal(player.turnSpeed, 0);
});

test('tank controls turn in place and back up without changing the facing direction', () => {
  const turn = setup({ codes: ['ArrowRight'] });
  turn.step(30);
  assert.ok(turn.player.heading < 0);
  assert.equal(turn.player.x, 0);
  assert.equal(turn.player.z, 0);
  turn.input.keys.clear();
  const heading = turn.player.heading;
  turn.step();
  assert.equal(turn.player.heading, heading);
  const reverse = setup({ heading: Math.PI, codes: ['ArrowDown'] });
  reverse.step(30);
  assert.ok(reverse.player.z > 0);
  assert.ok(Math.abs(reverse.player.heading - Math.PI) < 1e-10);
  assert.ok(reverse.player.moveSpeed > 0);
});

test('the virtual joystick stays directional while the arrows are held', () => {
  const { player, step } = setup({ codes: ['ArrowLeft', 'ArrowDown'], touch: { x: .5, z: -.5 } });
  step(30);
  assert.equal(player.heading, 0);
  assert.ok(player.moveSpeed > 0);
  assert.ok(player.x > 0 && player.z < 0);
});

test('full stick deflections trace the same path as WASD through corners and reversals', () => {
  for (const fps of [30, 60, 120]) {
    const heading = .7;
    const touch = setup({ heading, firing: true });
    const desktop = setup({ heading, firing: true });
    touch.input.dt = desktop.input.dt = 1 / fps;
    desktop.input.steerWithMouse = true;
    desktop.input.cursorHeading = heading;
    for (const [code, x, z] of [['KeyW', 0, -1], ['KeyD', 1, 0], ['KeyA', -1, 0], ['KeyS', 0, 1]]) {
      touch.input.touch = { x, z };
      desktop.input.keys = new Set([code]);
      for (let frame = 0; frame < fps / 2; frame++) {
        touch.step();
        desktop.step();
        assert.equal(touch.player.x, desktop.player.x);
        assert.equal(touch.player.z, desktop.player.z);
        assert.equal(touch.player.heading, heading);
      }
    }
  }
});

test('a mouse shot changes facing but preserves travel and returns facing to the keys when it ends', () => {
  const { player, input, step } = setup({ heading: Math.PI, codes: ['KeyW'], firing: true });
  input.shotHeading = .37;
  step();
  assert.ok(Math.abs(player.heading - .37) < 1e-10);
  assert.ok(player.z < 0);
  assert.ok(Math.abs(player.x) < 1e-10);
  input.shotHeading = null;
  input.firing = false;
  step(25);
  assert.equal(player.heading, Math.PI);
  assert.ok(Math.abs(player.x) < 1e-10);
});

test('a standing mouse shot turns immediately and leaves that facing for the next keyboard shot', () => {
  const { player, input, step } = setup({ firing: true });
  input.shotHeading = -1.23;
  step();
  assert.ok(Math.abs(player.heading + 1.23) < 1e-10);
  assert.equal(player.x, 0);
  assert.equal(player.z, 0);
  input.shotHeading = null;
  input.keys.add('Space');
  step();
  assert.ok(Math.abs(player.heading + 1.23) < 1e-10);
});

test('W keeps moving north when the mouse swings the view east and then south', () => {
  const { player, input, step } = setup({ heading: Math.PI, codes: ['KeyW'] });
  input.steerWithMouse = true;
  for (const heading of [Math.PI, Math.PI / 2, 0]) {
    input.cursorHeading = heading;
    const before = player.z;
    step(20);
    assert.ok(player.z < before - .8);
    assert.equal(player.x, 0);
    assert.equal(player.heading, heading);
    assert.equal(player.root.rotation.y, heading);
  }
});

test('arrow throttle still follows the mouse aim when used on its own', () => {
  for (const [code, sign] of [['ArrowUp', 1], ['ArrowDown', -1]]) {
    const { player, input, step } = setup({ heading: 0, codes: [code] });
    input.cursorHeading = Math.PI / 2;
    input.steerWithMouse = true;
    step(20);
    assert.ok(player.x * sign > .8);
    assert.ok(Math.abs(player.z) < 1e-10);
  }
});

test('without a cursor position, W still moves north and the hero keeps his last aim', () => {
  const { player, input, step } = setup({ heading: Math.PI / 2, codes: ['KeyW'] });
  input.steerWithMouse = true;
  step(30);
  assert.ok(player.z < -1);
  assert.equal(player.x, 0);
  assert.equal(player.heading, Math.PI / 2);
});

test('S always moves down-screen while the crosshair and shot direction change', () => {
  const { player, input, step } = setup({ heading: 0, codes: ['KeyS'], firing: true });
  input.steerWithMouse = true;
  for (const heading of [0, .6, -1.4, Math.PI]) {
    input.cursorHeading = input.shotHeading = heading;
    const before = player.z;
    step(15);
    assert.ok(player.z > before);
    assert.equal(player.x, 0);
    assert.ok(Math.abs(player.heading - heading) < 1e-10);
  }
});

test('the movement stick keeps the last facing when switching away from mouse aim', () => {
  const { player, input, step } = setup({ touch: { x: 0, z: -1 } });
  input.cursorHeading = input.shotHeading = .37;
  input.steerWithMouse = true;
  step(30);
  assert.equal(player.heading, 0);
});

test('WASD takes the same screen directions for every facing', () => {
  for (const heading of [0, .7, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    for (const [code, x, z] of [['KeyA', -1, 0], ['KeyD', 1, 0], ['KeyW', 0, -1], ['KeyS', 0, 1]]) {
      const { player, input, step } = setup({ heading, codes: [code] });
      input.cursorHeading = heading;
      input.steerWithMouse = true;
      step(20);
      assert.ok(player.x * x + player.z * z > .8);
      assert.ok(Math.abs(player.x * z - player.z * x) < 1e-10);
      assert.equal(player.heading, heading);
    }
  }
});

test('W plus A moves diagonally up-left while the mouse points down-right', () => {
  const { player, input, step } = setup({ codes: ['KeyW', 'KeyA'], firing: true });
  input.steerWithMouse = true;
  input.shotHeading = input.cursorHeading = Math.PI / 4;
  step(30);
  assert.ok(player.x < -.6 && player.z < -.6);
  assert.equal(player.x, player.z);
  assert.equal(player.heading, Math.PI / 4);
});

test('mouse aim can take back facing during an arrow turn while W keeps travelling north', () => {
  const { player, input, step } = setup({ codes: ['KeyW', 'ArrowLeft'] });
  step(20);
  input.steerWithMouse = true;
  input.cursorHeading = -Math.PI / 2;
  step(30);
  assert.equal(player.heading, -Math.PI / 2);
  assert.equal(player.x, 0);
  const before = player.z;
  step(10);
  assert.ok(player.z < before);
});

test('mouse shots retain arrow throttle and turning while aimed elsewhere', () => {
  const options = { codes: ['ArrowUp', 'ArrowRight'], firing: true };
  const cursor = setup(options);
  const keyboard = setup(options);
  cursor.input.shotHeading = .37;
  cursor.step(30);
  keyboard.step(30);
  assert.ok(Math.abs(cursor.player.heading - .37) < 1e-10);
  assert.ok(cursor.player.targetHeading < -.5);
  assert.equal(cursor.player.targetHeading, keyboard.player.targetHeading);
  assert.equal(cursor.player.x, keyboard.player.x);
  assert.equal(cursor.player.z, keyboard.player.z);
  cursor.input.shotHeading = null;
  cursor.step();
  assert.equal(cursor.player.heading, cursor.player.targetHeading);
});

test('releasing input brakes to rest and both key sets still use city collisions', () => {
  for (const code of ['KeyW', 'ArrowUp']) {
    const { player, city, input, step } = setup({ codes: [code] });
    step(30);
    input.keys.clear(); step(60);
    assert.equal(player.moveSpeed, 0);
    const before = { x: player.x, z: player.z };
    city.move = () => {};
    input.keys.add(code); step();
    assert.deepEqual({ x: player.x, z: player.z }, before);
    assert.equal(player.moveSpeed, 0);
  }
});
