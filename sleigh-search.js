import * as THREE from 'three';
import { createSleighPartDisplay } from './models/sleigh.js';

const CACHE_RADIUS = 1.55;
const CACHE_VIEW_HEIGHT = 1.8;

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

export function randomSleighCachePoint(world, player, radius = .85, camera = null) {
  const [anchor] = world.pickupPoints('sleigh', radius);
  if (!anchor) return null;
  const candidates = [];
  let frustum = null;
  const cacheBounds = new THREE.Sphere(new THREE.Vector3(), 1.9);
  if (camera) {
    camera.updateMatrixWorld(true);
    frustum = new THREE.Frustum().setFromProjectionMatrix(
      new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse),
    );
  }
  const inStartingView = point => {
    if (!frustum) return false;
    cacheBounds.center.set(point.x, CACHE_VIEW_HEIGHT, point.z);
    return frustum.intersectsSphere(cacheBounds);
  };
  const addCandidate = point => {
    if (!point || Math.hypot(point.x - player.x, point.z - player.z) < 8 || inStartingView(point)) return;
    if (sleighGuardPosts(world, point).length < 10) return;
    if (candidates.every(other => Math.hypot(other.x - point.x, other.z - point.z) > 2.4)) candidates.push(point);
  };

  for (let attempt = 0; attempt < 48; attempt++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 3.5 + Math.random() * 7.5;
    const point = world.pickupPoint({
      x: anchor.x + Math.cos(angle) * distance,
      z: anchor.z + Math.sin(angle) * distance,
    }, radius);
    addCandidate(point);
  }

  // Authored sleigh anchors keep the search in a sensible district, while this
  // wider fallback lets a camera-facing anchor move to another reachable spot.
  const bounds = world.bounds;
  if (camera && bounds) for (let attempt = 0; attempt < 320; attempt++) {
    const point = world.pickupPoint({
      x: bounds.minX + 1.1 + Math.random() * (bounds.maxX - bounds.minX - 2.2),
      z: bounds.minZ + 1.1 + Math.random() * (bounds.maxZ - bounds.minZ - 2.2),
    }, radius);
    if (!point || Math.hypot(point.x - player.x, point.z - player.z) < 16) continue;
    addCandidate(point);
  }

  if (candidates.length) return candidates[Math.floor(Math.random() * candidates.length)];
  return camera ? null : anchor;
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
