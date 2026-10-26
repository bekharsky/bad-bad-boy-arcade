import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import test from 'node:test';

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'three') specifier = new URL('../vendor/three-0.180.0/build/three.module.min.js', import.meta.url).href;
    if (specifier.startsWith('three/addons/')) specifier = new URL(`../vendor/three-0.180.0/examples/jsm/${specifier.slice(13)}`, import.meta.url).href;
    return nextResolve(specifier, context);
  }
});
// Canvas textures are uploaded only in the browser; navigation uses real meshes.
globalThis.document = {
  createElement() {
    return { getContext: () => ({ fillRect() {}, strokeRect() {}, fillText() {}, measureText: text => ({ width: text.length * 24 }) }) };
  }
};
const THREE = await import('three');
const { createCity } = await import('../city.js');
const { createMedkits } = await import('../medkits.js');
const setup = () => {
  const scene = new THREE.Scene();
  return { scene, city: createCity(scene) };
};

test('expanded city keeps its bounds and all eight hidden courtyards walkable and reachable', () => {
  const { city } = setup();
  assert.equal(city.canStandAt(26, 0, .6), true);
  assert.equal(city.canStandAt(0, -28, .6), false);
  for (let i = 0; i < 8; i++) {
    const point = city.pickupPoint(i, .86);
    assert.ok(point, `Courtyard ${i} has space for a pickup and the player`);
    assert.equal(city.canStandAt(point.x, point.z, .86), true);
    assert.equal(city.lineClear(0, 0, point.x, point.z, .1), false, 'A house hides the reward from the square');
    city.routeTo(point.x, point.z);
    const actor = { x: 0, z: 0 };
    for (let step = 0; step < 3000 && Math.hypot(actor.x - point.x, actor.z - point.z) > .5; step++) {
      const direction = city.chase(actor.x, actor.z, point.x, point.z);
      const length = Math.hypot(direction.x, direction.z);
      if (!length) break;
      city.move(actor, direction.x / length * .05, direction.z / length * .05, .52);
    }
    assert.ok(Math.hypot(actor.x - point.x, actor.z - point.z) <= .5, `Navigation reaches courtyard ${i}`);
  }
});

test('tram pushes actors clear, blocks ground spray, and restores the crossing after passing', () => {
  const { scene, city } = setup();
  const tram = scene.getObjectByName('Helsinki tram');
  const player = { x: 0, z: 0, radius: .6, root: new THREE.Group() };
  const enemy = { x: -.1, z: 0, size: .52, alive: true, root: new THREE.Group() };
  const across = () => city.lineClear3D(new THREE.Vector3(0, 1, -3), new THREE.Vector3(0, 1, 3), .05);
  assert.equal(tram.visible, false);
  assert.equal(across(), true);
  for (let i = 0; i < 15 * 60; i++) city.update(1 / 60, [player, enemy]);
  assert.equal(tram.visible, true);
  assert.equal(across(), false);
  assert.equal(city.lineClear3D(new THREE.Vector3(0, 4.5, -3), new THREE.Vector3(0, 4.5, 3), .05), true);
  for (const actor of [player, enemy]) {
    assert.ok(Math.abs(actor.z) > 1.4);
    assert.equal(city.canStandAt(actor.x, actor.z, actor.radius ?? actor.size), true);
  }
  for (let i = 0; i < 10 * 60; i++) city.update(1 / 60, []);
  assert.equal(tram.visible, false);
  assert.equal(across(), true);
  // A return service arrives from the opposite end, then reset clears it.
  for (let i = 0; i < 36 * 60 && !tram.visible; i++) city.update(1 / 60, []);
  assert.equal(tram.visible, true);
  assert.ok(tram.position.x > 30);
  city.reset();
  assert.equal(tram.visible, false);
  assert.equal(across(), true);
});

test('all five medkits reset, four are behind houses, and full health leaves them available', () => {
  const { scene, city } = setup();
  const medkits = createMedkits(scene, city);
  const player = { x: 0, z: 0, radius: .736, hp: 5, maxHp: 5 };
  medkits.reset(player);
  const cases = scene.children.filter(mesh => mesh.isInstancedMesh && mesh.count === 5);
  assert.equal(cases.length, 3);
  const matrix = new THREE.Matrix4();
  const points = Array.from({ length: 5 }, (_, i) => {
    cases[0].getMatrixAt(i, matrix);
    return new THREE.Vector3().setFromMatrixPosition(matrix);
  });
  assert.equal(points.filter(p => !city.lineClear(0, 0, p.x, p.z, .1)).length, 4);
  Object.assign(player, { x: points[1].x, z: points[1].z });
  let health = 0;
  medkits.update(1 / 60, player, amount => { health += amount; });
  assert.equal(health, 0);
  player.hp = 3;
  medkits.update(1 / 60, player, amount => { health += amount; });
  assert.equal(health, 2);
  assert.equal(cases[0].count, 4);
  medkits.clear();
  assert.equal(cases[0].count, 0);
  city.reset();
  medkits.reset(player);
  assert.equal(cases[0].count, 5);
});
