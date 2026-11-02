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
  f.combat.update(.1, 1.1);
  assert.equal(f.player.hp, 4);
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
