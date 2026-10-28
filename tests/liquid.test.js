import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import test from 'node:test';

// Resolve the browser import map's Three.js entry to the same bundled module.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'three') specifier = new URL('../vendor/three-0.180.0/build/three.module.min.js', import.meta.url).href;
    if (specifier.startsWith('three/addons/')) specifier = new URL(`../vendor/three-0.180.0/examples/jsm/${specifier.slice(13)}`, import.meta.url).href;
    return nextResolve(specifier, context);
  }
});
const THREE = await import('three');
const { createLiquidStream } = await import('../liquid.js');
const { ENEMY_HEALTH } = await import('../waves.js');
const { createEnemy, loadEnemyModels } = await import('../enemies.js');
const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');

function setup(refraction = true, options = {}) {
  const scene = new THREE.Scene();
  const hits = [], impacts = [];
  const stream = createLiquidStream(scene, { lineClear3D: () => true }, (enemy, direction, impact) => {
    hits.push(direction.clone());
    impacts.push({ ...impact });
    if (typeof enemy.hp === 'number') { enemy.hp -= impact.damage; enemy.alive = enemy.hp > 0; }
  }, { refraction, ...options });
  const emitter = new THREE.Object3D();
  emitter.position.set(0, 1.23, 0);
  const facing = { dx: 0, dz: 1 };
  const surface = scene.children.find(mesh => mesh.material?.isMeshPhysicalMaterial && !mesh.isInstancedMesh);
  const droplets = scene.children.find(mesh => mesh.isInstancedMesh);
  const advance = (frames, firing, enemies = []) => {
    let state;
    for (let i = 0; i < frames; i++) state = stream.update(1 / 60, firing, emitter, facing, enemies);
    return { ...state };
  };
  return { stream, surface, droplets, advance, hits, impacts };
}

test('empty liquid stays hidden without scheduling empty buffer uploads', () => {
  const { surface, droplets, advance } = setup();
  assert.equal(surface.visible, false);
  assert.equal(droplets.visible, false);
  const versions = [surface.geometry.attributes.position.version, droplets.instanceMatrix.version];
  advance(60, false);
  assert.equal(surface.visible, false);
  assert.equal(droplets.visible, false);
  assert.deepEqual([surface.geometry.attributes.position.version, droplets.instanceMatrix.version], versions);
});

const target = (x, z, hp = 100) => ({ alive: true, x, z, hp, hitHeight: .3, size: .43 });

test('early-wave slugs take one direct hit and snails two at low and full pressure', () => {
  for (const charged of [false, true]) {
    const hitsToKill = kind => {
      const { advance, impacts } = setup();
      const enemy = target(0, charged ? 7.5 : .7, ENEMY_HEALTH[kind]);
      if (charged) advance(120, true);
      for (let burst = 0; burst < 30 && enemy.alive; burst++) {
        advance(5, true, [enemy]);
        advance(5, charged, [enemy]);
      }
      assert.equal(enemy.alive, false, 'Both enemy types can be defeated');
      assert.ok(impacts.every(hit => !hit.groundSplash), 'Count direct contacts only');
      return impacts.length;
    };
    assert.equal(hitsToKill('slug'), 1);
    assert.equal(hitsToKill('snail'), 2);
  }
});

test('enemy health increases by one only after each three-wave block', async context => {
  context.mock.method(GLTFLoader.prototype, 'loadAsync', async () => {
    const scene = new THREE.Group();
    scene.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial()));
    return { scene, animations: [] };
  });
  await loadEnemyModels();
  for (const [wave, slug, snail] of [[1, 1, 2], [3, 1, 2], [4, 2, 3], [6, 2, 3], [7, 3, 4], [9, 3, 4], [10, 4, 5]]) {
    assert.equal(createEnemy('slug', wave).hp, slug, `Slug health on wave ${wave}`);
    assert.equal(createEnemy('snail', wave).hp, snail, `Snail health on wave ${wave}`);
  }
});

test('one short close tap kills an early slug and leaves a snail needing one more hit', () => {
  for (const [kind, remaining] of [['slug', 0], ['snail', 1]]) {
    const { advance, impacts } = setup();
    const enemy = target(0, .7, ENEMY_HEALTH[kind]);
    advance(5, true, [enemy]);
    advance(60, false, [enemy]);
    assert.equal(impacts.length, 1);
    assert.equal(enemy.hp, remaining);
    assert.equal(enemy.alive, kind === 'snail');
    assert.ok(impacts.every(hit => hit.charge < .1));
  }
});

test('charged liquid keeps stronger knockback after release with fixed direct damage', () => {
  const near = setup(), far = setup();
  const closeEnemy = target(0, .7), farEnemy = target(0, 7.5);
  near.advance(5, true, [closeEnemy]);
  near.advance(60, false, [closeEnemy]);
  far.advance(90, true);
  const released = far.advance(90, false, [farEnemy]);
  assert.equal(released.charge, 0, 'Current pressure is already reset');
  assert.ok(far.impacts.length > 0);
  const weak = near.impacts.find(hit => !hit.groundSplash);
  const strong = far.impacts.find(hit => !hit.groundSplash);
  assert.ok(weak && strong, 'Both near and far shots make direct contact');
  assert.equal(weak.damage, 1);
  assert.equal(strong.damage, 1);
  assert.ok(strong.knockback > weak.knockback * 2.5);
  assert.ok(strong.charge > .8, 'Impact uses the pressure at launch');
});

test('off-target ground splashes do less damage than a direct short burst', () => {
  const direct = setup(), splash = setup();
  const enemy = target(0, .7);
  direct.advance(5, true, [enemy]);
  direct.advance(60, false, [enemy]);
  const bystander = target(.65, .9);
  splash.advance(5, true, [bystander]);
  splash.advance(60, false, [bystander]);
  assert.ok(splash.impacts.length > 0);
  assert.ok(splash.impacts.every(hit => hit.groundSplash));
  assert.ok(splash.impacts[0].damage < direct.impacts[0].damage * .65);
});

test('a newly powered side stream shares the main jet cooldown despite a younger simulation clock', () => {
  let now = 100;
  const main = setup(true, { getHitTime: () => now });
  const side = setup(true, { getHitTime: () => now });
  const enemy = target(0, .7);
  main.advance(5, true, [enemy]);
  main.advance(60, false, [enemy]);
  assert.equal(main.impacts.length, 1);
  side.advance(5, true, [enemy]);
  side.advance(60, false, [enemy]);
  assert.equal(side.impacts.length, 0, 'A fan cannot bypass the shared hit interval');
  now += .2;
  side.advance(5, true, [enemy]);
  side.advance(60, false, [enemy]);
  assert.equal(side.impacts.length, 1, 'The side stream works as soon as the real cooldown expires');
});

test('stream and drops appear, finish falling after release, and reset for another burst', () => {
  const { stream, surface, droplets, advance } = setup();
  advance(90, true);
  assert.equal(surface.visible, true);
  assert.ok(surface.geometry.drawRange.count > 0);
  assert.equal(droplets.visible, true);
  assert.ok(droplets.count > 0);
  advance(1, false);
  assert.ok(surface.visible || droplets.visible, 'Released liquid remains in flight');
  advance(180, false);
  assert.equal(surface.visible, false);
  assert.equal(droplets.visible, false);
  advance(90, true);
  stream.clear();
  assert.equal(surface.visible, false);
  assert.equal(droplets.visible, false);
  assert.equal(droplets.count, 0);
  advance(90, true);
  assert.equal(surface.visible, true);
  assert.equal(droplets.visible, true);
});

test('disabling refraction preserves gloss, pressure, range, and collision damage', () => {
  const desktop = setup(), mobile = setup(false);
  assert.equal(desktop.surface.material.transmission, .16);
  assert.equal(mobile.surface.material.transmission, 0);
  for (const property of ['clearcoat', 'roughness', 'opacity', 'transparent']) {
    assert.equal(mobile.surface.material[property], desktop.surface.material[property]);
  }
  const enemy = () => ({ alive: true, x: 0, z: 1, hitHeight: .3, size: .43 });
  assert.deepEqual(mobile.advance(90, true, [enemy()]), desktop.advance(90, true, [enemy()]));
  assert.ok(mobile.hits.length > 0);
  assert.deepEqual(mobile.hits, desktop.hits);
});

test('runner liquid clears approaching riders while roadwork obstacles survive and still collide', async () => {
  const { createBaanaRun, trafficProfile } = await import('../runner/baana-run.js');
  for (const kind of ['bike', 'scooter', 'cone', 'tractor', 'barrier', 'trench']) {
    const run = createBaanaRun();
    const agent = { id: -1, kind, lane: 1, speed: kind === 'bike' || kind === 'scooter' ? 5.2 : 0,
      progress: 38, hp: 1.5,
      hitHeight: trafficProfile(kind).hitHeight, size: trafficProfile(kind).size,
      x: 0, z: -38, alive: true, hit: false, passed: false };
    run.state.traffic.push(agent);
    const scene = new THREE.Scene(), emitter = new THREE.Object3D();
    emitter.position.set(.083, 1.228, -.356);
    const stream = createLiquidStream(scene, { lineClear3D: () => true }, (target, direction, impact) => run.sprayHit(target.id, impact), { refraction: false });
    for (let frame = 0; frame < 240 && agent.alive; frame++) {
      run.update(1 / 60);
      stream.update(1 / 60, true, emitter, { dx: 0, dz: -1 }, [agent]);
    }
    const rider = kind === 'bike' || kind === 'scooter';
    assert.equal(agent.alive, !rider, kind);
    assert.equal(agent.hit, !rider, rider ? `${kind} clears before colliding` : `${kind} still collides`);
    assert.equal(run.state.cleared, rider ? 1 : 0);
    if (!rider) assert.equal(agent.hp, 1.5);
  }
});
