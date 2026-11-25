import assert from 'node:assert/strict';
import test from 'node:test';
import { createSleighParts } from '../models/sleigh.js';
import { createSleighAssembly } from '../sleigh-assembly.js';
import { sleighGuardPosts } from '../sleigh-search.js';
import { maps } from '../maps/index.js';
import { createGameCamera } from '../world/game-camera.js';

test('every arena keeps its sleigh cache reachable, hidden and surrounded by valid guard posts', () => {
  globalThis.document = { createElement: () => ({ getContext: () => ({
    fillRect() {}, strokeRect() {}, fillText() {}, measureText: () => ({ width: 24 }),
  }) }) };
  for (const district of maps.filter(district => district.mode !== 'runner')) {
    const world = district.create();
    try {
      const [cache, extra] = world.pickupPoints('sleigh', .85);
      assert.ok(cache && !extra, district.id);
      assert.equal(world.pickupPoints('skates', .86).length, 1, `${district.id} has reachable speed skates`);
      const view = createGameCamera();
      view.frame(world.spawn.x, world.spawn.z, 0, true);
      const pickupHeight = { ...cache, y: 1.8 };
      assert.equal(world.lineClear3D(view.camera.position, pickupHeight), false, district.id);
      assert.equal(world.lineClear3D({ ...world.spawn, y: 2.65 }, pickupHeight), false, district.id);
      const posts = sleighGuardPosts(world, cache);
      assert.ok(posts.length >= 8, district.id);
      for (const post of posts) {
        assert.ok(world.pickupPoint(post, .65), district.id);
        assert.equal(world.lineClear(cache.x, cache.z, post.x, post.z, .6), true, district.id);
      }
    } finally { world.dispose(); }
  }
});

test('the turntable fits one piece per district and clears pieces when a new game starts', () => {
  const parts = createSleighParts();
  assert.equal(parts.length, maps.length);
  assert.equal(new Set(parts.map(part => part.name)).size, maps.length);
  const fields = new Map();
  const overlay = {
    hidden: true,
    querySelector(id) {
      if (!fields.has(id)) fields.set(id, { textContent: '' });
      return fields.get(id);
    },
    classList: { add() {}, remove() {} },
  };
  const assembly = createSleighAssembly(parts, overlay);
  for (const [i, { model }] of parts.entries()) {
    assembly.start(i, true);
    assert.equal(overlay.hidden, false);
    assert.equal(parts.filter(part => part.model.visible).length, i + 1);
    assert.ok(model.position.length() > 0);
    assert.equal(assembly.update(.38), false);
    assert.equal(model.position.length(), 0);
    assert.equal(fields.get('#assembly-count').textContent, `${i + 1} / ${maps.length}`);
    assert.equal(assembly.update(1.5), true);
    assert.equal(overlay.hidden, true);
  }
  assembly.start(0, false);
  assert.equal(parts.filter(part => part.model.visible).length, 1);
});
