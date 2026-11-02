import * as THREE from 'three';
import { createGullFlight } from './gull-flight.js';
import { disposeObject } from './world/dispose.js';

// Two reusable birds and two reusable attacks, shared geometry/materials.
// No model download, spawning mesh churn, or wave membership.
export function createSeagulls(scene, world, callbacks = {}) {
  const root = new THREE.Group(); root.name = 'Ambient seagulls'; root.visible = false;
  scene.add(root);
  const white = new THREE.MeshStandardMaterial({ color: '#f7f5e9', roughness: .85 });
  const gold = new THREE.MeshStandardMaterial({ color: '#e7af42', roughness: .7 });
  const black = new THREE.MeshStandardMaterial({ color: '#222e33', roughness: .8 });
  const sphere = new THREE.SphereGeometry(1, 10, 7);
  const cone = new THREE.ConeGeometry(.085, .35, 6).rotateX(Math.PI / 2);
  const wing = new THREE.BufferGeometry();
  const points = [[.05, 0, .28], [.45, .06, .25], [.88, .02, -.07], [1.45, -.04, -.5], [.96, 0, -.43], [.4, 0, -.35], [.05, 0, -.28]];
  const vertices = [], colors = [];
  for (let i = 1; i < points.length - 1; i++) for (const index of [0, i, i + 1]) {
    vertices.push(...points[index]);
    const color = new THREE.Color(index === 3 ? '#293338' : index === 2 || index === 4 ? '#a9b3b5' : '#eff0e7');
    colors.push(color.r, color.g, color.b);
  }
  wing.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  wing.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); wing.computeVertexNormals();
  const wingMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .85, side: THREE.DoubleSide });
  const markerGeometry = new THREE.RingGeometry(.87, 1, 32).rotateX(-Math.PI / 2);
  const shadowMaterial = new THREE.MeshBasicMaterial({ color: '#28373a', transparent: true, opacity: .13, depthWrite: false });
  const shadowGeometry = new THREE.CircleGeometry(.5, 20).rotateX(-Math.PI / 2);

  function part(parent, geometry, material, position, scale) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position); mesh.scale.set(...scale); parent.add(mesh);
    return mesh;
  }
  const models = Array.from({ length: 2 }, () => {
    const bird = new THREE.Group(); root.add(bird);
    part(bird, sphere, white, [0, 0, 0], [.25, .23, .62]);
    part(bird, sphere, white, [0, .17, .48], [.2, .22, .23]);
    part(bird, cone, gold, [0, .14, .78], [1, 1, 1]);
    for (const side of [-1, 1]) part(bird, sphere, black, [side * .18, .22, .55], [.025, .03, .03]);
    const wings = [-1, 1].map(side => {
      const pivot = new THREE.Group(); pivot.scale.x = side;
      part(pivot, wing, wingMaterial, [0, 0, 0], [1, 1, 1]); bird.add(pivot);
      return pivot;
    });
    part(bird, sphere, white, [0, -.03, -.64], [.2, .07, .3]);
    const shadow = part(root, shadowGeometry, shadowMaterial, [0, .09, 0], [1, 1, 1]);
    const marker = part(root, markerGeometry, new THREE.MeshBasicMaterial({ color: '#ffe29b', transparent: true, opacity: .8, depthWrite: false, side: THREE.DoubleSide }), [0, .1, 0], [1, 1, 1]);
    const drop = part(root, sphere, white, [0, 0, 0], [.12, .24, .12]);
    return { bird, wings, shadow, marker, drop };
  });
  const flight = createGullFlight({ ...callbacks,
    canStandAt: (...args) => world.canStandAt(...args),
    lineClear3D: (...args) => world.lineClear3D(...args),
  });
  let time = 0;

  function render(dt = 0) {
    for (const state of flight.birds) {
      const model = models[state.id];
      model.bird.visible = state.phase !== 'waiting' && state.phase !== 'away';
      model.bird.position.set(state.x, state.hitHeight, state.z);
      const speed = Math.hypot(state.vx, state.vz);
      if (speed > .01) {
        const yaw = Math.atan2(state.vx, state.vz), turn = yaw - model.bird.rotation.y;
        model.bird.rotation.y += Math.atan2(Math.sin(turn), Math.cos(turn)) * (1 - Math.exp(-10 * dt));
      }
      model.bird.rotation.x = THREE.MathUtils.damp(model.bird.rotation.x, -Math.atan2(state.vy, speed || 1) * .6, 10, dt);
      const flap = state.phase === 'dive' ? -.6 : Math.sin(time * (!state.alive ? 15 : 8) + state.id * 2) * .3;
      for (const pivot of model.wings) pivot.rotation.z = flap * pivot.scale.x;
      model.shadow.visible = model.bird.visible && state.hitHeight < 10 && world.canStandAt(state.x, state.z, .1);
      model.shadow.position.set(state.x, .09, state.z);
      model.shadow.scale.set(2, 1, .8);
      model.marker.visible = !!state.target;
      if (state.target) {
        model.marker.position.set(state.target.x, .1, state.target.z);
        model.marker.scale.setScalar(.9 + Math.sin(time * 12) * .08);
        model.marker.material.color.set(state.phase.startsWith('drop') ? '#f8f4db' : '#ffc76b');
      }
      model.drop.visible = !!state.drop;
      if (state.drop) model.drop.position.set(state.drop.x, state.drop.y, state.drop.z);
    }
  }

  return {
    birds: flight.birds,
    reset(player, runner) { time = 0; flight.reset(player, runner); root.visible = true; render(); },
    clear() { root.visible = false; },
    update(dt, player, options) { time += dt; flight.update(dt, player, options); render(dt); },
    repel: flight.repel,
    dispose() { disposeObject(root); },
  };
}
