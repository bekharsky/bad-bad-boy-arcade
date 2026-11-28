import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { animateHero, createHero } from '../hero.js';
import { createSleighParts } from '../models/sleigh.js';
import { createSleighAssembly } from '../sleigh-assembly.js';
import { createSleighIntro } from '../sleigh-intro.js';
import { randomSleighCachePoint, sleighGuardPosts } from '../sleigh-search.js';
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

test('random sleigh caches stay outside the opening camera and remain guarded', () => {
  for (const district of maps.filter(district => district.mode !== 'runner')) {
    const world = district.create();
    try {
      const view = createGameCamera();
      view.resize(1440, 750, false);
      view.frameArena(world.spawn.x, world.spawn.z, 0, { instant: true });
      view.camera.updateMatrixWorld(true);
      const frustum = new THREE.Frustum().setFromProjectionMatrix(
        new THREE.Matrix4().multiplyMatrices(view.camera.projectionMatrix, view.camera.matrixWorldInverse),
      );
      const caches = Array.from({ length: 3 }, () => randomSleighCachePoint(
        world, { x: world.spawn.x, z: world.spawn.z }, .85, view.camera,
      ));
      for (const cache of caches) {
        assert.ok(cache, `${district.id} finds a hidden cache`);
        assert.ok(world.pickupPoint(cache, .85), `${district.id} cache stays reachable`);
        assert.equal(frustum.intersectsSphere(new THREE.Sphere(new THREE.Vector3(cache.x, 1.8, cache.z), 1.9)), false, district.id);
        assert.ok(sleighGuardPosts(world, cache).length >= 10, `${district.id} cache stays guarded`);
      }
      assert.ok(new Set(caches.map(cache => `${cache.x.toFixed(2)},${cache.z.toFixed(2)}`)).size > 1, `${district.id} varies the cache position`);
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

test('the intro keeps the hero atlas, normals and original bind pose when animating the head', t => {
  const originalDocument = globalThis.document;
  globalThis.document = { createElement: () => ({ getContext: () => ({
    fillRect() {}, strokeRect() {}, fillText() {}, measureText: () => ({ width: 24 }),
    createRadialGradient: () => ({ addColorStop() {} }), beginPath() {}, arc() {}, fill() {},
  }) }) };
  t.after(() => { globalThis.document = originalDocument; });
  const atlas = new THREE.Texture();
  const source = new THREE.Mesh(
    new THREE.BoxGeometry(.4, 1.5, .4).translate(0, .75, 0),
    new THREE.MeshStandardMaterial({ map: atlas }),
  );
  source.name = 'BadBadBoy';
  const rig = createHero(source);
  const hero = rig.mesh;
  hero.scale.setScalar(2.3);
  animateHero(rig, 1, 1);
  hero.updateMatrixWorld(true);

  const overlay = { style: { setProperty() {} } };
  const intro = createSleighIntro(overlay, {
    heroModel: hero, reducedMotion: true, onImpact() {}, sleighParts: createSleighParts(),
  });
  const disposed = t.mock.fn();
  atlas.addEventListener('dispose', disposed);
  try {
    intro.update(4);
    intro.render({ render(scene) {
      const witness = scene.getObjectByName('Bad Bad Boy watching the sleigh');
      scene.updateMatrixWorld(true);
      assert.equal(witness.material.map, atlas);
      assert.equal(witness.material.onBeforeCompile, THREE.Material.prototype.onBeforeCompile);
      assert.deepEqual(witness.geometry.attributes.normal.array, hero.geometry.attributes.normal.array);
      assert.deepEqual(witness.geometry.attributes.uv.array, hero.geometry.attributes.uv.array);
      assert.ok(witness.skeleton.getBoneByName('witness-head').rotation.x < 0);

      const position = hero.geometry.attributes.position;
      const footIndex = Array.from({ length: position.count }, (_, i) => i).find(i => position.getY(i) === 0);
      const sourceFoot = hero.getVertexPosition(footIndex, new THREE.Vector3());
      const witnessFoot = witness.getVertexPosition(footIndex, new THREE.Vector3());
      assert.ok(sourceFoot.distanceTo(witnessFoot) < 1e-6);
    } });
  } finally {
    intro.dispose();
  }
  assert.equal(disposed.mock.callCount(), 0);
});
