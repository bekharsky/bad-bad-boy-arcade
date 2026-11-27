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
const { animateGoose, createGooseModel, gooseRig } = await import('../goose.js');
const { createLiquidStream } = await import('../liquid.js');
const { ENEMY_HEALTH } = await import('../waves.js');

test('goose wings fold flat along the flanks and open with the barred faces up', () => {
  const model = createGooseModel();
  const actor = { body: model, goose: gooseRig(model), gait: 0, speed: 0, airborne: true };
  const directions = () => actor.goose.wings.map((wing, index) => {
    const side = index === 0 ? -1 : 1;
    return {
      side,
      span: new THREE.Vector3(0, 0, 1).applyQuaternion(wing.quaternion),
      flank: new THREE.Vector3(side, 1, 0).normalize().applyQuaternion(wing.quaternion),
      // From the middle of the wing oval to the middle charcoal bar.
      bars: new THREE.Vector3(side * .06, .04, 0).normalize().applyQuaternion(wing.quaternion),
    };
  });
  const checkFolded = () => {
    for (const { side, span, flank } of directions()) {
      assert.ok(span.z < -.99 && side * span.x < 0, 'The tips point toward the tail');
      assert.ok(side * flank.x > .99 && Math.abs(flank.y) < 1e-6, 'The feathers lie flat against both flanks');
    }
  };

  checkFolded();
  actor.wingOpen = .5;
  animateGoose(actor, 0, false);
  for (const { side, span, bars } of directions()) {
    assert.ok(side * span.x > .6 && span.z < -.6 && Math.abs(span.y) < 1e-6, 'The tips sweep out horizontally');
    assert.ok(bars.y > .7, 'The barred faces turn up as the wings open');
  }
  actor.wingOpen = 1;
  animateGoose(actor, 0, false);
  for (const { side, span, bars } of directions()) {
    assert.ok(side * span.x > .99);
    assert.ok(bars.y > .99 && bars.z > 0 && bars.z < .08, 'The bars face up and slightly forward');
  }
  for (const stroke of [1, -1]) {
    actor.gait = stroke * Math.PI / 2;
    animateGoose(actor, 0, false);
    assert.ok(directions().every(({ span }) => stroke * span.y > .9), 'Both wings stroke in the same direction');
  }
  actor.wingOpen = 0;
  actor.gait = 0;
  animateGoose(actor, 0, false);
  checkFolded();
});

test('geese load without model downloads and share geometry with independent animation and hit state', context => {
  context.mock.method(Math, 'random', () => .5);
  const loaded = [];
  context.mock.method(GLTFLoader.prototype, 'loadAsync', async url => { loaded.push(url); });
  loadEnemyModels();
  assert.deepEqual(loaded, []);
  assert.deepEqual(ENEMY_HEALTH, { goose: 2 });
  const first = createEnemy('goose', 1), second = createEnemy('goose', 1);
  assert.ok([first, second].every(goose => goose.speed >= .92 && goose.speed <= 1.07));
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
