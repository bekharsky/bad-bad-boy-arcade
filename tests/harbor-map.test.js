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
const { harborMap } = await import('../maps/harbor.js');
const CITY_SPAWN = harborMap.spawn;
const { createMedkits } = await import('../medkits.js');
const setup = () => {
  const scene = new THREE.Scene();
  const city = harborMap.create();
  scene.add(city.root);
  return { scene, city };
};

test('expanded city keeps its bounds and all eight hidden courtyards walkable and reachable', () => {
  const { city } = setup();
  assert.equal(city.canStandAt(26, 0, .6), true);
  assert.equal(city.canStandAt(0, -28, .6), false);
  const points = [...city.pickupPoints('medkit', .86).slice(1), ...city.pickupPoints('battery', .86)];
  assert.equal(points.length, 8);
  for (const [i, point] of points.entries()) {
    assert.ok(point, `Courtyard ${i} has space for a pickup and the player`);
    assert.equal(city.canStandAt(point.x, point.z, .86), true);
    assert.equal(city.lineClear(CITY_SPAWN.x, CITY_SPAWN.z, point.x, point.z, .1), false, 'A house hides the reward from the square');
    city.routeTo(point.x, point.z);
    const actor = { ...CITY_SPAWN };
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
  const player = { x: 0, z: -5, radius: .6, root: new THREE.Group() };
  const enemy = { x: -.1, z: -5, size: .52, alive: true, root: new THREE.Group() };
  const across = () => city.lineClear3D(new THREE.Vector3(0, 1, -8), new THREE.Vector3(0, 1, -2), .05);
  assert.equal(tram.visible, false);
  assert.equal(across(), true);
  for (let i = 0; i < 15 * 60; i++) city.update(1 / 60, [player, enemy]);
  assert.equal(tram.visible, true);
  assert.equal(across(), false);
  assert.equal(city.lineClear3D(new THREE.Vector3(0, 4.5, -8), new THREE.Vector3(0, 4.5, -2), .05), true);
  for (const actor of [player, enemy]) {
    assert.ok(Math.abs(actor.z + 5) > 1.4);
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
  const scenery = new Set(scene.children);
  const medkits = createMedkits(scene, city);
  const player = { x: 0, z: 0, radius: .736, hp: 5, maxHp: 5 };
  medkits.reset(player);
  const cases = scene.children.filter(mesh => !scenery.has(mesh) && mesh.isInstancedMesh && mesh.count === 5);
  assert.equal(cases.length, 3);
  const matrix = new THREE.Matrix4();
  const points = Array.from({ length: 5 }, (_, i) => {
    cases[0].getMatrixAt(i, matrix);
    return new THREE.Vector3().setFromMatrixPosition(matrix);
  });
  assert.equal(points.filter(p => !city.lineClear(CITY_SPAWN.x, CITY_SPAWN.z, p.x, p.z, .1)).length, 4);
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

test('the boulevard stays asphalt on both sides of the tracks past the plaza', () => {
  const { scene } = setup();
  scene.updateMatrixWorld(true);
  const ray = new THREE.Raycaster();
  for (const x of [-25, -15, 0, 15, 25]) for (const z of [-8, -2]) {
    ray.set(new THREE.Vector3(x, .5, z), new THREE.Vector3(0, -1, 0));
    const hit = ray.intersectObjects(scene.children, true)[0];
    assert.ok(hit, 'A continuous road is present');
    assert.equal(hit.object.material.color.getHexString(), '414b53', 'Plaza paving must not cover a traffic lane');
  }
  const shop = scene.getObjectByName('Verkkopaukka');
  assert.ok(shop.position.distanceTo(new THREE.Vector3(CITY_SPAWN.x, 0, CITY_SPAWN.z)) < 10, 'The hero starts beside the shop');
  for (const name of ['West brick warehouse', 'East brick warehouse', 'West harbor terminal']) {
    assert.ok(scene.getObjectByName(name).position.z < -12, 'The port is on the water side of the boulevard');
  }
  const hotel = scene.getObjectByName('Clarion Hotel Helsinki');
  assert.ok(hotel, 'Clarion Hotel replaces the cathedral');
  assert.equal(scene.getObjectByName('Helsinki Cathedral'), undefined);
  const bounds = new THREE.Box3().setFromObject(hotel);
  assert.ok(bounds.max.x < -27.8, 'The landmark stays outside playable streets');
  assert.ok(bounds.max.y > 12, 'The towers and rooftop pool rise above the neighbourhood');
});

test('only Verkkopaukka restores its building signs', () => {
  const { scene } = setup();
  const shop = scene.getObjectByName('Verkkopaukka');
  const roof = shop.getObjectByName('Verkkopaukka rooftop V');
  const square = shop.getObjectByName('Verkkopaukka square V');
  assert.ok(roof.material.map.isCanvasTexture);
  assert.equal(square.material.map, roof.material.map);
  assert.ok(roof.position.y > 6.8, 'The original V rises above the roof');
  assert.ok(square.position.x > 3.6, 'The second logo faces the hero’s starting square');
  assert.equal(square.rotation.y, Math.PI / 2);
  const names = ['Residential building', 'West brick warehouse', 'East brick warehouse', 'West harbor terminal', 'Clarion Hotel Helsinki'];
  const buildings = [];
  scene.traverse(node => { if (names.includes(node.name)) buildings.push(node); });
  assert.ok(buildings.length >= 10);
  for (const building of buildings) building.traverse(node => {
    if (!node.isMesh) return;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    assert.ok(materials.every(material => !material.map), `${building.name} has no sign texture`);
  });
});

test('reset restores faded buildings and their shadows for the next run', () => {
  const { city, scene } = setup();
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(-14, 3, 15);
  const hero = new THREE.Group();
  hero.position.set(-14, 0, 0);
  city.updateVisibility(camera, hero, 3.45, 1);
  const meshes = scene.getObjectByName('Verkkopaukka').children;
  assert.ok(meshes.some(mesh => mesh.material.opacity < .2));
  city.reset();
  for (const mesh of meshes) {
    assert.equal(mesh.material.opacity, 1);
    assert.equal(mesh.material.transparent, false);
    assert.equal(mesh.castShadow, true);
  }
});


test('harbor starts in profile and Baltic water surrounds every side of the city', () => {
  const { scene } = setup();
  assert.equal(harborMap.spawn.heading, Math.PI / 2);
  const water = scene.getObjectByName('Baltic harbor water');
  scene.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(water);
  for (const [x, z] of [[-60, 6], [55, 6], [-4, -45], [-4, 55]]) {
    assert.equal(bounds.containsPoint(new THREE.Vector3(x, -.2, z)), true, `Water reaches ${x}, ${z}`);
  }
  const ferry = scene.getObjectByName('Cruise ferry');
  ferry.traverse(node => { if (node.isMesh) assert.equal(node.material.map, null, 'The ferry has no text sign'); });
});
