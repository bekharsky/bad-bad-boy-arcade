import assert from 'node:assert/strict';
import test from 'node:test';
import { movePlayer } from '../movement.js';

function setup({ mode = 'direct', heading = 0, codes = [], touch = { x: 0, z: 0 }, firing = false } = {}) {
  const player = { x: 0, z: 0, heading, turnSpeed: 0, moveSpeed: 0, speed: 3.6, radius: .5, runTime: 0, root: { rotation: {} } };
  const city = { move(entity, dx, dz) { entity.x += dx; entity.z += dz; } };
  const input = { mode, keys: new Set(codes), touch, firing, dt: 1 / 60, height: 3.45 };
  const step = (frames = 1) => { for (let i = 0; i < frames; i++) movePlayer(player, city, input); };
  return { player, city, input, step };
}

test('direct arrows move immediately while the character turns smoothly toward travel', () => {
  for (const [code, dx, dz] of [['ArrowUp', 0, -1], ['ArrowDown', 0, 1], ['ArrowLeft', -1, 0], ['ArrowRight', 1, 0]]) {
    const { player, step } = setup({ heading: Math.atan2(-dx, -dz), codes: [code] });
    step();
    assert.ok(player.x * dx + player.z * dz > 0);
    assert.ok(Math.hypot(player.dx - dx, player.dz - dz) > .1, 'Facing does not snap to the requested direction');
    step(60);
    assert.ok(Math.abs(player.dx - dx) < 1e-10);
    assert.ok(Math.abs(player.dz - dz) < 1e-10);
  }
});

test('direct movement and spray reverse together on the first frame', () => {
  const { player, input, step } = setup({ codes: ['KeyW'], firing: true });
  step(30);
  const before = player.z;
  input.keys = new Set(['KeyS']);
  step();
  assert.ok(player.z > before);
  assert.equal(player.dz, 1, 'The first shot follows the new direction');
  assert.equal(player.dx, Math.sin(player.heading));
  assert.equal(player.dz, Math.cos(player.heading));
  assert.equal(player.root.rotation.y, player.heading);
  step(60);
  assert.equal(player.dz, 1);
});

test('direct facing takes the short path across the angle boundary', () => {
  const heading = Math.PI - .02;
  const { player, step } = setup({ heading, touch: { x: Math.sin(-Math.PI + .02), z: Math.cos(-Math.PI + .02) } });
  step();
  const change = Math.atan2(Math.sin(player.heading - heading), Math.cos(player.heading - heading));
  assert.ok(change > 0 && change <= .04 + 1e-10);
  assert.ok(Math.abs(player.heading - (-Math.PI + .02)) < .0001);
});

test('direct turns finish at the same angle across frame rates, without aim drift', () => {
  const headings = [];
  for (const fps of [30, 60, 120]) {
    const { player, input, step } = setup({ codes: ['KeyD'] });
    input.dt = 1 / fps;
    step(fps / 30);
    headings.push(player.heading);
    input.keys.clear();
    step(fps / 2);
    assert.equal(player.heading, Math.PI / 2);
    step(fps);
    assert.equal(player.heading, Math.PI / 2);
  }
  assert.ok(Math.max(...headings) - Math.min(...headings) < 1e-10);
});

test('small joystick aim corrections reach the exact angle in one frame while firing', () => {
  for (const fps of [30, 60, 120]) {
    const angle = .05;
    const { player, input, step } = setup({ touch: { x: Math.sin(angle) * .25, z: Math.cos(angle) * .25 }, firing: true });
    input.dt = 1 / fps;
    step();
    assert.ok(Math.abs(player.heading - angle) < 1e-10);
    assert.equal(player.dx, Math.sin(player.heading));
    assert.equal(player.dz, Math.cos(player.heading));
  }
});

test('releasing Direct movement stops within eight centimetres at full speed', () => {
  const { player, input, step } = setup({ codes: ['KeyW'] });
  step(120);
  const before = player.z;
  input.keys.clear();
  step(60);
  assert.equal(player.moveSpeed, 0);
  const coast = Math.abs(player.z - before);
  assert.ok(coast > 0 && coast < .08);
});

test('direct diagonal movement has the same speed as cardinal movement and aliases do not stack', () => {
  const cardinal = setup({ codes: ['KeyD', 'ArrowRight'] });
  const diagonal = setup({ codes: ['KeyD', 'KeyW'] });
  cardinal.step(60); diagonal.step(60);
  assert.ok(Math.abs(Math.hypot(cardinal.player.x, cardinal.player.z) - Math.hypot(diagonal.player.x, diagonal.player.z)) < 1e-10);
});

test('direct joystick preserves analog speed and takes priority over keyboard input', () => {
  const slow = setup({ touch: { x: .25, z: 0 }, codes: ['KeyW'] });
  const fast = setup({ touch: { x: 1, z: 0 } });
  slow.step(60); fast.step(60);
  assert.ok(Math.abs(slow.player.x / fast.player.x - .25) < 1e-10);
  assert.ok(Math.abs(slow.player.z) < 1e-10);
});

test('Direct keyboard shots immediately follow travel in all eight directions', () => {
  const directions = [
    [['KeyS'], 0], [['KeyS', 'KeyD'], Math.PI / 4],
    [['ArrowRight'], Math.PI / 2], [['ArrowUp', 'ArrowRight'], Math.PI * .75],
    [['KeyW'], Math.PI], [['KeyW', 'KeyA'], -Math.PI * .75],
    [['ArrowLeft'], -Math.PI / 2], [['KeyS', 'KeyA'], -Math.PI / 4],
  ];
  for (const [codes, heading] of directions) {
    const { player, input, step } = setup({ heading: .31, codes: ['Space', ...codes], firing: true });
    step();
    assert.ok(Math.abs(player.heading - heading) < 1e-10);
    assert.ok(player.x * player.dx + player.z * player.dz > 0);
    input.keys = new Set(['Space']);
    step(60);
    assert.ok(Math.abs(player.heading - heading) < 1e-10, 'A standing shot retains the last direction');
    assert.equal(player.moveSpeed, 0);
  }
});

test('Tank turning accelerates smoothly, reverses promptly and stops without drift', () => {
  const { player, input, step } = setup({ mode: 'tank', codes: ['ArrowRight'], firing: true });
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
  const turn = setup({ mode: 'tank', codes: ['ArrowRight'] });
  turn.step(30);
  assert.ok(turn.player.heading < 0);
  assert.equal(turn.player.x, 0);
  assert.equal(turn.player.z, 0);
  turn.input.keys.clear();
  const heading = turn.player.heading;
  turn.step();
  assert.equal(turn.player.heading, heading);
  const reverse = setup({ mode: 'tank', heading: Math.PI, codes: ['KeyS'] });
  reverse.step(30);
  assert.ok(reverse.player.z > 0);
  assert.ok(Math.abs(reverse.player.heading - Math.PI) < 1e-10);
  assert.ok(reverse.player.moveSpeed < 0);
});

test('the virtual joystick stays directional when the keyboard mode is Tank', () => {
  const { player, step } = setup({ mode: 'tank', touch: { x: .5, z: -.5 } });
  step(30);
  assert.ok(Math.abs(player.heading - Math.PI * .75) < 1e-10);
  assert.ok(player.moveSpeed > 0);
  assert.ok(player.x > 0 && player.z < 0);
});

test('joystick reversal changes travel immediately and completes facing quickly while firing', () => {
  for (const mode of ['direct', 'tank']) for (const fps of [30, 60, 120]) {
    const { player, input, step } = setup({ mode, touch: { x: 0, z: -1 }, firing: true });
    input.dt = 1 / fps;
    step(fps);
    const before = player.z;
    input.touch = { x: 0, z: 1 };
    step();
    assert.ok(player.z > before, 'Movement reverses on the first frame');
    step(Math.ceil(fps * .18));
    assert.ok(Math.abs(player.heading) < 1e-10, 'Turning is not slowed by the fire button');
    assert.equal(player.dz, 1);
  }
});

test('a Direct mouse shot changes facing but preserves travel and returns facing to the keys when it ends', () => {
  const { player, input, step } = setup({ codes: ['KeyW'], firing: true });
  input.aimHeading = .37;
  step();
  assert.ok(Math.abs(player.heading - .37) < 1e-10);
  assert.ok(player.z < 0);
  assert.equal(player.x, 0);
  input.aimHeading = null;
  input.firing = false;
  step(25);
  assert.equal(player.heading, Math.PI);
  assert.equal(player.x, 0);
});

test('a standing mouse shot turns immediately and leaves that facing for the next keyboard shot', () => {
  const { player, input, step } = setup({ firing: true });
  input.aimHeading = -1.23;
  step();
  assert.ok(Math.abs(player.heading + 1.23) < 1e-10);
  assert.equal(player.x, 0);
  assert.equal(player.z, 0);
  input.aimHeading = null;
  input.keys.add('Space');
  step();
  assert.ok(Math.abs(player.heading + 1.23) < 1e-10);
});

test('the joystick takes priority over a mouse target', () => {
  const { player, input, step } = setup({ touch: { x: 0, z: -1 } });
  input.aimHeading = .37;
  step(30);
  assert.equal(player.heading, Math.PI);
});

test('Tank follows the cursor on the first shot and resumes keyboard turning when mouse aim is released', () => {
  const { player, input, step } = setup({ mode: 'tank', codes: ['ArrowRight'], firing: true });
  input.aimHeading = .37;
  step();
  assert.ok(Math.abs(player.heading - .37) < 1e-10);
  input.aimHeading = null;
  step(30);
  assert.ok(player.heading < .37);
});

test('mouse aiming also helps Tank players while stopped or moving forward along their facing', () => {
  for (const codes of [[], ['ArrowUp'], ['ArrowDown']]) {
    const { player, input, step } = setup({ mode: 'tank', codes, firing: true });
    input.aimHeading = .37; step(60);
    assert.ok(Math.abs(player.heading - .37) < 1e-10);
    if (codes.length) {
      const forward = player.x * Math.sin(.37) + player.z * Math.cos(.37);
      assert.ok(codes[0] === 'ArrowUp' ? forward > 0 : forward < 0);
    } else assert.equal(Math.hypot(player.x, player.z), 0);
  }
});

test('releasing input brakes to rest and both modes still use city collisions', () => {
  for (const mode of ['direct', 'tank']) {
    const { player, city, input, step } = setup({ mode, codes: ['KeyW'] });
    step(30);
    input.keys.clear(); step(60);
    assert.equal(player.moveSpeed, 0);
    const before = { x: player.x, z: player.z };
    city.move = () => {};
    input.keys.add('KeyW'); step();
    assert.deepEqual({ x: player.x, z: player.z }, before);
    assert.equal(player.moveSpeed, 0);
  }
});
