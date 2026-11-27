import assert from 'node:assert/strict';
import test from 'node:test';
import { createClickCommands } from '../click-commands.js';

function setup({ direction = { x: 3, z: 4 }, stopDistance, random = () => 0 } = {}) {
  const player = { x: 0, z: 0, dx: 0, dz: 1, radius: .45 };
  const calls = [];
  const commands = createClickCommands({
    player,
    random,
    world: { routeTowards: (...args) => { calls.push(args); return direction; } },
    stopDistance,
  });
  return { player, calls, commands };
}

test('click movement normalizes the routed direction and clears on arrival', () => {
  const { player, calls, commands } = setup();
  commands.moveTo({ x: 3, z: 4 });
  assert.deepEqual(commands.movement(), { x: .6, z: .8 });
  assert.deepEqual(calls, [[0, 0, 3, 4]]);
  player.x = 3;
  player.z = 4;
  assert.equal(commands.movement(), null);
  assert.equal(commands.active, false);
});

test('attack commands approach to a preferred distance and keep aiming while stopped', () => {
  const { player, calls, commands } = setup({ direction: { x: 0, z: 2 } });
  const enemy = { alive: true, x: 6, z: 0, size: .45 };
  commands.attack(enemy, { preferredDistance: 2 });
  assert.deepEqual(commands.movement(), { x: 0, z: 1 });
  assert.deepEqual(calls[0], [0, 0, 6, 0]);
  player.x = 3.9;
  assert.equal(commands.movement(), null, 'the player stops inside the approach buffer');
  assert.equal(commands.target, enemy);
  assert.equal(commands.attacking, true);
  assert.equal(commands.active, true);
});

test('randomized attack ranges produce both closer and more cautious approaches', () => {
  const close = setup({ random: () => 0 });
  const cautious = setup({ random: () => 1 });
  const nearbyTarget = { alive: true, x: 2.5, z: 0, size: .4 };
  close.commands.attack(nearbyTarget);
  cautious.commands.attack(nearbyTarget);
  assert.deepEqual(close.commands.movement(), { x: .6, z: .8 }, 'the close preference approaches toward the target');
  assert.equal(cautious.commands.movement(), null, 'the longer preference stops farther away');
});

test('a click on another target replaces the current target', () => {
  const { commands } = setup();
  const first = { alive: true, x: 2, z: 0 };
  const second = { alive: true, x: 0, z: 4 };
  commands.attack(first);
  commands.attack(second);
  assert.equal(commands.target, second);
  assert.equal(commands.destination, null);
});

test('airborne targets are selected without approaching and expose upward aim', () => {
  const { commands } = setup();
  const gull = { alive: true, airborne: true, x: 20, z: 0 };
  commands.attack(gull, { approach: false, airborne: true });
  assert.equal(commands.movement(), null);
  assert.equal(commands.airborne, true);
  gull.alive = false;
  assert.equal(commands.target, null);
  assert.equal(commands.airborne, false);
});

test('dead targets clear and unreachable destinations stop issuing movement', () => {
  const { commands } = setup({ direction: { x: 0, z: 0 } });
  const enemy = { alive: true };
  commands.attack(enemy);
  enemy.alive = false;
  assert.equal(commands.target, null);
  assert.equal(commands.active, false);
  commands.moveTo({ x: 4, z: 0 });
  assert.equal(commands.movement(), null);
  assert.equal(commands.active, false);
});
