import * as THREE from 'three';
import { CAMEO_KINDS, cameoGaitForDistance } from './runner/cameo-roster.js';
import { cameoMaterials, showCameo } from './runner/cameo-appearance.js';
import { createTrafficModel } from './runner/traffic-models.js';
import { animateCameo } from './runner/cameo-models.js';
import { disposeObject } from './world/dispose.js';

// Civilian actors are deliberately separate from combat enemies and wave
// counts. The session owns this small pool across district changes/restarts.
export function createArenaCameos(scene, world, random = Math.random) {
  const group = new THREE.Group(); group.name = 'Arena civilians'; scene.add(group);
  const actors = [];
  const pool = CAMEO_KINDS.map((kind, index) => {
    const root = new THREE.Group(), model = createTrafficModel(kind, 'cameo');
    root.name = `Civilian: ${kind}`; root.add(model); root.visible = false; group.add(root);
    const materials = cameoMaterials(model);
    return { kind, civilian: true, root, model, materials, size: .55, hitHeight: kind === 'stubb' ? 1.6 : 1.45, speed: 3.9 + index * .12, alive: false };
  });
  let disposed = false;

  function clear() {
    actors.length = 0;
    for (const actor of pool) { actor.alive = false; actor.root.visible = false; }
  }

  function pose(actor, moving, viewPosition) {
    const viewerYaw = viewPosition
      ? Math.atan2(viewPosition.x - actor.x, viewPosition.z - actor.z) - actor.heading
      : 0;
    animateCameo(actor.model, actor.gait, moving, viewerYaw, moving && !actor.fleeing);
  }

  function reset(player, viewPosition) {
    clear();
    if (disposed || world.mode === 'runner') return;
    world.routeTo(player.x, player.z);
    const available = [...pool];
    const count = Math.min(4, available.length);
    for (let index = 0; index < count; index++) {
      let point = null;
      for (let attempt = 0; attempt < 8; attempt++) {
        const candidate = world.spawnPoint(player, index + attempt * .3, count);
        if (candidate && actors.every(other => Math.hypot(candidate.x - other.x, candidate.z - other.z) > 1.5)) { point = candidate; break; }
      }
      if (!point) continue;
      const [actor] = available.splice(Math.floor(random() * available.length), 1);
      const heading = Math.atan2(point.x - player.x, point.z - player.z) + (random() < .5 ? -1 : 1) * Math.PI / 2;
      Object.assign(actor, point, { alive: true, fleeing: false, panic: 0, flash: 0, decision: 0, gait: index * .7, nextJetHit: 0, age: -index * .18,
        heading, strollHeading: heading, direction: { x: 0, z: 0 } });
      actor.root.visible = true; actor.root.position.set(actor.x, 0, actor.z); actor.root.rotation.y = actor.heading;
      showCameo(actor.model, actor.materials, actor.age, 0);
      pose(actor, false, viewPosition);
      actors.push(actor);
    }
  }

  function update(dt, player, viewPosition) {
    if (dt <= 0 || disposed || !actors.length) return;
    world.routeTo(player.x, player.z);
    for (const actor of actors) {
      actor.age += dt;
      actor.panic = Math.max(0, actor.panic - dt); actor.flash = Math.max(0, actor.flash - dt);
      const distance = Math.hypot(actor.x - player.x, actor.z - player.z);
      actor.fleeing = actor.panic > 0 || distance < (actor.fleeing ? 5 : 3.5);
      actor.decision -= dt;
      if (actor.fleeing && actor.decision <= 0) {
        actor.direction = world.flee(actor.x, actor.z, player.x, player.z, actor.heading);
        actor.decision = .18;
      }
      const oldX = actor.x, oldZ = actor.z;
      if (actor.fleeing) {
        const speed = actor.speed * (actor.panic > 0 ? 1.15 : 1);
        world.move(actor, actor.direction.x * speed * dt, actor.direction.z * speed * dt, actor.size);
      } else {
        const dx = Math.sin(actor.strollHeading) * 1.3 * dt;
        const dz = Math.cos(actor.strollHeading) * 1.3 * dt;
        world.move(actor, dx, dz, actor.size);
        if (Math.hypot(actor.x - player.x, actor.z - player.z) < distance) {
          actor.x = oldX; actor.z = oldZ;
        }
      }
      const moved = Math.hypot(actor.x - oldX, actor.z - oldZ);
      if (moved > 1e-6) {
        const heading = Math.atan2(actor.x - oldX, actor.z - oldZ);
        actor.heading += Math.atan2(Math.sin(heading - actor.heading), Math.cos(heading - actor.heading)) * (1 - Math.exp(-12 * dt));
        actor.gait += cameoGaitForDistance(moved, actor.fleeing);
      }
      actor.root.position.set(actor.x, 0, actor.z); actor.root.rotation.y = actor.heading;
      pose(actor, moved > 1e-6, viewPosition);
      showCameo(actor.model, actor.materials, actor.age, actor.flash > 0 ? .45 : 0);
    }
  }

  return {
    actors, reset, clear, update,
    splash(actor) {
      if (!actor.alive || !actors.includes(actor)) return false;
      actor.panic = 1.5; actor.flash = .18; actor.decision = 0;
      return true;
    },
    dispose() { if (disposed) return; clear(); disposeObject(group); disposed = true; },
  };
}
