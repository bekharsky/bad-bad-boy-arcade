import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';
import { createMapTransition } from '../world/map-transition.js';

registerHooks({ resolve(specifier, context, next) {
  if (specifier === 'three') specifier = new URL('../vendor/three-0.180.0/build/three.module.min.js', import.meta.url).href;
  return next(specifier, context);
} });
const THREE = await import('three');
const { createTransitionRenderer, transitionFrame } = await import('../world/transition-renderer.js');

test('a transition freezes the outgoing map until full cover and commits exactly once', () => {
  const calls = [], plan = { mapId: 'baana', number: 4 };
  const transition = createMapTransition({ onSwap: value => calls.push(value), onFinish: () => calls.push('done') });
  assert.equal(transition.start(plan), true);
  assert.equal(transition.start({ mapId: 'kamppi' }), false);
  transition.update(.59); assert.deepEqual(calls, []);
  assert.equal(transition.active, true);
  transition.update(.01); assert.deepEqual(calls, [plan]);
  assert.equal(transitionFrame(transition.progress).cover, 1);
  transition.update(.2); assert.deepEqual(calls, [plan]);
  transition.update(.4); assert.deepEqual(calls, [plan, 'done']);
  assert.equal(transition.active, false);
  transition.update(10); assert.deepEqual(calls, [plan, 'done']);
});

test('pause preserves transition time and cancelling a run prevents a stale swap', () => {
  const maps = [], transition = createMapTransition({ onSwap: plan => maps.push(plan.mapId) });
  transition.start({ mapId: 'baana' }); transition.update(.3);
  const progress = transition.progress;
  transition.update(0); assert.equal(transition.progress, progress);
  transition.cancel(); transition.update(10); assert.deepEqual(maps, []);
  transition.start({ mapId: 'senate-square' }, .5);
  transition.update(.25); assert.deepEqual(maps, ['senate-square']);
  transition.cancel(); transition.update(10); assert.deepEqual(maps, ['senate-square']);
  assert.throws(() => transition.start(null));
  assert.throws(() => transition.start({ mapId: 'x' }, 0));
  assert.throws(() => transition.update(-1));
});

test('shader cover conceals the swap while both ends match ordinary rendering', () => {
  for (const progress of [0, 1]) {
    const frame = transitionFrame(progress);
    assert.ok(frame.pixels < 1e-10); assert.equal(frame.cover, 0); assert.equal(frame.title, 0);
  }
  for (const progress of [.47, .49, .5, .51, .53]) assert.equal(transitionFrame(progress).cover, 1);
  for (const progress of [0, .3, .5, .8, 1]) assert.equal(transitionFrame(progress, true).pixels, 0);
  assert.equal(transitionFrame(.5).pixels, 1); assert.equal(transitionFrame(.5).title, 1);
});

test('the GPU pass resizes with the drawing buffer, restores the target and releases its resources', () => {
  let width = 640, height = 480, active = null, alpha = 1;
  const draws = [], targets = [];
  const renderer = {
    extensions: { has: () => false },
    getDrawingBufferSize: value => value.set(width, height),
    getClearAlpha: () => alpha, setClearAlpha: value => { alpha = value; },
    getRenderTarget: () => active,
    setRenderTarget(value) { active = value; targets.push(value); },
    render(scene, camera) { draws.push({ scene, camera, active, background: scene.background, alpha }); },
  };
  const effect = createTransitionRenderer(renderer), scene = new THREE.Scene(), camera = new THREE.Camera();
  const background = scene.background = new THREE.Color('#376b7c');
  effect.render(scene, camera, .5);
  assert.equal(scene.background, background); assert.equal(alpha, 1);
  assert.equal(draws[0].background, null); assert.equal(draws[0].alpha, 0);
  assert.equal(draws.length, 2); assert.equal(draws[0].scene, scene); assert.equal(draws[1].active, null);
  const target = targets[0], quad = draws[1].scene.children[0];
  assert.equal(target.width, 640); assert.equal(target.height, 480);
  assert.equal(quad.material.uniforms.cover.value, 1);
  width = 390; height = 844;
  effect.render(scene, camera, .25, true);
  assert.equal(target.width, width); assert.equal(target.height, height);
  assert.equal(quad.material.uniforms.pixels.value, 0);
  let disposed = 0;
  for (const resource of [target, quad.geometry, quad.material]) resource.addEventListener('dispose', () => disposed++);
  effect.dispose(); assert.equal(disposed, 3);
});

test('a failed scene render still restores the previous render target', () => {
  let active = { original: true }, alpha = .6; const original = active;
  const renderer = {
    extensions: { has: () => false }, getDrawingBufferSize: value => value.set(100, 100),
    getClearAlpha: () => alpha, setClearAlpha: value => { alpha = value; },
    getRenderTarget: () => active, setRenderTarget: value => { active = value; },
    render() { throw new Error('GPU draw failed'); },
  };
  const effect = createTransitionRenderer(renderer);
  assert.throws(() => effect.render(new THREE.Scene(), new THREE.Camera(), .2), /GPU draw failed/);
  assert.equal(active, original); assert.equal(alpha, .6); effect.dispose();
});
