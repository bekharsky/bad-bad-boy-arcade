import * as THREE from 'three';
import { createSleighPartDisplay } from './models/sleigh.js';

const CACHE_RADIUS = 1.55;

export function sleighGuardPosts(world, point) {
  const posts = [];
  for (const radius of [2.45, 4.3, 6, 8]) {
    const candidates = [];
    for (let i = 0; i < 16; i++) {
      const angle = (i + radius) * Math.PI / 8;
      const x = point.x + Math.cos(angle) * radius, z = point.z + Math.sin(angle) * radius;
      if (world.lineClear(point.x, point.z, x, z, .6) && world.pickupPoint({ x, z }, .65)) {
        candidates.push({ x, z });
      }
    }
    // Spread the posts along the walkable sides, including narrow courtyards.
    for (let i = 0; i < 4 && candidates.length; i++) {
      let best = 0, spread = 0;
      for (let j = 0; j < candidates.length; j++) {
        const { x, z } = candidates[j];
        const gap = Math.min(...posts.map(post => (post.x - x) ** 2 + (post.z - z) ** 2));
        if (gap > spread) { best = j; spread = gap; }
      }
      if (spread < 1.55 ** 2) break;
      posts.push(candidates.splice(best, 1)[0]);
    }
  }
  return posts;
}

export function randomSleighCachePoint(world, player, radius = .85) {
  const [anchor] = world.pickupPoints('sleigh', radius);
  if (!anchor) return null;
  const candidates = [];
  for (let attempt = 0; attempt < 48; attempt++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 3.5 + Math.random() * 7.5;
    const point = world.pickupPoint({
      x: anchor.x + Math.cos(angle) * distance,
      z: anchor.z + Math.sin(angle) * distance,
    }, radius);
    if (!point || Math.hypot(point.x - player.x, point.z - player.z) < 8) continue;
    if (sleighGuardPosts(world, point).length < 10) continue;
    candidates.push(point);
  }
  return candidates.length ? candidates[Math.floor(Math.random() * candidates.length)] : anchor;
}

export function createSleighCache(scene, world, parts) {
  const root = new THREE.Group();
  root.name = 'Hidden sleigh part';
  scene.add(root);
  const models = parts.map(part => createSleighPartDisplay(part, 1.8));
  root.add(...models);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(.77, .82, 48),
    new THREE.MeshBasicMaterial({ color: '#ffe8a6', transparent: true, opacity: .8, depthWrite: false }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = .055;
  root.add(ring);
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(.66, .72, .18, 8),
    new THREE.MeshStandardMaterial({ color: '#50332c', roughness: .85 }),
  );
  base.position.y = .095;
  root.add(base);
  let model = null;

  function clear() {
    root.visible = false;
    model = null;
  }
  clear();

  return {
    clear,
    place(point, index) {
      models.forEach((piece, position) => { piece.visible = position === index; });
      model = models[index];
      root.position.set(point.x, 0, point.z);
      root.visible = true;
    },
    update(time, player, reducedMotion) {
      if (!model) return false;
      model.position.y = reducedMotion ? 1.12 : 1.12 + Math.sin(time * 2.4) * .14;
      model.rotation.y = reducedMotion ? .55 : time * .9;
      ring.material.opacity = reducedMotion ? .8 : .7 + Math.sin(time * 3) * .23;
      const { x, z } = root.position;
      if (Math.hypot(player.x - x, player.z - z) > CACHE_RADIUS || !world.lineClear(player.x, player.z, x, z, .12)) return false;
      clear();
      return true;
    },
  };
}
