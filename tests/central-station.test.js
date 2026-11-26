import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import test from 'node:test';

registerHooks({ resolve(specifier, context, next) {
  if (specifier === 'three') specifier = new URL('../vendor/three-0.180.0/build/three.module.min.js', import.meta.url).href;
  if (specifier.startsWith('three/addons/')) specifier = new URL('../vendor/three-0.180.0/examples/jsm/' + specifier.slice(13), import.meta.url).href;
  return next(specifier, context);
} });
globalThis.document = { createElement: () => ({ getContext: () => ({ fillRect() {}, fillText() {} }) }) };
const THREE = await import('three');
const { centralStationMap } = await import('../maps/central-station.js');

test('the forecourt and Oodi arcade share a continuous playable plaza with reachable pickups', () => {
  const map = centralStationMap.create(), radius = .74;
  try {
    const walk = [[map.spawn.x, map.spawn.z], [12, 14], [12, 6.5], [-4, 6.5], [-7, -10],
      [-10, -18], [-10, -27], [-7, -33], [-6, -38]];
    for (let i = 1; i < walk.length; i++) {
      assert.ok(map.lineClear(...walk[i - 1], ...walk[i], radius), 'Walk to ' + walk[i]);
    }
    for (const [name, x, z] of [['Helsinki Central railway station', 12, 0], ['Postitalo', -20, 0],
      ['Kiasma', -26.5, -22], ['Sanomatalo', 5, -21.5], ['Oodi library', -6, -42]]) {
      assert.ok(map.root.getObjectByName(name), name);
      assert.equal(map.canStandAt(x, z, radius), false, name + ' has solid walls');
    }
    for (const kind of ['medkit', 'battery']) {
      assert.equal(map.pickupPoints(kind, radius).length, centralStationMap.pickups[kind].length);
    }
  } finally { map.dispose(); }
});

test('station tram crosses the forecourt, yields a clear crossing and returns on its rails', () => {
  const map = centralStationMap.create();
  try {
    const tram = map.root.getObjectByName('Helsinki tram');
    const { x, z } = tram.position;
    const from = { x: 12, y: 1, z: z - 2.2 }, to = { ...from, z: z + 2.2 };
    const waiting = { x: 12, z, radius: .74, root: new THREE.Group() };
    let passed = 0;
    const enemy = { x: 12, z, size: .6, alive: true, onTramHit() { this.alive = false; passed++; } };
    assert.equal(tram.visible, false);
    assert.ok(map.lineClear3D(from, to));
    assert.equal(map.canStandAt(x, z, .5), false);
    let delayedFrames = 0;
    while (map.lineClear3D(from, to) && delayedFrames < 35 * 60) {
      map.update(1 / 60, [waiting, enemy]);
      delayedFrames++;
    }
    assert.ok(delayedFrames >= 10 * 60, 'The first service waits before entering the station');
    assert.ok(tram.visible);
    assert.equal(map.lineClear3D(from, to), false);
    assert.ok(map.canStandAt(waiting.x, waiting.z, waiting.radius));
    assert.equal(passed, 1);
    for (let i = 0; i < 120; i++) map.update(1 / 60, []);
    assert.ok(map.lineClear3D(from, to));
    let previous = tram.position.x, returned = false;
    for (let i = 0; i < 42 * 60 && !returned; i++) {
      map.update(1 / 60, []);
      returned = tram.visible && tram.position.x < previous && !map.lineClear3D(from, to);
      previous = tram.position.x;
    }
    assert.ok(returned);
    map.reset();
    assert.equal(tram.position.x, x);
    assert.equal(map.canStandAt(x, z, .5), false);
  } finally { map.dispose(); }
});

test('low perimeter rails, the tram portals and the open side of the shelter match navigation', () => {
  const map = centralStationMap.create();
  try {
    const { minX, maxX, minZ, maxZ } = centralStationMap.bounds;
    const track = map.root.getObjectByName('Helsinki tram').position.z;
    for (const [x, z] of [[minX + .18, 0], [maxX - .18, 9], [10, minZ + .18], [0, maxZ - .18]]) {
      assert.equal(map.canStandAt(x, z, .12), false);
    }
    for (const x of [minX + .22, maxX - .22]) assert.ok(map.canStandAt(x, track, .12));
    assert.ok(map.lineClear(-16.8, track + 2, -16.8, track + 3.9, .5));
    assert.equal(map.canStandAt(-16.8, track + 5, .5), false);
    const acrossRails = (y, z) => map.lineClear3D({ x: 23, y, z }, { x: 29, y, z });
    assert.equal(acrossRails(1.5, -12), false, 'The platform fence blocks a low shot');
    assert.equal(acrossRails(3, -12), false, 'The train body blocks above the fence');
    assert.equal(acrossRails(3, -7.5), true, 'The air above the buffer stop is clear');
  } finally { map.dispose(); }
});
