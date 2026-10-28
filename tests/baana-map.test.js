import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import test from 'node:test';

registerHooks({ resolve(specifier, context, next) {
  if (specifier === 'three') specifier = new URL('../vendor/three-0.180.0/build/three.module.min.js', import.meta.url).href;
  if (specifier.startsWith('three/addons/')) specifier = new URL(`../vendor/three-0.180.0/examples/jsm/${specifier.slice(13)}`, import.meta.url).href;
  return next(specifier, context);
} });
globalThis.document = { createElement: () => ({ getContext: () => ({ fillRect() {}, fillText() {}, strokeRect() {}, measureText: text => ({ width: text.length * 24 }) }) }) };
const THREE = await import('three');
const { baanaMap } = await import('../maps/baana.js');
const { harborMap } = await import('../maps/harbor.js');
const { createMapManager } = await import('../world/map-manager.js');
const { createBaanaRun, TRAFFIC_CAPACITY } = await import('../runner/baana-run.js');

test('Baana recycles scenery and traffic with bounded geometry and all rider colour variants', () => {
  const map = baanaMap.create(), run = createBaanaRun({ random: () => .6 });
  assert.equal(map.mode, 'runner'); assert.equal(map.canStandAt(0, 0, .736), true);
  assert.equal(map.pickupCapacity('medkit'), 0);
  const meshCount = () => { let count = 0; map.root.traverse(node => { if (node.isMesh) count++; }); return count; };
  const initialCount = meshCount();
  for (let i = 0; i < 100; i++) { run.update(.5); map.updateRunner(run.state); }
  assert.equal(meshCount(), initialCount);
  const pool = map.root.children.filter(node => node.name === 'Baana traffic');
  assert.equal(pool.length, TRAFFIC_CAPACITY);
  assert.equal(pool.filter(node => node.visible).length, run.state.traffic.length);
  assert.deepEqual(pool[0].children.map(node => node.name).sort(), ['blue bike', 'blue scooter', 'green bike', 'green scooter', 'red bike', 'red scooter', 'roadwork cone', 'roadwork tractor']);
  for (const object of pool.filter(node => node.visible)) assert.equal(object.children.filter(child => child.visible).length, 1);
  const sections = map.root.children.filter(node => node.name === 'Baana cutting section');
  assert.equal(sections.length, 5); assert.ok(sections.every(node => node.position.z >= -128 && node.position.z < 32));
  map.reset(); assert.equal(pool.some(node => node.visible), false);
  map.dispose();
});

test('switching between runner and arena disposes shared traffic resources once and restores arena mode', () => {
  const scene = new THREE.Scene(), world = createMapManager(scene, [baanaMap, harborMap], .736);
  world.activate('baana'); const root = scene.children[0], resources = new Set(), disposals = new Map();
  root.traverse(node => {
    if (node.geometry) resources.add(node.geometry);
    if (node.material) resources.add(node.material);
  });
  for (const resource of resources) resource.addEventListener('dispose', () => disposals.set(resource, (disposals.get(resource) ?? 0) + 1));
  world.activate('harbor'); assert.equal(world.mode, 'arena'); assert.equal(root.parent, null);
  assert.equal(disposals.size, resources.size); assert.ok([...disposals.values()].every(count => count === 1));
  assert.equal(world.canStandAt(world.spawn.x, world.spawn.z, .736), true);
  world.activate('baana'); assert.equal(world.mode, 'runner'); assert.equal(scene.children.length, 1);
  world.dispose();
});
