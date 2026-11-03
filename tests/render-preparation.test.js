import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';

registerHooks({ resolve(specifier, context, next) {
  if (specifier === 'three') specifier = new URL('../vendor/three-0.180.0/build/three.module.min.js', import.meta.url).href;
  return next(specifier, context);
} });
const THREE = await import('three');
const { prepareScene } = await import('../world/render-preparation.js');

function fixture(compile = async () => {}) {
  const scene = new THREE.Scene(), camera = new THREE.Camera();
  const texture = new THREE.Texture();
  const wall = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({ map: texture }));
  const glass = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({ map: texture, transparent: true, opacity: .4 }));
  const stream = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshPhysicalMaterial({ transmission: .16, transparent: true }));
  stream.visible = false;
  scene.add(wall, glass, stream);
  const originalTarget = { original: true }, compilations = [], draws = [], uploads = [], disposed = new Set();
  let active = originalTarget;
  const renderer = {
    getRenderTarget: () => active,
    setRenderTarget(value) {
      active = value;
      if (value !== originalTarget) value.addEventListener('dispose', () => disposed.add(value));
    },
    compileAsync(scene, camera) {
      compilations.push({ active, transparent: wall.material.transparent, glass: glass.material.transparent });
      return compile(scene, camera);
    },
    initTexture: value => uploads.push(value),
    render() { draws.push({ active, stream: stream.visible }); },
  };
  return { renderer, scene, camera, wall, glass, stream, texture, originalTarget, compilations, draws, uploads, disposed };
}

test('preparation retains canvas, offscreen and fading programs without changing the scene', async () => {
  const f = fixture();
  await prepareScene(f.renderer, f.scene, f.camera);
  assert.deepEqual(f.compilations.map(c => c.transparent), [true, true, false, false]);
  assert.ok(f.compilations.every(c => c.glass));
  assert.equal(f.compilations[0].active, f.compilations[2].active);
  assert.equal(f.compilations[1].active, f.originalTarget);
  assert.deepEqual(f.uploads, [f.texture], 'Shared textures upload once');
  assert.deepEqual(f.draws, [{ active: f.originalTarget, stream: true }]);
  assert.equal(f.stream.visible, false);
  assert.equal(f.wall.material.transparent, false);
  assert.equal(f.glass.material.transparent, true);
  assert.equal(f.glass.material.opacity, .4);
  assert.equal(f.renderer.getRenderTarget(), f.originalTarget);
  assert.equal(f.disposed.size, 1);
});

test('an asynchronous preparation failure restores material and renderer state', async () => {
  let rejectCompilation;
  const f = fixture(() => new Promise((resolve, reject) => { rejectCompilation = reject; }));
  const pending = prepareScene(f.renderer, f.scene, f.camera);
  assert.equal(f.renderer.getRenderTarget(), f.originalTarget, 'Never leave an offscreen target bound across an await');
  rejectCompilation(new Error('Shader preparation failed'));
  await assert.rejects(pending, /Shader preparation failed/);
  assert.equal(f.wall.material.transparent, false);
  assert.equal(f.stream.visible, false);
  assert.equal(f.renderer.getRenderTarget(), f.originalTarget);
  assert.equal(f.disposed.size, 1);
  assert.equal(f.draws.length, 0);
});

test('a failed first draw still hides empty effects and releases the temporary target', async () => {
  const f = fixture();
  f.renderer.render = () => { throw new Error('GPU draw failed'); };
  await assert.rejects(prepareScene(f.renderer, f.scene, f.camera), /GPU draw failed/);
  assert.equal(f.stream.visible, false);
  assert.equal(f.wall.material.transparent, false);
  assert.equal(f.renderer.getRenderTarget(), f.originalTarget);
  assert.equal(f.disposed.size, 1);
});

test('a district can warm its buffers through the covered transition instead of exposing the new scene', async () => {
  const f = fixture();
  let coveredDraws = 0;
  await prepareScene(f.renderer, f.scene, f.camera, () => {
    assert.equal(f.stream.visible, true);
    assert.equal(f.renderer.getRenderTarget(), f.originalTarget);
    coveredDraws++;
  });
  assert.equal(coveredDraws, 1);
  assert.equal(f.draws.length, 0, 'No uncovered canvas draw');
  assert.equal(f.stream.visible, false);
});
