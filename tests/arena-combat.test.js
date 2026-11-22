import assert from 'node:assert/strict';
import test from 'node:test';
import { createArenaCombat } from '../arena-combat.js';

const enemy = (x = 0) => ({ x, z: 0, alive: true, size: .5, speed: 1, attack: 0, hit: 0, root: { rotation: {}, position: { set() {} } } });
function fixture(enemies, hp = 5) {
  const player = { x: 0, z: 0, radius: .7, hp, invulnerable: 0 };
  const animated = [], bites = [], moves = [];
  const world = { routeTo() {}, lineClear: () => true, chase: () => ({ x: -1, z: 0 }),
    move(actor, x, z) { moves.push(actor); actor.x += x; actor.z += z; } };
  const combat = createArenaCombat({ world, player, enemies,
    animateEnemy: actor => animated.push(actor),
    onBite: actor => { bites.push(actor); return player.hp > 0; } });
  return { combat, player, world, animated, bites, moves };
}

test('a pack can bite only once per invulnerability window and dead enemies are ignored', () => {
  const dead = { ...enemy(), alive: false }, f = fixture([dead, enemy(), enemy()]);
  assert.equal(f.combat.update(1 / 60, 1), true);
  assert.equal(f.player.hp, 4); assert.equal(f.bites.length, 1);
  assert.equal(f.animated.length, 2); assert.equal(dead.attack, 0);
  f.player.invulnerable -= 1;
  f.combat.update(1, 2);
  assert.equal(f.player.hp, 4);
  assert.ok(f.player.invulnerable > 0, 'A full second passes before the pack can land another hit');
});

test('a fatal bite stops the step before later enemies can move or animate', () => {
  const f = fixture([enemy(), enemy(5)], 1);
  assert.equal(f.combat.update(1 / 60, 1), false);
  assert.equal(f.player.hp, 0); assert.equal(f.moves.length, 0); assert.equal(f.animated.length, 0);
});

test('pursuit obeys navigation and a wall prevents a bite even at close range', () => {
  const actor = enemy(5), f = fixture([actor]);
  f.combat.update(.1, 1);
  assert.ok(Math.abs(actor.x - 4.9) < 1e-9);
  actor.x = 0; f.world.lineClear = () => false;
  f.combat.update(.1, 1.1);
  assert.equal(f.player.hp, 5); assert.equal(f.bites.length, 0);
  assert.equal(f.moves.length, 2);
});

test('nearby enemies still separate while distant enemies leave steering unchanged', () => {
  const first = enemy(4), nearby = enemy(4), distant = enemy(9);
  nearby.z = .4; distant.z = 8;
  const f = fixture([first, nearby, distant]);
  f.combat.update(.1, 1);
  assert.ok(first.z < 0, 'The nearby enemy deflects pursuit');
  assert.equal(distant.z, 8, 'A distant actor does not add separation');
});

test('geese sprint after a retreating hero and turn quickly around a corner', () => {
  const actor = { ...enemy(-6), speed: 1.2 };
  const { combat, player, world } = fixture([actor]);
  player.speed = 3.6;
  world.chase = (x, z, tx, tz) => ({ x: tx - x, z: tz - z });
  const dt = 1 / 60;
  for (let frame = 0; frame < 60; frame++) {
    player.x += player.speed * dt;
    combat.update(dt, frame * dt, player.speed * dt, 0);
  }
  assert.ok(actor.x > -3.5 && actor.x < -2.9);

  player.z += player.speed * dt;
  world.chase = () => ({ x: 0, z: 1 });
  const sprintHeading = actor.root.rotation.y;
  combat.update(dt, 1, 0, player.speed * dt);
  const sprintTurn = Math.abs(actor.root.rotation.y - sprintHeading);
  assert.ok(actor.z > 2 * actor.speed * dt);

  const oldZ = actor.z, walkHeading = actor.root.rotation.y;
  combat.update(dt, 1 + dt);
  assert.ok(Math.abs(actor.z - oldZ - actor.speed * dt) < 1e-9);
  assert.ok(sprintTurn > 2 * Math.abs(actor.root.rotation.y - walkHeading));
});

test('geese can nip a retreating hero at close range and a head start allows escape', () => {
  const actor = enemy(-1.2);
  const { combat, player, world } = fixture([actor]);
  player.speed = 3.6;
  world.chase = (x, z, tx, tz) => ({ x: tx - x, z: tz - z });
  const dt = 1 / 60;
  player.x += player.speed * dt;
  combat.update(dt, 0, player.speed * dt, 0);
  assert.equal(player.hp, 4);
  assert.equal(actor.x, -1.2);

  actor.x = -4;
  for (let frame = 0; frame < 96; frame++) {
    player.z += player.speed * dt;
    combat.update(dt, frame * dt, 0, player.speed * dt);
    assert.ok(Math.hypot(player.x - actor.x, player.z - actor.z) >= 2.6 - 1e-9);
  }
  assert.equal(player.hp, 4);
});
