import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === 'three') specifier = new URL('../vendor/three-0.180.0/build/three.module.min.js', import.meta.url).href;
  if (specifier.startsWith('three/addons/')) specifier = new URL(`../vendor/three-0.180.0/examples/jsm/${specifier.slice(13)}`, import.meta.url).href;
  return nextResolve(specifier, context);
} });
const THREE = await import('three');
const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
const { loadEnemyModels, createEnemy, animateEnemy, disposeEnemy } = await import('../enemies.js');
const { createLiquidStream } = await import('../liquid.js');
const { ENEMY_HEALTH } = await import('../waves.js');

test('geese replace the snail model without downloads, sharing one mesh but keeping separate animation and hit state', async context => {
  const loaded = [];
  context.mock.method(GLTFLoader.prototype, 'loadAsync', async url => {
    loaded.push(url);
    const scene = new THREE.Group();
    scene.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial()));
    return { scene, animations: [] };
  });
  await loadEnemyModels();
  assert.deepEqual(loaded, [new URL('../assets/enemies/slug.glb', import.meta.url).href]);
  assert.deepEqual(ENEMY_HEALTH, { goose: 2, slug: 1 });
  const first = createEnemy('goose', 1), second = createEnemy('goose', 1);
  const meshes = enemy => { const result = []; enemy.model.traverse(node => { if (node.isMesh) result.push(node); }); return result; };
  const a = meshes(first), b = meshes(second);
  assert.equal(a.length, 1); assert.equal(a[0].isSkinnedMesh, true);
  assert.equal(a[0].geometry, b[0].geometry);
  assert.ok(a[0].geometry.attributes.position.count < 6000);
  assert.notEqual(a[0].skeleton, b[0].skeleton); assert.notEqual(first.goose.neck, second.goose.neck);
  assert.notEqual(a[0].material, b[0].material);
  assert.equal(a[0].geometry.attributes.skinIndex.count, a[0].geometry.attributes.position.count);
  const bounds = new THREE.Box3().setFromObject(first.root).getSize(new THREE.Vector3());
  assert.ok(Math.abs(bounds.z - 1.5) < .001, 'The reduced goose size stays consistent across instances');
  assert.ok(first.size >= bounds.x / 2 && first.size < .5, 'Collision shrinks with the body');

  first.gait = 0;
  animateEnemy(first, .1, 1, false);
  assert.ok(first.goose.legs[0].rotation.x * first.goose.legs[1].rotation.x < 0);
  assert.equal(Math.abs(second.goose.legs[0].rotation.x), 0);
  const walkNeck = first.goose.neck.rotation.x;
  for (let i = 0; i < 30; i++) animateEnemy(first, 1 / 60, 1, true);
  assert.ok(first.goose.neck.rotation.x > walkNeck + .4);
  first.hit = .18; animateEnemy(first, .01, 1, true);
  assert.equal(first.materials[0].emissive.getHexString(), 'ffe58c');
  assert.equal(second.materials[0].emissive.getHexString(), '000000');
  first.hit = 0; animateEnemy(first, .01, 1, false);
  assert.equal(first.materials[0].emissive.getHexString(), '000000');

  let geometryDisposals = 0, firstDisposals = 0, secondDisposals = 0;
  a[0].geometry.addEventListener('dispose', () => geometryDisposals++);
  first.materials[0].addEventListener('dispose', () => firstDisposals++);
  second.materials[0].addEventListener('dispose', () => secondDisposals++);
  disposeEnemy(first);
  assert.equal(firstDisposals, 1); assert.equal(secondDisposals, 0); assert.equal(geometryDisposals, 0);
  animateEnemy(second, .1, 1, false); disposeEnemy(second);
  assert.equal(secondDisposals, 1); assert.equal(geometryDisposals, 0);
});

test('the goose body can be hit by both short and charged ground spray using its actual collision profile', () => {
  for (const charged of [false, true]) {
    const enemy = createEnemy('goose', 1); enemy.x = 0; enemy.z = charged ? 7.5 : .7;
    const impacts = [], emitter = new THREE.Object3D(); emitter.position.y = 1.23;
    const stream = createLiquidStream(new THREE.Scene(), { lineClear3D: () => true }, (target, direction, impact) => {
      impacts.push(impact); target.hp -= impact.damage; target.alive = target.hp > 0;
    }, { refraction: false, scale: 3.45 / 2.25 });
    if (charged) for (let i = 0; i < 120; i++) stream.update(1 / 60, true, emitter, { dx: 0, dz: 1 }, []);
    for (let i = 0; i < 120 && enemy.alive; i++) stream.update(1 / 60, charged || i < 5, emitter, { dx: 0, dz: 1 }, [enemy]);
    // A short tap may make only one contact: another tap must finish the bird.
    if (enemy.alive) {
      stream.resetPressure();
      for (let i = 0; i < 120 && enemy.alive; i++) stream.update(1 / 60, i < 5, emitter, { dx: 0, dz: 1 }, [enemy]);
    }
    assert.equal(enemy.alive, false);
    assert.equal(impacts.length, 2); assert.ok(impacts.every(impact => !impact.groundSplash));
    disposeEnemy(enemy);
  }
});
