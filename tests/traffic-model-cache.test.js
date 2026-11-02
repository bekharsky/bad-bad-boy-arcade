import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import test from 'node:test';

registerHooks({ resolve(specifier, context, next) {
  if (specifier === 'three') specifier = new URL('../vendor/three-0.180.0/build/three.module.min.js', import.meta.url).href;
  if (specifier.startsWith('three/addons/')) specifier = new URL(`../vendor/three-0.180.0/examples/jsm/${specifier.slice(13)}`, import.meta.url).href;
  return next(specifier, context);
} });

const { createTrafficModel, animateTraffic } = await import('../runner/traffic-models.js');
const { disposeObject } = await import('../world/dispose.js');

test('cached traffic templates give each map independent disposable resources and poses', () => {
  const first = createTrafficModel('bike', 'green');
  const second = createTrafficModel('bike', 'green');
  const mesh = root => { let found; root.traverse(node => { if (!found && node.isMesh) found = node; }); return found; };
  const firstMesh = mesh(first), secondMesh = mesh(second);
  assert.notEqual(firstMesh.geometry, secondMesh.geometry);
  assert.notEqual(firstMesh.material, secondMesh.material);
  assert.deepEqual(firstMesh.geometry.getAttribute('position').array, secondMesh.geometry.getAttribute('position').array);
  animateTraffic(first, 3, 5);
  assert.notEqual(first.children[0].rotation.x, second.children[0].rotation.x);
  let firstDisposals = 0, secondDisposals = 0;
  firstMesh.geometry.addEventListener('dispose', () => firstDisposals++);
  secondMesh.geometry.addEventListener('dispose', () => secondDisposals++);
  disposeObject(first);
  assert.equal(firstDisposals, 1); assert.equal(secondDisposals, 0);
  const third = createTrafficModel('bike', 'green');
  assert.deepEqual(mesh(third).geometry.getAttribute('position').array, secondMesh.geometry.getAttribute('position').array);
  disposeObject(second); disposeObject(third);
  assert.equal(secondDisposals, 1);
});
