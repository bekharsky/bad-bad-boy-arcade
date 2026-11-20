import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import test from 'node:test';

registerHooks({ resolve(specifier, context, next) {
  if (specifier === 'three') specifier = new URL('../vendor/three-0.180.0/build/three.module.min.js', import.meta.url).href;
  if (specifier.startsWith('three/addons/')) specifier = new URL(`../vendor/three-0.180.0/examples/jsm/${specifier.slice(13)}`, import.meta.url).href;
  return next(specifier, context);
} });
const THREE = await import('three');
const { baanaMap } = await import('../maps/baana.js');
const { aleksanterinkatuMap } = await import('../maps/aleksanterinkatu.js');
const { createRunnerRun, riderHealth } = await import('../runner/course.js');
const { createRunnerTraffic } = await import('../runner/track-renderer.js');
const { disposeObject } = await import('../world/dispose.js');
const { CAMEO_KINDS, isCameo } = await import('../runner/cameo-roster.js');
const { createCameoModel, animateCameo } = await import('../runner/cameo-models.js');
const seeded = seed => () => ((seed = seed * 16807 % 2147483647) - 1) / 2147483646;

test('both runner maps vary the roadside roster across seeds and agree across frame rates', () => {
  for (const map of [baanaMap, aleksanterinkatuMap]) {
    const kinds = new Set(), firstKinds = new Set();
    for (const seed of [1, 42, 819, 113, 17, 234]) {
      const sequences = [];
      for (const fps of [30, 60]) {
        const run = createRunnerRun({ ...map.runner, random: seeded(seed) });
        const seen = new Set(), appearances = [];
        while (!run.state.finished) {
          run.update(1 / fps);
          const cameos = run.state.traffic.filter(agent => isCameo(agent.kind));
          assert.ok(cameos.length <= 1);
          for (const agent of cameos) if (!seen.has(agent.id)) {
            seen.add(agent.id); appearances.push([agent.id, agent.x, agent.kind]);
            assert.equal(agent.alive, true);
            assert.equal(Math.abs(agent.x), Math.abs(run.lanes[0]) + .85);
          }
        }
        assert.ok(appearances.length > 1);
        assert.equal(new Set(appearances.map(a => a[2])).size, appearances.length);
        firstKinds.add(appearances[0][2]);
        for (const [, , kind] of appearances) kinds.add(kind);
        sequences.push(appearances);
        run.reset(); assert.equal(run.state.traffic.length, 0);
      }
      assert.deepEqual(sequences[0], sequences[1]);
    }
    assert.ok(firstKinds.size > 1);
    assert.deepEqual([...kinds].sort(), [...CAMEO_KINDS].sort(), map.id);
  }
});

test('all four photo heads switch direction, open the jaw in a run and close it at rest', () => {
  for (const kind of CAMEO_KINDS) {
    const model = createCameoModel(kind), head = model.getObjectByName('Photo head');
    const photos = head.children.map(frame => {
      const [upper, jaw] = frame.children;
      assert.ok(upper.geometry.index.count > 0);
      if (frame.name === 'rear') assert.equal(jaw, undefined);
      else {
        assert.equal(upper.material.map, jaw.material.map, 'Both pieces use the same photograph');
        assert.ok(jaw.geometry.index.count > 0);
      }
      return upper.material.map;
    });
    assert.equal(new Set(photos).size, 5);
    assert.equal(model.userData.style, 'photo-cutout');
    try {
      // These geometry checks run without a DOM or image decoder.
      for (const texture of photos) texture.image = { width: 1, height: 1 };
      for (const [yaw, direction] of [[0, 'front'], [.55, 'quarter'], [1.3, 'left'], [-1.3, 'right']]) {
        assert.equal(animateCameo(model, .1, true, yaw), direction);
        assert.equal(head.rotation.y, yaw);
        const active = head.children.filter(frame => frame.visible);
        assert.deepEqual(active.map(frame => frame.name), [direction]);
        assert.ok(active[0].getObjectByName('Lower jaw').position.y < -.05);
        assert.equal(active[0].getObjectByName('Upper photo').position.y, 0);
        animateCameo(model, .1, false, yaw);
        assert.ok(active[0].getObjectByName('Lower jaw').position.y === 0);
      }
      assert.equal(animateCameo(model, .1, true, Math.PI), 'rear');
      assert.equal(head.visible, true);
      assert.deepEqual(head.children.filter(frame => frame.visible).map(frame => frame.name), ['rear']);
    } finally {
      for (const texture of photos) texture.image = null;
      disposeObject(model);
    }
  }
});

test('the photo stays over the center of the jacket as each cameo turns and runs', () => {
  const ray = new THREE.Raycaster(), origin = new THREE.Vector3(), direction = new THREE.Vector3();
  for (const kind of CAMEO_KINDS) {
    const model = createCameoModel(kind);
    const head = model.getObjectByName('Photo head');
    const jacket = model.children[0];
    const textures = head.children.map(frame => frame.children[0].material.map);
    try {
      for (const texture of textures) texture.image = { width: 1, height: 1 };
      for (const angle of [0, 14, 16, 32, 33, 42, 46, 48, 75, 81, 90, 108, 119, 121, 135, 180]) {
        for (const sign of [-1, 1]) for (const time of [0, .08, .48]) {
          const yaw = THREE.MathUtils.degToRad(angle * sign);
          model.rotation.y = yaw;
          const frameName = animateCameo(model, time, time !== 0, -yaw);
          model.updateMatrixWorld(true);
          const pieces = head.getObjectByName(frameName).children.filter(piece => piece.visible);
          // Sample through the collar from eye level and from an elevated game camera.
          const collar = kind === 'orpo' ? 2.015 : 2.145;
          const y = model.position.y + collar * model.scale.y;
          for (const slope of [0, .22, .64]) {
            direction.set(0, -slope, -1).normalize();
            let overlap = 0;
            for (const x of [-.08, 0, .08]) {
              ray.set(origin.set(x, y + 6 * slope, 6), direction);
              const [photo] = ray.intersectObjects(pieces, false);
              if (photo && ray.intersectObject(jacket).some(hit => hit.distance > photo.distance)) overlap++;
            }
            assert.ok(overlap >= 2, `${kind} ${frameName} at ${angle * sign}°, gait ${time}, slope ${slope}`);
          }
        }
      }
    } finally {
      for (const texture of textures) texture.image = null;
      disposeObject(model);
    }
  }
});

test('shirt, tie, lapels and buttons sit flush on the two suits', () => {
  const ray = new THREE.Raycaster(), origin = new THREE.Vector3(), front = new THREE.Vector3(0, 0, -1);
  for (const kind of ['orpo', 'stubb']) {
    const model = createCameoModel(kind);
    const jacket = model.children[0];
    model.updateMatrixWorld(true);
    try {
      // Collar, tie, both lapel tips and a button should sit just above the coat surface.
      for (const [x, y] of [[.10, 2.125], [0, 2.08], [-.24, 2.035], [.24, 2.035], [.042, 1.55]]) {
        ray.set(jacket.localToWorld(origin.set(x, y, 3)), front);
        const hits = ray.intersectObject(jacket);
        assert.ok(hits.length >= 2, `${kind} garment detail at ${x}, ${y}`);
        assert.ok(hits.at(-1).distance - hits[0].distance < .006, `${kind} loose garment detail at ${x}, ${y}`);
      }
    } finally {
      disposeObject(model);
    }
  }
});

function encounter(kind, lane = 1) {
  const run = createRunnerRun();
  const agent = { id: -1, kind, color: 'blue', lane, progress: 5, speed: 5.2, hp: riderHealth(kind), alive: true, passed: false, hit: false };
  run.state.traffic.push(agent);
  return { run, agent };
}

test('runner passers-by are harmless and run away from the first splash', () => {
  for (const kind of CAMEO_KINDS) {
    const contact = encounter(kind);
    assert.equal(contact.run.update(.5).hits, 0);
    assert.equal(contact.run.state.invulnerable, 0);
    assert.equal(contact.run.state.bonus, 0);
    const { run, agent } = encounter(kind, 0);
    for (let i = 0; i < 20; i++) assert.equal(run.sprayHit(agent.id, { damage: 100, charge: 1 }), false);
    assert.equal(agent.hp, riderHealth(kind));
    assert.equal(agent.alive, true);
    assert.equal(run.update(.5).hits, 0);
    assert.ok(agent.x < run.lanes[0]);
    assert.ok(agent.progress > 5);
    assert.equal(run.state.bonus, 0);
    assert.equal(run.state.cleared, 0);
  }
});

test('harmless runner cameos cannot absorb the damage from a bicycle in the same frame', () => {
  const { run } = encounter('purra');
  run.state.traffic.push({ id: -2, kind: 'bike', lane: 1, progress: 5, speed: 5.2, alive: true, hit: false, passed: false });
  assert.equal(run.update(.5).hits, 1);
});

test('pooled cameo animates without new resources, keeps hit flashes local and resets when a slot changes kind', () => {
  const root = new THREE.Group(), renderer = createRunnerTraffic(root, 'Test', baanaMap.runner);
  const state = { distance: 0, elapsed: .1, speed: 9, traffic: [
    { id: 1, kind: 'purra', color: 'red', lane: 0, progress: 10, speed: 5, hitUntil: 1 },
    { id: 2, kind: 'bike', color: 'red', lane: 1, progress: 10, speed: 5 },
  ] };
  const resources = new Set();
  root.traverse(node => { if (node.geometry) resources.add(node.geometry); for (const material of [node.material].flat().filter(Boolean)) resources.add(material); });
  renderer.update(state);
  const slots = root.children.filter(node => node.name === 'Test traffic');
  const cameo = slots[0].children[0], leg = cameo.getObjectByName('Purra leg -1');
  const originalRotation = leg.rotation.x;
  assert.equal(cameo.getObjectByName('Purra body').children[0].material.emissiveIntensity, .7);
  assert.equal(slots[1].children[0].children[0].children[0].material.emissiveIntensity, 0);
  state.elapsed = .3; renderer.update(state);
  assert.notEqual(leg.rotation.x, originalRotation);
  assert.equal(slots[0].children[0], cameo);
  root.traverse(node => { if (node.geometry) assert.ok(resources.has(node.geometry)); for (const material of [node.material].flat().filter(Boolean)) assert.ok(resources.has(material)); });
  state.traffic[0].cleared = true; renderer.update(state); assert.equal(slots[0].visible, false);
  state.traffic[0] = { ...state.traffic[1], id: 3 }; renderer.update(state);
  assert.equal(slots[0].children[0].name, 'red bike');
  assert.equal(slots[0].children[0].position.y, 0);
  const disposals = new Map();
  for (const resource of resources) resource.addEventListener('dispose', () => disposals.set(resource, (disposals.get(resource) ?? 0) + 1));
  disposeObject(root);
  assert.equal(disposals.size, resources.size);
  assert.ok([...disposals.values()].every(count => count === 1));
});

test('all four models fit their traffic silhouette, have no labels and connect hips to animated legs', () => {
  for (const kind of CAMEO_KINDS) {
    const model = createCameoModel(kind);
    model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(model);
    assert.ok(bounds.max.y < (kind === 'stubb' ? 3.65 : 3.3), 'No overhead nameplate remains');
    assert.ok(bounds.max.x < .7 && bounds.min.x > -.7);
    if (kind === 'orpo' || kind === 'stubb') {
      const head = model.getObjectByName('Photo head'), photoBounds = new THREE.Box3();
      const frontTop = photoBounds.setFromObject(head.getObjectByName('front')).max.y;
      const rearTop = photoBounds.setFromObject(head.getObjectByName('rear')).max.y;
      assert.ok(Math.abs(frontTop - rearTop) < .16, `${kind}'s crown stays at a similar height from the rear`);
    }
    const leg = model.children.find(node => node.userData.stride);
    const body = model.children[0];
    const bodyBounds = new THREE.Box3().setFromObject(body), legBounds = new THREE.Box3().setFromObject(leg);
    assert.ok(legBounds.max.y >= bodyBounds.min.y, 'Hips and thighs overlap rather than float apart');
    assert.ok(leg.children.some(node => node.userData.knee));
    assert.equal(model.userData.character, kind);
  }
});
