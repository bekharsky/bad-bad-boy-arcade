import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import test from 'node:test';

registerHooks({ resolve(specifier, context, next) {
  if (specifier === 'three') specifier = new URL('../vendor/three-0.180.0/build/three.module.min.js', import.meta.url).href;
  if (specifier.startsWith('three/addons/')) specifier = new URL(`../vendor/three-0.180.0/examples/jsm/${specifier.slice(13)}`, import.meta.url).href;
  return next(specifier, context);
} });
const THREE = await import('three');
const { createSceneryModel } = await import('../maps/scenery-model.js');
const { addTree } = await import('../maps/vegetation.js');
const { registerBuilding, createBuildingVisibility } = await import('../world/building-visibility.js');
const { disposeObject } = await import('../world/dispose.js');

test('scenery merges indexed and silhouette geometry, preserves colours and transfers ownership once', () => {
  const model = createSceneryModel('Mixed detail');
  const box = new THREE.BoxGeometry(), triangle = new THREE.BufferGeometry();
  triangle.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3));
  let disposals = 0;
  box.addEventListener('dispose', () => disposals++);
  triangle.addEventListener('dispose', () => disposals++);
  model.geometry('#ff0000', box); model.geometry('#00ff00', triangle);
  const root = model.finish({ vertexColors: true, roughness: .85 });
  assert.equal(root.children.length, 1); assert.equal(disposals, 2);
  const mesh = root.children[0], colors = mesh.geometry.getAttribute('color');
  assert.equal(colors.getX(0), 1); assert.equal(colors.getY(colors.count - 1), 1);
  assert.equal(mesh.material.roughness, .85);
  assert.equal(model.finish(), root); assert.equal(root.children.length, 1); assert.equal(disposals, 2);
  assert.throws(() => model.box('#fff', 0, 0, 0, 1, 1, 1), /already finished/);
  const combined = createSceneryModel('Preserved detail');
  combined.geometry(null, mesh.geometry.clone().rotateY(Math.PI / 2));
  combined.box('#0000ff', 2, 0, 0, 1, 1, 1);
  const result = combined.finish({ vertexColors: true });
  assert.equal(result.children.length, 1);
  assert.equal(result.children[0].geometry.getAttribute('color').getX(0), 1);
  let released = 0;
  result.children[0].geometry.addEventListener('dispose', () => released++);
  disposeObject(result); assert.equal(released, 1);
  disposeObject(root);
});

test('nested facade parts fade together with unique materials and reset shadows', () => {
  const model = createSceneryModel('House'); model.box('#abcdef', 0, 2, 0, 3, 4, 3);
  const root = model.finish({ vertexColors: true }), mesh = root.children[0];
  const nested = new THREE.Group(); nested.add(new THREE.Mesh(mesh.geometry, mesh.material)); root.add(nested);
  const house = registerBuilding(root);
  assert.equal(house.meshes.length, 2); assert.equal(house.materials.length, 1);
  const camera = new THREE.PerspectiveCamera(), hero = new THREE.Group();
  camera.position.set(0, 2, 10); hero.position.set(0, 0, -4);
  const visibility = createBuildingVisibility([house]); visibility.update(camera, hero, 3.45, 1);
  assert.ok(mesh.material.opacity < .2); assert.equal(mesh.castShadow, false);
  visibility.reset(); assert.equal(mesh.material.opacity, 1); assert.equal(mesh.castShadow, true);
  disposeObject(root);
});

test('tree variants have deterministic geometry and fit one compact scenery mesh', () => {
  for (let variant = 0; variant < 3; variant++) {
    const build = () => { const model = createSceneryModel('Tree'); addTree(model, { height: 4.4, radius: 1.2, variant }); return model.finish({ vertexColors: true }); };
    const first = build(), second = build(), mesh = first.children[0];
    assert.equal(first.children.length, 1);
    assert.ok(mesh.geometry.getAttribute('position').count < 650, 'Small tree geometry budget');
    assert.deepEqual(mesh.geometry.getAttribute('position').array, second.children[0].geometry.getAttribute('position').array);
    mesh.geometry.computeBoundingBox();
    assert.ok(mesh.geometry.boundingBox.max.y <= 4.4);
    assert.ok(mesh.geometry.boundingBox.min.y >= -1e-6);
    assert.ok([...mesh.geometry.getAttribute('normal').array].every(Number.isFinite));
    disposeObject(first); disposeObject(second);
  }
});
