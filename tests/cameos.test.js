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
    for (let sample = 0; sample < 48; sample++) {
      const seed = 1 + 65537 * sample;
      const sequences = [];
      for (const fps of [30, 60]) {
        const run = createRunnerRun({ ...map.runner, random: seeded(seed) });
        const seen = new Set(), appearances = [];
        while (!run.state.finished) {
          run.update(1 / fps);
          const cameos = run.state.traffic.filter(agent => isCameo(agent.kind));
          assert.ok(cameos.length <= 1);
          if (cameos.some(agent => !agent.passed)) {
            assert.ok(run.state.traffic.every(agent => isCameo(agent.kind) || agent.passed || agent.cleared),
              'The cameo has an open stretch of the course');
          }
          for (const agent of cameos) if (!seen.has(agent.id)) {
            seen.add(agent.id); appearances.push([agent.id, agent.x, agent.kind]);
            if (appearances.length > 1) assert.ok(agent.x * appearances.at(-2)[1] < 0, 'The next jogger uses the other shoulder');
            else assert.equal(agent.id, 0, 'The first encounter introduces a jogger before traffic');
            assert.equal(agent.alive, true);
            assert.equal(Math.abs(agent.x), Math.abs(run.lanes[0]) + .85);
            assert.ok(agent.age < .08);
            assert.ok(agent.progress - run.state.distance > (run.state.speed + agent.speed) * 1.7);
          }
        }
        assert.ok(appearances.length >= (map === baanaMap ? 7 : 5), map.id + ' regularly introduces a new guest');
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

test('changing throttle leaves time to see each approaching face before a crossing warning', () => {
  for (const map of [baanaMap, aleksanterinkatuMap]) {
    const run = createRunnerRun({ ...map.runner, random: seeded(1729) });
    const started = new Map();
    while (!run.state.finished) {
      run.setThrottle(Math.floor(run.state.elapsed / 1.8) % 2 ? 1 : -1);
      run.update(1 / 30);
      const actor = run.state.traffic.find(agent => isCameo(agent.kind) && !agent.passed);
      if (!actor) continue;
      if (!started.has(actor.id)) started.set(actor.id, run.state.elapsed);
      if (actor.z >= 0) assert.ok(run.state.elapsed - started.get(actor.id) >= 2.15);
      assert.ok(run.state.crossings.every(c => c.phase === 'clear' || c.phase === 'approach'));
    }
    assert.ok(started.size >= 2);
  }
});

test('every 3D head keeps its volume under rotation and animates the jaw only while running', () => {
  const ray = new THREE.Raycaster();
  for (const kind of CAMEO_KINDS) {
    const model = createCameoModel(kind);
    const head = model.getObjectByName('3D head');
    const face = head.getObjectByName('Continuous face and lips');
    assert.equal(model.userData.style, 'sculpted-3d');
    head.traverse(node => {
      if (!node.isMesh) return;
      for (const material of [node.material].flat()) assert.equal(material.map, null, kind);
    });
    const position = face.geometry.attributes.position;
    const opened = face.geometry.morphAttributes.position[0];
    assert.equal(opened.count, position.count);
    assert.ok(opened.getY(14) < position.getY(14), kind + ' lowers the lower lip');
    assert.equal(opened.getY(10), position.getY(10), kind + ' leaves the forehead at rest');
    for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      model.rotation.y = yaw;
      assert.equal(animateCameo(model, .16, true), 'sculpted-3d');
      assert.ok(face.morphTargetInfluences[0] > .9);
      model.updateMatrixWorld(true);
      const centre = head.getWorldPosition(new THREE.Vector3());
      ray.set(centre.clone().add(new THREE.Vector3(0, .12, 2)), new THREE.Vector3(0, 0, -1));
      const front = ray.intersectObject(head)[0];
      ray.set(centre.clone().add(new THREE.Vector3(0, .12, -2)), new THREE.Vector3(0, 0, 1));
      const back = ray.intersectObject(head)[0];
      assert.ok(front && back && front.point.z - back.point.z > .3, kind + ' has depth at ' + yaw);
      animateCameo(model, .16, false);
      assert.equal(face.morphTargetInfluences[0], 0);
      animateCameo(model, .16, true, 0, true);
      assert.equal(face.morphTargetInfluences[0], 0);
    }
    disposeObject(model);
  }
});

test('the 3D head, neck and jacket overlap through the running cycle', () => {
  for (const kind of CAMEO_KINDS) {
    const model = createCameoModel(kind), [jacket, neck] = model.children;
    const head = model.getObjectByName('3D head');
    for (const yaw of [0, Math.PI / 2, Math.PI]) for (const gait of [0, .16, .48]) {
      model.rotation.y = yaw;
      animateCameo(model, gait, gait > 0);
      model.updateMatrixWorld(true);
      const neckBounds = new THREE.Box3().setFromObject(neck);
      assert.ok(neckBounds.intersectsBox(new THREE.Box3().setFromObject(jacket)), kind + ' neck connects to the jacket');
      assert.ok(neckBounds.intersectsBox(new THREE.Box3().setFromObject(head)), kind + ' head connects to the neck');
    }
    disposeObject(model);
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

test('runner hazards fade per spawn, with crossing traffic visible before it reaches a lane', () => {
  const root = new THREE.Group();
  const renderer = createRunnerTraffic(root, 'Test', {
    roadworkKinds: ['barrier'], tramChance: 1,
  });
  const state = { distance: 0, speed: 9, elapsed: 1, traffic: [
    { kind: 'barrier', lane: 0, progress: 25, speed: 0, spawnTime: 1 },
    { kind: 'tram', lane: 1, color: 'tram', progress: 45, speed: 7.5, spawnTime: 1 },
    { kind: 'scooter', color: 'red', crossing: true, x: 14, vx: -18, progress: 10, speed: 0, spawnTime: 1 },
  ] };
  const slots = root.children.filter(node => node.name === 'Test traffic');
  const meshes = slot => {
    const children = [];
    slot.traverse(child => { if (child.isMesh) children.push(child); });
    return children;
  };
  renderer.update(state);
  for (const slot of slots.slice(0, 3)) {
    assert.ok(meshes(slot).every(mesh => mesh.material.alphaHash && mesh.material.opacity === 0 && !mesh.castShadow));
  }
  state.elapsed = 1.35;
  renderer.update(state);
  for (const slot of slots.slice(0, 2)) {
    assert.ok(meshes(slot).every(mesh => Math.abs(mesh.material.opacity - .5) < 1e-6));
  }
  assert.ok(meshes(slots[2]).every(mesh => mesh.material.opacity === 1 && mesh.castShadow));
  state.elapsed = 2;
  renderer.update(state);
  assert.ok(meshes(slots[0]).every(mesh => mesh.material.opacity === 1 && mesh.castShadow));
  state.traffic[0] = { ...state.traffic[0], spawnTime: 2 };
  renderer.update(state);
  assert.ok(meshes(slots[0]).every(mesh => mesh.material.opacity === 0 && !mesh.castShadow));
  assert.ok(meshes(slots[1]).every(mesh => mesh.material.opacity === 1));
  disposeObject(root);
});

test('pooled cameo animates without new resources, keeps hit flashes local and resets when a slot changes kind', () => {
  const root = new THREE.Group(), renderer = createRunnerTraffic(root, 'Test', baanaMap.runner);
  const state = { distance: 0, elapsed: .1, speed: 9, traffic: [
    { id: 1, kind: 'purra', color: 'red', lane: 0, progress: 10, speed: 5, hitUntil: 1, age: 0 },
    { id: 2, kind: 'bike', color: 'red', lane: 1, progress: 10, speed: 5 },
  ] };
  const resources = new Set();
  root.traverse(node => { if (node.geometry) resources.add(node.geometry); for (const material of [node.material].flat().filter(Boolean)) resources.add(material); });
  renderer.update(state);
  const slots = root.children.filter(node => node.name === 'Test traffic');
  const cameo = slots[0].children[0], leg = cameo.getObjectByName('Purra leg -1');
  const originalRotation = leg.rotation.x;
  const coat = cameo.getObjectByName('Purra body').children[0].material;
  assert.equal(coat.emissiveIntensity, .7);
  assert.equal(coat.opacity, 0);
  assert.equal(slots[1].children[0].children[0].children[0].material.emissiveIntensity, 0);
  const head = cameo.getObjectByName('3D head');
  state.elapsed = .3; state.traffic[0].age = .25;
  renderer.update(state, { x: 0, z: 15 });
  assert.ok(head.rotation.y > 0 && head.rotation.x < 0, 'The approaching face looks inwards and up towards the camera');
  state.traffic[0].lane = 2;
  renderer.update(state, { x: 0, z: 15 });
  assert.ok(head.rotation.y < 0, 'The other shoulder faces back towards the viewer');
  assert.equal(coat.opacity, .5);
  assert.equal(slots[1].children[0].children[0].children[0].material.opacity, 1);
  assert.notEqual(leg.rotation.x, originalRotation);
  assert.equal(slots[0].children[0], cameo);
  root.traverse(node => { if (node.geometry) assert.ok(resources.has(node.geometry)); for (const material of [node.material].flat().filter(Boolean)) assert.ok(resources.has(material)); });
  state.traffic[0].cleared = true; renderer.update(state); assert.equal(slots[0].visible, false);
  state.traffic[0] = { ...state.traffic[1], id: 3 }; renderer.update(state);
  assert.equal(slots[0].children[0].name, 'red bike');
  assert.equal(slots[0].children[0].position.y, 0);
  const survivingBike = slots[1].children[0];
  state.traffic.shift();
  renderer.update(state);
  assert.equal(slots[0].visible, false);
  assert.equal(slots[1].visible, true);
  assert.equal(slots[1].children[0], survivingBike);
  const disposals = new Map();
  for (const resource of resources) resource.addEventListener('dispose', () => disposals.set(resource, (disposals.get(resource) ?? 0) + 1));
  disposeObject(root);
  assert.equal(disposals.size, resources.size);
  assert.ok([...disposals.values()].every(count => count === 1));
});

test('all models fit their traffic silhouette, have no labels and connect hips to animated legs', () => {
  for (const kind of CAMEO_KINDS) {
    const model = createCameoModel(kind);
    model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(model);
    assert.ok(bounds.max.y < 3.55, kind + ' has no geometry above the head');
    assert.ok(bounds.max.x < .7 && bounds.min.x > -.7);
    const leg = model.children.find(node => node.userData.stride);
    const body = model.children[0];
    const bodyBounds = new THREE.Box3().setFromObject(body), legBounds = new THREE.Box3().setFromObject(leg);
    assert.ok(legBounds.max.y >= bodyBounds.min.y, 'Hips and thighs overlap rather than float apart');
    assert.ok(leg.children.some(node => node.userData.knee));
    assert.equal(model.userData.character, kind);
    disposeObject(model);
  }
});
