import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';
import { createGullFlight } from '../gull-flight.js';
import { aimingUp, createSprayAim } from '../spray-aim.js';

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === 'three') specifier = new URL('../vendor/three-0.180.0/build/three.module.min.js', import.meta.url).href;
  if (specifier.startsWith('three/addons/')) specifier = new URL(`../vendor/three-0.180.0/examples/jsm/${specifier.slice(13)}`, import.meta.url).href;
  return nextResolve(specifier, context);
} });
const THREE = await import('three');
const { createSpraySystem } = await import('../spray-system.js');
const { createSeagulls } = await import('../seagulls.js');

function setup(value = .1, runner = false, options = {}) {
  const impacts = [], player = { x: 0, z: 0, radius: .74 };
  const flight = createGullFlight({ random: () => value, onImpact: impact => impacts.push(impact), ...options });
  flight.reset(player, runner);
  const advance = (seconds, config = {}) => {
    for (let i = 0; i < Math.round(seconds * 120); i++) flight.update(1 / 120, player, { scroll: runner ? 15 : 0, ...config });
  };
  return { flight, player, impacts, advance };
}

test('two independent birds attack infrequently, one at a time, with both damaging attack types', () => {
  for (const value of [.1, .9]) for (const runner of [false, true]) {
    const { flight, impacts, advance } = setup(value, runner);
    advance(5); assert.equal(impacts.length, 0);
    for (let i = 0; i < 30 * 120; i++) {
      advance(1 / 120);
      assert.ok(flight.birds.filter(b => b.target).length <= 1);
      assert.equal(flight.birds.length, 2);
    }
    assert.ok(impacts.length >= 2 && impacts.length <= 5);
    assert.ok(impacts.every(hit => hit.hit && hit.type === (value < .5 ? 'drop' : 'dive')));
  }
});

test('locked warnings allow sidesteps, runner lane changes, and braking to avoid attacks', () => {
  for (const value of [.1, .9]) for (const runner of [false, true]) {
    const { flight, player, impacts, advance } = setup(value, runner);
    while (!flight.birds.some(b => b.target)) advance(1 / 120);
    const attacking = flight.birds.find(b => b.target), x = attacking.target.x;
    player.x += 4.4; advance(3);
    assert.equal(impacts.length, 1); assert.equal(impacts[0].hit, false);
    assert.equal(impacts[0].x, x, 'The bird cannot chase a dodge');
  }
  const { flight, impacts, advance } = setup(.9, true);
  while (!flight.birds.some(b => b.target)) advance(1 / 120);
  advance(3, { scroll: 7 });
  assert.equal(impacts[0].hit, false);
});

test('repelling cancels a dive, prevents repeat hits, and lets the same bird return later', () => {
  const { flight, impacts, advance } = setup(.9);
  while (!flight.birds.some(b => b.target)) advance(1 / 120);
  const bird = flight.birds.find(b => b.target);
  assert.equal(flight.repel(bird), true); assert.equal(flight.repel(bird), false);
  assert.equal(bird.target, null); assert.equal(bird.alive, false);
  advance(3, { attacks: false }); assert.equal(impacts.length, 0);
  advance(10, { attacks: false }); assert.equal(bird.alive, true);
});

test('released droppings survive repelling the bird; reset clears every pending attack', () => {
  const { flight, player, impacts, advance } = setup();
  while (!flight.birds.some(b => b.drop)) advance(1 / 120);
  const bird = flight.birds.find(b => b.drop);
  assert.equal(flight.repel(bird), true); assert.ok(bird.drop);
  advance(1); assert.equal(impacts.length, 1); assert.equal(impacts[0].hit, true);
  flight.reset(player, true);
  assert.ok(flight.birds.every(b => !b.alive && b.phase === 'waiting' && !b.drop && !b.target));
  advance(5); assert.equal(impacts.length, 1);
});

test('blocked ground or a roof prevents attacks through scenery', () => {
  for (const options of [{ canStandAt: () => false }, { lineClear3D: () => false }]) {
    const { flight, impacts, advance } = setup(.1, false, options);
    advance(30);
    assert.equal(impacts.length, 0); assert.ok(flight.birds.every(b => !b.target));
  }
});

test('fixed-step flight and attacks agree across frame rates; idle updates consume no game time', () => {
  const run = fps => {
    const { flight, player, impacts } = setup(.1, true);
    for (let i = 0; i < 35 * fps; i++) flight.update(1 / fps, player, { scroll: 15 });
    const snapshot = JSON.stringify(flight.birds);
    flight.update(0, player, { scroll: 15 });
    assert.equal(JSON.stringify(flight.birds), snapshot);
    return { impacts, phase: flight.birds.map(b => b.phase) };
  };
  assert.deepEqual(run(30), run(120));
});

test('E and the spray stick change height independently of Shift, movement, and firing', () => {
  assert.equal(aimingUp(new Set(['ShiftLeft', 'Space']), {}), false);
  assert.equal(aimingUp(new Set(['KeyE', 'Space']), {}), true);
  assert.equal(aimingUp(new Set(), { airborne: true }), true);
  const aim = createSprayAim(), player = { x: 0, z: 0, dx: 0, dz: -1 };
  const front = { alive: true, x: 2, z: -5 }, back = { alive: true, x: 0, z: 3 };
  assert.equal(aim(player, [back, front], true).target, front);
  front.alive = false; assert.equal(aim(player, [back, front], true).target, null);
  assert.equal(aim(player, [front], false).airborne, false);
  assert.deepEqual(player, { x: 0, z: 0, dx: 0, dz: -1 });
});

test('changing elevation mid-burst retains charge and can hit a flying bird with real liquid', () => {
  const scene = new THREE.Scene(), hits = [];
  const bird = { alive: true, airborne: true, x: 0, z: 5, hitHeight: 6.3, size: .62 };
  const stream = createSpraySystem(scene, { lineClear3D: () => true }, target => { hits.push(target); target.alive = false; }, { refraction: false });
  const emitter = new THREE.Object3D(); emitter.position.y = 1.23;
  const facing = { dx: 0, dz: 1 };
  const advance = n => {
    let state;
    for (let i = 0; i < n; i++) state = stream.update(1 / 60, true, emitter, facing, [bird], true);
    return { ...state };
  };
  const ground = advance(36);
  assert.equal(hits.length, 0, 'A splash on the ground cannot hit a bird overhead');
  facing.airborne = true; facing.target = bird;
  const air = advance(60);
  assert.ok(air.charge > ground.charge); assert.equal(air.charge, 1);
  assert.equal(hits.length, 1); assert.equal(hits[0], bird);
  facing.airborne = false; facing.target = null;
  assert.equal(advance(1).charge, 1);
  stream.resetPressure(); assert.ok(advance(1).charge < .02, 'A new short burst retains its usual reset');
  stream.clear(); assert.ok(scene.children.every(mesh => !mesh.visible));
});

test('air spray can repel moving birds in both arena and runner frames', () => {
  for (const runner of [false, true]) {
    const { flight, player, impacts } = setup(.9, runner);
    Object.assign(player, { dx: 0, dz: -1 });
    const emitter = new THREE.Object3D(); emitter.position.y = 1.23;
    const aim = createSprayAim(), repelled = new Set();
    const spray = createSpraySystem(new THREE.Scene(), { lineClear3D: () => true }, bird => {
      if (flight.repel(bird)) repelled.add(bird.id);
    }, { refraction: false });
    for (let frame = 0; frame < 18 * 60; frame++) {
      flight.update(1 / 60, player, { scroll: runner ? 15 : 0 });
      spray.update(1 / 60, true, emitter, aim(player, flight.birds, true), flight.birds);
    }
    assert.equal(repelled.size, 2); assert.equal(impacts.length, 0);
  }
});

test('ambient attacks work with the real navigation and scenery on every campaign map', async () => {
  globalThis.document = { createElement: () => ({ getContext: () => ({ fillRect() {}, strokeRect() {}, fillText() {}, measureText: text => ({ width: text.length * 24 }) }) }) };
  const { maps } = await import('../maps/index.js');
  for (const definition of maps) {
    const world = definition.create(), impacts = [];
    try {
      const player = { ...world.spawn, radius: .74 };
      const flight = createGullFlight({ random: () => .9,
        canStandAt: (...args) => world.canStandAt(...args),
        lineClear3D: (...args) => world.lineClear3D(...args), onImpact: event => impacts.push(event) });
      flight.reset(player, definition.mode === 'runner');
      for (let frame = 0; frame < 16 * 60; frame++) flight.update(1 / 60, player);
      assert.ok(impacts.some(event => event.hit), `${definition.id}: a bird can reach the player in the open`);
    } finally { world.dispose(); }
  }
});

test('birds arrive separately from the distance and settle before their first attack', () => {
  const { flight, impacts, advance } = setup(.1);
  assert.ok(flight.birds.every(b => !b.alive && b.phase === 'waiting'));
  advance(2); assert.ok(flight.birds.every(b => b.phase === 'waiting'));
  advance(.2);
  assert.equal(flight.birds[0].phase, 'approach');
  assert.ok(flight.birds[0].z < -80, 'The first visible position is distant, not beside the hero');
  assert.equal(flight.birds[1].phase, 'waiting');
  advance(4.5);
  assert.equal(flight.birds[0].phase, 'orbit');
  assert.equal(flight.birds[1].phase, 'waiting');
  assert.ok(flight.birds.every(b => !b.target));
  advance(1.5);
  assert.ok(flight.birds.every(b => !b.target));
  assert.equal(flight.birds[1].phase, 'approach');
  assert.equal(impacts.length, 0);
});

test('visible flight stays continuous through facade avoidance, retreat and re-entry', () => {
  for (const runner of [false, true]) {
    let wall = false;
    const { flight, player, advance } = setup(.1, runner, { lineClear3D: () => !wall });
    advance(13, { attacks: false });
    const bird = flight.birds[0];
    assert.equal(bird.phase, 'orbit');
    let repelled = false, sawAway = false, sawReturn = false;
    const hidden = phase => phase === 'waiting' || phase === 'away';
    for (let frame = 0; frame < 20 * 60; frame++) {
      wall = frame >= 30 && frame < 90;
      if (frame === 120) { repelled = flight.repel(bird); assert.equal(repelled, true); }
      const from = { x: bird.x, y: bird.hitHeight, z: bird.z, phase: bird.phase };
      flight.update(1 / 60, player, { scroll: runner ? 15 : 0, attacks: false });
      if (!hidden(from.phase) && !hidden(bird.phase)) {
        assert.ok(Math.hypot(bird.x - from.x, bird.hitHeight - from.y, bird.z - from.z) < 1.2, `${from.phase} → ${bird.phase} cannot teleport`);
      }
      if (bird.phase === 'away') sawAway = true;
      if (sawAway && bird.phase === 'approach' && !sawReturn) {
        sawReturn = true; assert.ok(bird.z < -80, 'Return begins with a distant approach');
      }
    }
    assert.ok(sawAway && sawReturn && bird.alive);
  }
});

test('retreat is rendered until the bird flies out of the frame instead of a timed visibility cut', async () => {
  const { createGameCamera } = await import('../world/game-camera.js');
  const scene = new THREE.Scene(), player = { x: 0, z: 0, radius: .74 };
  const gulls = createSeagulls(scene, { canStandAt: () => true, lineClear3D: () => true }, { random: () => .1 });
  gulls.reset(player, false);
  const models = scene.children[0].children.filter(node => node.isGroup);
  assert.ok(models.every(model => !model.visible));
  for (let i = 0; i < 13 * 60; i++) gulls.update(1 / 60, player, { attacks: false });
  const bird = gulls.birds[0]; gulls.repel(bird);
  for (let i = 0; i < 1.5 * 60; i++) gulls.update(1 / 60, player, { attacks: false });
  assert.equal(models[0].visible, true, 'The old 1.4-second visibility cut is gone');
  for (let i = 0; i < 1.6 * 60; i++) gulls.update(1 / 60, player, { attacks: false });
  assert.equal(bird.phase, 'away'); assert.equal(models[0].visible, false);
  for (const [width, height, touch] of [[1280, 720, false], [390, 844, true], [844, 390, true]]) {
    const rig = createGameCamera(); rig.resize(width, height, touch); rig.frame(0, 0, 0, true); rig.camera.updateMatrixWorld(true);
    const position = new THREE.Vector3(bird.x, bird.hitHeight, bird.z).project(rig.camera);
    assert.ok(Math.abs(position.x) > 1.1 || Math.abs(position.y) > 1.1, 'Hiding happens outside the visible frame');
  }
  gulls.dispose();
});

test('restarts and map changes reuse bounded bird resources and clear all markers', () => {
  const scene = new THREE.Scene(), player = { x: 0, z: 0, radius: .74 };
  const gulls = createSeagulls(scene, { canStandAt: () => true, lineClear3D: () => true }, { random: () => .1 });
  const root = scene.children[0], geometries = new Set(); root.traverse(node => { if (node.geometry) geometries.add(node.geometry); });
  let meshCount = 0; root.traverse(node => { if (node.isMesh) meshCount++; });
  for (let i = 0; i < 30; i++) {
    gulls.reset(player, i % 2 === 0);
    for (let frame = 0; frame < 8 * 30; frame++) gulls.update(1 / 30, player);
    gulls.clear(); assert.equal(root.visible, false);
  }
  let finalCount = 0; root.traverse(node => { if (node.isMesh) { finalCount++; assert.ok(geometries.has(node.geometry)); } });
  assert.equal(finalCount, meshCount); assert.equal(scene.children.length, 1);
  gulls.dispose(); assert.equal(scene.children.length, 0);
});
