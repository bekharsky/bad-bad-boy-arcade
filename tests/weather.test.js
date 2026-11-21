import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { chooseWeather, createWeather } from '../world/weather.js';

test('district weather resets precipitation and surface uniforms without replacing map resources', () => {
  assert.deepEqual([0, .549, .55, .819, .82, .999].map(chooseWeather),
    ['clear', 'clear', 'rain', 'rain', 'snow', 'snow']);
  const scene = new THREE.Scene(), map = new THREE.Group();
  const weather = createWeather(scene, new THREE.HemisphereLight(), new THREE.DirectionalLight());
  const street = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
  const slot = new THREE.Group(), actor = new THREE.Mesh(street.geometry, new THREE.MeshStandardMaterial());
  slot.userData.runnerTraffic = true;
  slot.add(actor); map.add(street, slot);
  const field = scene.getObjectByName('Precipitation');
  const particles = field.geometry, actorCompile = actor.material.onBeforeCompile;
  weather.enter('snow', map);
  const shader = { ...THREE.ShaderLib.standard, uniforms: {} };
  street.material.onBeforeCompile(shader);
  assert.deepEqual(shader.uniforms.surfaceWeather.value.toArray(), [0, 1]);
  assert.equal(actor.material.onBeforeCompile, actorCompile);
  weather.update(.25, 37);
  assert.equal(field.material.uniforms.seconds.value, .25);
  assert.equal(shader.uniforms.courseTravel.value, 37);
  const version = street.material.version;
  weather.enter('rain', map);
  assert.equal(field.geometry, particles);
  assert.equal(field.visible, true);
  assert.equal(field.material.uniforms.seconds.value, 0);
  assert.equal(shader.uniforms.courseTravel.value, 0);
  assert.deepEqual(shader.uniforms.surfaceWeather.value.toArray(), [1, 0]);
  weather.enter('clear', map);
  assert.equal(field.visible, false);
  assert.equal(street.material.version, version);
  assert.deepEqual(shader.uniforms.surfaceWeather.value.toArray(), [0, 0]);
  weather.dispose();
  assert.equal(scene.children.length, 0);
  street.geometry.dispose(); street.material.dispose(); actor.material.dispose();
});
