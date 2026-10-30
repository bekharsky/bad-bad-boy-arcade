import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import test from 'node:test';

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === 'three') specifier = new URL('../vendor/three-0.180.0/build/three.module.min.js', import.meta.url).href;
  return nextResolve(specifier, context);
} });
const THREE = await import('three');
const { createBurstEffects } = await import('../burst-effects.js');
const { createSpraySystem } = await import('../spray-system.js');
const { createLiquidStream } = await import('../liquid.js');

test('burst storage stays bounded through repeated kills, expiry, scrolling and restart', () => {
  const scene = new THREE.Scene(), effects = createBurstEffects(scene, 32);
  const mesh = scene.children[0], geometry = mesh.geometry, material = mesh.material;
  assert.equal(mesh.visible, false);
  effects.burst(0, 1, 0, '#ffd34e', 10);
  assert.equal(mesh.count, 10);
  const first = new THREE.Matrix4(); mesh.getMatrixAt(0, first);
  effects.update(.01, 10);
  const scrolled = new THREE.Matrix4(); mesh.getMatrixAt(0, scrolled);
  assert.ok(scrolled.elements[14] - first.elements[14] > .08);
  for (let i = 0; i < 100; i++) effects.burst(0, 1, 0, i % 2 ? '#ffd34e' : '#ffffff', 20);
  assert.equal(mesh.count, 32);
  assert.equal(scene.children.length, 1);
  assert.equal(mesh.geometry, geometry);
  assert.equal(mesh.material, material);
  effects.update(1);
  assert.equal(mesh.count, 0);
  assert.equal(mesh.visible, false);
  const version = mesh.instanceMatrix.version;
  effects.update(1);
  assert.equal(mesh.instanceMatrix.version, version, 'Idle effects do not upload buffers');
  effects.burst(0, 1, 0, '#ffd34e');
  assert.equal(mesh.count, 8);
  effects.clear();
  assert.equal(mesh.count, 0);
  assert.equal(mesh.visible, false);
});

test('power cleanup hides every jet and resets its colour for a restart or runner', () => {
  const scene = new THREE.Scene();
  const spray = createSpraySystem(scene, { lineClear3D: () => true }, () => {}, { refraction: false });
  const emitter = new THREE.Object3D(); emitter.position.y = 1.3;
  const surfaces = scene.children.filter(mesh => mesh.material?.isMeshPhysicalMaterial && !mesh.isInstancedMesh);
  const advance = (powered, frames = 60) => {
    let state;
    for (let i = 0; i < frames; i++) state = spray.update(1 / 60, true, emitter, { dx: 0, dz: 1 }, [], powered);
    return state;
  };
  advance(true);
  assert.equal(surfaces.filter(mesh => mesh.visible).length, 3);
  assert.ok(surfaces.every(mesh => mesh.material.color.getHexString() === '39ff14'));
  spray.resetPressure();
  assert.ok(advance(true, 1).charge < .02);
  // All jets must reset, not just the central range gauge. Their newest ring
  // should have the same low-pressure width after the next tap.
  const radius = mesh => {
    const p = mesh.geometry.attributes.position;
    return Math.hypot(p.getX(p.updateRanges[0].count / 3 - 8) - emitter.position.x,
      p.getY(p.updateRanges[0].count / 3 - 8) - emitter.position.y,
      p.getZ(p.updateRanges[0].count / 3 - 8) - emitter.position.z);
  };
  const widths = surfaces.map(radius);
  assert.ok(Math.max(...widths) - Math.min(...widths) < .003);
  spray.clear();
  assert.ok(scene.children.every(mesh => !mesh.visible));
  assert.ok(surfaces.every(mesh => mesh.material.color.getHexString() === 'ffd34c'));
  advance(false, 2);
  assert.equal(surfaces[0].visible, true);
  assert.ok(surfaces.slice(1).every(mesh => !mesh.visible));
  advance(true, 2);
  advance(false, 1);
  assert.ok(surfaces.slice(1).every(mesh => !mesh.visible), 'Expiry clears side jets');
});

test('liquid uploads only the visible part of geometry and instance buffers', () => {
  const scene = new THREE.Scene();
  const stream = createLiquidStream(scene, { lineClear3D: () => true }, () => {}, { refraction: false });
  const emitter = new THREE.Object3D(); emitter.position.y = 1.3;
  for (let i = 0; i < 30; i++) stream.update(1 / 60, true, emitter, { dx: 0, dz: 1 }, []);
  const surface = scene.children.find(mesh => mesh.material?.isMeshPhysicalMaterial && !mesh.isInstancedMesh);
  const droplets = scene.children.find(mesh => mesh.isInstancedMesh);
  for (const attribute of [surface.geometry.attributes.position, surface.geometry.attributes.normal, surface.geometry.index, droplets.instanceMatrix]) {
    assert.equal(attribute.updateRanges.length, 1);
    assert.equal(attribute.updateRanges[0].start, 0);
    assert.ok(attribute.updateRanges[0].count > 0);
    assert.ok(attribute.updateRanges[0].count < attribute.array.length);
  }
  assert.equal(surface.geometry.index.updateRanges[0].count, surface.geometry.drawRange.count);
  assert.equal(droplets.instanceMatrix.updateRanges[0].count, droplets.count * 16);
});
