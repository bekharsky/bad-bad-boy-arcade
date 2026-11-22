import * as THREE from 'three';
import { createSleighPartDisplay } from '../models/sleigh.js';

// The finish is fixed in course metres. Put the part over the line, between
// the lanes and above the hero, so either lane can reach the same reward.
export function createRunnerFinishReward(scene, parts) {
  const root = new THREE.Group();
  root.name = 'Sleigh part at the finish';
  root.visible = false;
  scene.add(root);
  const displays = parts.map(part => createSleighPartDisplay(part, 3.3));
  root.add(...displays);
  const brass = new THREE.MeshBasicMaterial({ color: '#ffd085', toneMapped: false });
  const inner = new THREE.Mesh(new THREE.TorusGeometry(2.03, .037, 8, 60), brass);
  const outer = new THREE.Mesh(new THREE.TorusGeometry(2.28, .031, 8, 64, Math.PI * 1.55), brass);
  for (const ring of [inner, outer]) {
    ring.position.set(0, 4.8, -.6);
    ring.rotation.z = Math.PI * .72;
    root.add(ring);
  }
  const base = new THREE.Mesh(new THREE.RingGeometry(2.16, 2.24, 64), brass);
  base.rotation.x = -Math.PI / 2;
  base.position.set(0, .09, -.35);
  root.add(base);
  let model = null, finish = 0;
  return {
    place(index, length) {
      finish = length;
      model = displays[index];
      for (const display of displays) display.visible = display === model;
      root.visible = false;
    },
    update(distance, time, reducedMotion) {
      if (!model) return;
      const remaining = finish - distance;
      root.visible = remaining <= 72;
      root.position.z = -remaining;
      model.position.set(0, reducedMotion ? 4.8 : 4.8 + Math.sin(time * 2.6) * .22, -.35);
      model.rotation.y = reducedMotion ? .78 : time * 1.14;
    },
    clear() { root.visible = false; model = null; },
  };
}
