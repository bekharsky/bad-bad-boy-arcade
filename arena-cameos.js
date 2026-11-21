import * as THREE from 'three';
import { CAMEO_KINDS, cameoGaitForDistance } from './runner/cameo-roster.js';
import { prepareFadingMaterials, setModelAppearance } from './runner/model-appearance.js';
import { createTrafficModel } from './runner/traffic-models.js';
import { animateCameo } from './runner/cameo-models.js';
import { disposeObject } from './world/dispose.js';

const ARRIVAL_INTERVAL = 5;
const MAX_GUESTS = 8;

// Civilian actors are deliberately separate from combat enemies and wave
// counts. The session owns this small pool across district changes/restarts.
export function createArenaCameos(scene, world, random = Math.random) {
  const group = new THREE.Group(); group.name = 'Arena civilians'; scene.add(group);
  const actors = [];
  const pool = CAMEO_KINDS.map((kind, index) => {
    const root = new THREE.Group(), model = createTrafficModel(kind, 'cameo');
    root.name = `Civilian: ${kind}`; root.add(model); root.visible = false; group.add(root);
    const materials = prepareFadingMaterials(model);
    return { kind, civilian: true, root, model, materials, size: .55, hitHeight: kind === 'stubb' ? 1.6 : 1.45, speed: 3.9 + index * .12, alive: false };
  });
  let disposed = false, running = false, untilArrival = ARRIVAL_INTERVAL;

  function clear() {
    running = false;
    untilArrival = ARRIVAL_INTERVAL;
    actors.length = 0;
    for (const actor of pool) { actor.alive = false; actor.root.visible = false; }
  }

  function pose(actor, moving, viewPosition) {
    const viewerYaw = viewPosition
      ? Math.atan2(viewPosition.x - actor.x, viewPosition.z - actor.z) - actor.heading
      : 0;
    animateCameo(actor.model, actor.gait, moving, actor.fleeing ? 0 : viewerYaw, moving && !actor.fleeing);
  }

  function welcomeGuests(limit, viewPosition, player) {
    if (disposed || world.mode === 'runner') return;
    const available = pool.filter(actor => !actor.alive);
    const routes = world.pedestrianRoutes.filter(([[x, z]]) =>
      (!player || Math.hypot(player.x - x, player.z - z) > player.radius + .8) &&
      actors.every(actor => Math.hypot(actor.x - x, actor.z - z) > 2 * actor.size));
    const count = Math.min(limit, available.length, routes.length);
    for (let index = 0; index < count; index++) {
      const [route] = routes.splice(Math.floor(random() * routes.length), 1);
      const [actor] = available.splice(Math.floor(random() * available.length), 1);
      const [[x, z], [nextX, nextZ]] = route;
      const heading = Math.atan2(nextX - x, nextZ - z);
      Object.assign(actor, { x, z, alive: true, fleeing: false, panic: 0, flash: 0, decision: 0, gait: index * .7, nextJetHit: 0,
        age: -index * .6, heading, route, waypoint: 1, returning: false, rest: 0, escapeFrom: null, direction: { x: 0, z: 0 } });
      actor.root.visible = true; actor.root.position.set(actor.x, 0, actor.z); actor.root.rotation.y = actor.heading;
      setModelAppearance(actor.model, actor.materials, 0, 0);
      pose(actor, false, viewPosition);
      actors.push(actor);
    }
  }

  function walk(actor, player, dt) {
    const next = actor.route[actor.waypoint];
    if (!next) return;
    const dx = next[0] - actor.x, dz = next[1] - actor.z;
    const distance = Math.hypot(dx, dz);
    const fraction = distance > 0 ? Math.min(1, 1.3 * dt / distance) : 0;
    // Give the player room to cross the route. Resume the walk once it clears.
    const separation = Math.hypot(actor.x - player.x, actor.z - player.z);
    const nextSeparation = Math.hypot(actor.x + dx * fraction - player.x, actor.z + dz * fraction - player.z);
    if (nextSeparation >= separation || nextSeparation > actor.size + player.radius + .22) {
      world.move(actor, dx * fraction, dz * fraction, actor.size);
    }
    if (Math.hypot(next[0] - actor.x, next[1] - actor.z) < .05) actor.waypoint += actor.returning ? -1 : 1;
  }

  function update(dt, player, viewPosition) {
    if (dt <= 0 || disposed || !running) return;
    for (let i = actors.length - 1; i >= 0; i--) {
      const actor = actors[i];
      actor.age += dt;
      if (actor.age <= 0) continue;
      actor.panic = Math.max(0, actor.panic - dt); actor.flash = Math.max(0, actor.flash - dt);
      actor.fleeing = actor.panic > 0;
      actor.decision -= dt;
      if (actor.fleeing && actor.decision <= 0) {
        actor.direction = world.flee(actor.x, actor.z, actor.escapeFrom.x, actor.escapeFrom.z, actor.heading);
        actor.decision = .18;
      }
      const oldX = actor.x, oldZ = actor.z;
      if (actor.fleeing) {
        const speed = actor.speed * 1.15;
        world.move(actor, actor.direction.x * speed * dt, actor.direction.z * speed * dt, actor.size);
      } else {
        walk(actor, player, dt);
        if (actor.waypoint >= actor.route.length) {
          actor.rest += dt;
          if (actor.rest >= 5 && !actor.escapeFrom) {
            actor.returning = true;
            actor.waypoint = actor.route.length - 2;
          }
        }
      }
      // Walk back behind the scenery. A splash can take someone off their
      // route, so let them fade where they stopped instead of cutting through walls.
      const fadeOut = actor.escapeFrom ? THREE.MathUtils.smoothstep(actor.rest, 5, 6) : 0;
      if (actor.waypoint < 0 || fadeOut >= 1) {
        actor.alive = false; actor.root.visible = false;
        actors.splice(i, 1);
        continue;
      }
      const moved = Math.hypot(actor.x - oldX, actor.z - oldZ);
      if (moved > 1e-6) {
        const heading = Math.atan2(actor.x - oldX, actor.z - oldZ);
        actor.heading += Math.atan2(Math.sin(heading - actor.heading), Math.cos(heading - actor.heading)) * (1 - Math.exp(-12 * dt));
        actor.gait += cameoGaitForDistance(moved, actor.fleeing);
      } else if (!actor.fleeing && viewPosition && actor.waypoint >= actor.route.length) {
        const turn = Math.atan2(viewPosition.x - actor.x, viewPosition.z - actor.z) - actor.heading;
        actor.heading += Math.atan2(Math.sin(turn), Math.cos(turn)) * (1 - Math.exp(-3 * dt));
      }
      actor.root.position.set(actor.x, 0, actor.z); actor.root.rotation.y = actor.heading;
      pose(actor, moved > 1e-6, viewPosition);
      setModelAppearance(actor.model, actor.materials, THREE.MathUtils.smoothstep(actor.age, 0, 1.2) * (1 - fadeOut), actor.flash > 0 ? .45 : 0);
    }
    untilArrival -= dt;
    if (untilArrival <= 0) {
      if (actors.length < MAX_GUESTS) welcomeGuests(1, viewPosition, player);
      untilArrival = ARRIVAL_INTERVAL;
    }
  }

  return {
    actors, clear, update,
    reset(viewPosition) { clear(); running = !disposed && world.mode !== 'runner'; welcomeGuests(4, viewPosition); },
    nextWave(viewPosition) { welcomeGuests(Math.min(2, 6 - actors.length), viewPosition); },
    splash(actor, direction) {
      if (!actor.alive || !actors.includes(actor)) return false;
      const heading = direction && Math.hypot(direction.x, direction.z) > .01
        ? Math.atan2(direction.x, direction.z) : actor.heading;
      actor.escapeFrom = { x: actor.x - 4 * Math.sin(heading), z: actor.z - 4 * Math.cos(heading) };
      actor.waypoint = actor.route.length;
      actor.rest = 0;
      actor.panic = 1.5; actor.flash = .18; actor.decision = 0;
      return true;
    },
    dispose() { if (disposed) return; clear(); disposeObject(group); disposed = true; },
  };
}
