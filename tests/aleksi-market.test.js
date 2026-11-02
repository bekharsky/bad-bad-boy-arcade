import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';
import { TRAM_LANES } from '../runner/course.js';
import { TRAM_CAR_OFFSET, TRAM_CAR_HALF_LENGTH, TRAM_CAR_HALF_WIDTH } from '../runner/tram-route.js';

registerHooks({ resolve(s, c, next) {
  if (s === 'three') s = new URL('../vendor/three-0.180.0/build/three.module.min.js', import.meta.url).href;
  if (s.startsWith('three/addons/')) s = new URL(`../vendor/three-0.180.0/examples/jsm/${s.slice(13)}`, import.meta.url).href;
  return next(s, c);
} });
const THREE = await import('three');
const { aleksanterinkatuMap } = await import('../maps/aleksanterinkatu.js');
const { aleksiTramRoute } = await import('../maps/aleksi-waterfront.js');

test('granite setts cover street, pavements, crossings and quay with shared filtered colour and relief maps', () => {
  const map = aleksanterinkatuMap.create(), paving = map.root.getObjectByName('Aleksi granite paving');
  assert.equal(paving.children.length, 3, 'Surface patches are batched by paving type');
  assert.equal(new Set(paving.children.map(mesh => mesh.material.map)).size, 1);
  assert.equal(new Set(paving.children.map(mesh => mesh.material.bumpMap)).size, 1);
  const textures = [paving.children[0].material.map, paving.children[0].material.bumpMap];
  for (const texture of textures) {
    assert.equal(texture.wrapS, THREE.RepeatWrapping); assert.equal(texture.wrapT, THREE.RepeatWrapping);
    assert.equal(texture.minFilter, THREE.LinearMipmapLinearFilter); assert.equal(texture.generateMipmaps, true);
    assert.ok(texture.anisotropy >= 4);
    assert.ok(new Set(texture.image.data).size > 30, 'Stone faces, joints and bevels remain distinguishable');
  }
  map.root.updateMatrixWorld(true);
  for (const [x, progress, height, name] of [[1.8, 70, .04, 'road'], [7.2, 75, .12, 'walk'], [1.8, 140.8, .04, 'road'], [-18, 620, .02, 'square'], [4, 660, .04, 'square']]) {
    const hits = new THREE.Raycaster(new THREE.Vector3(x, 1, -progress), new THREE.Vector3(0, -1, 0)).intersectObject(paving, true);
    assert.ok(hits.length); assert.ok(Math.abs(hits[0].point.y - height) < .001);
    assert.equal(hits[0].object.name, `Aleksi ${name} setts`);
  }
  let disposed = 0; for (const texture of textures) texture.addEventListener('dispose', () => disposed++);
  map.dispose(); assert.equal(disposed, 2, 'Shared paving textures are released exactly once');
});

function separatedFromCar(bounds, pose) {
  const c = Math.cos(pose.heading), s = Math.sin(pose.heading), u = [c, -s], v = [s, c];
  const dx = (bounds.min.x + bounds.max.x) / 2 - pose.x, dz = (bounds.min.z + bounds.max.z) / 2 - pose.z;
  const hx = (bounds.max.x - bounds.min.x) / 2, hz = (bounds.max.z - bounds.min.z) / 2;
  return [[1, 0], [0, 1], u, v].some(([x, z]) => {
    const car = Math.abs(x * u[0] + z * u[1]) * TRAM_CAR_HALF_WIDTH + Math.abs(x * v[0] + z * v[1]) * TRAM_CAR_HALF_LENGTH;
    return Math.abs(dx * x + dz * z) > car + Math.abs(x) * hx + Math.abs(z) * hz + .1;
  });
}

test('market buildings, visitors and fountain leave the runner and both articulated tram paths clear', () => {
  const map = aleksanterinkatuMap.create(), market = map.root.getObjectByName('Aleksi market quarter');
  const kinds = new Set(market.children.map(node => node.userData.waterfrontKind));
  assert.deepEqual([...kinds].sort(), ['bikes', 'boat', 'cafe', 'fountain', 'hall', 'stall', 'tree', 'visitor']);
  assert.ok(market.children.filter(node => node.userData.waterfrontKind === 'stall').length >= 9);
  assert.ok(market.children.filter(node => node.userData.waterfrontKind === 'visitor').length >= 16);
  const props = market.children.filter(node => node.userData.waterfrontKind !== 'boat').map(node => ({ name: node.name, bounds: new THREE.Box3().setFromObject(node) }));
  for (const { name, bounds } of props) {
    assert.ok(bounds.max.x < -5.3 || bounds.min.x > 5.3, `${name} leaves the running corridor clear`);
    assert.ok(bounds.max.z < -580, `${name} leaves the last scooter crossing clear`);
    for (const lane of TRAM_LANES) for (let progress = 635; progress < 790; progress += .75) for (const offset of [-TRAM_CAR_OFFSET, TRAM_CAR_OFFSET]) {
      assert.ok(separatedFromCar(bounds, aleksiTramRoute(progress + offset, lane)), `${name} clips a tram on lane ${lane}, progress ${progress}`);
    }
  }
  map.dispose();
});
