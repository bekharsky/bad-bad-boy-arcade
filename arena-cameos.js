import * as THREE from 'three';
import { CAMEO_KINDS, cameoGaitForDistance } from './runner/cameo-roster.js';
import { prepareFadingMaterials, setModelAppearance } from './runner/model-appearance.js';
import { createTrafficModel } from './runner/traffic-models.js';
import { animateCameo } from './runner/cameo-models.js';
import { disposeObject } from './world/dispose.js';

const ARRIVAL_INTERVAL = 5;
const MAX_GUESTS = 8;
const NOTICE_RANGE = 18;

// Civilian actors are deliberately separate from combat enemies and wave
// counts. The session owns this small pool across district changes/restarts.
export function createArenaCameos(scene, world, random = Math.random) {
  const group = new THREE.Group(); group.name = 'Arena civilians'; scene.add(group);
  const actors = [];
  const pool = CAMEO_KINDS.map((kind, index) => {
    const root = new THREE.Group(), model = createTrafficModel(kind, 'cameo');
    root.name = `Civilian: ${kind}`; root.add(model); root.visible = false; group.add(root);
    const materials = prepareFadingMaterials(model);
    return { kind, civilian: true, root, model, materials, size: .55, hitHeight: kind === 'stubb' ? 1.6 : 1.45,
      speed: 3.9 + index * .12, standoff: 2.9 + (index % 4) * .45, glance: .85 + (index % 5) * .19, alive: false };
  });
  let disposed = false, running = false, untilArrival = ARRIVAL_INTERVAL;

  function clear() {
    running = false;
    untilArrival = ARRIVAL_INTERVAL;
    actors.length = 0;
    for (const actor of pool) { actor.alive = false; actor.root.visible = false; }
  }

  function pose(actor, moving, running, lookAt) {
    const viewerYaw = lookAt
      ? Math.atan2(lookAt.x - actor.x, lookAt.z - actor.z) - actor.heading
      : 0;
    animateCameo(actor.model, actor.gait, moving, viewerYaw, moving && !running);
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
        age: -index * .6, heading, route, waypoint: 1, phase: 'arrival', phaseTime: 0, leaveAt: Infinity, escapeFrom: null });
      actor.root.position.set(actor.x, 0, actor.z); actor.root.rotation.y = actor.heading;
      setModelAppearance(actor.model, actor.materials, 0, 0);
      pose(actor, false, false, viewPosition);
      actors.push(actor);
    }
  }

  function moveWithRoom(actor, player, dx, dz) {
    const separation = Math.hypot(actor.x - player.x, actor.z - player.z);
    const nextSeparation = Math.hypot(actor.x + dx - player.x, actor.z + dz - player.z);
    if (nextSeparation >= separation || nextSeparation > actor.size + player.radius + .22) {
      world.move(actor, dx, dz, actor.size);
    }
  }

  function walkRoute(actor, player, dt) {
    const next = actor.route[actor.waypoint];
    const dx = next[0] - actor.x, dz = next[1] - actor.z, distance = Math.hypot(dx, dz);
    if (distance > .01) {
      const fraction = Math.min(1, 1.75 * dt / distance);
      moveWithRoom(actor, player, dx * fraction, dz * fraction);
    }
    return Math.hypot(next[0] - actor.x, next[1] - actor.z) < .05;
  }

  function changePhase(actor, phase) {
    actor.phase = phase;
    actor.phaseTime = 0;
    actor.decision = 0;
  }

  function retreat(actor, player, dt) {
    actor.decision -= dt;
    if (actor.decision <= 0) {
      const from = actor.panic > 0 ? actor.escapeFrom : player;
      actor.direction = world.flee(actor.x, actor.z, from.x, from.z, actor.heading);
      actor.decision = .24;
    }
    const step = actor.speed * dt;
    const dx = actor.direction.x * step, dz = actor.direction.z * step;
    if (actor.panic > 0) world.move(actor, dx, dz, actor.size);
    else moveWithRoom(actor, player, dx, dz);
  }

  function beginDeparture(actor) {
    // Rejoin the authored route where there is a straight walk back to it.
    let nearest = Infinity;
    for (let i = 0; i < actor.route.length; i++) {
      const [x, z] = actor.route[i];
      const distance = Math.hypot(actor.x - x, actor.z - z);
      if (distance >= nearest || !world.lineClear(actor.x, actor.z, x, z, actor.size)) continue;
      actor.waypoint = i;
      nearest = distance;
    }
    changePhase(actor, nearest < Infinity ? 'departure' : 'fade');
  }

  function act(actor, player, dt) {
    if (actor.panic > 0) { retreat(actor, player, dt); return; }
    actor.phaseTime += dt;
    if (actor.age >= actor.leaveAt && actor.phase !== 'departure' && actor.phase !== 'fade') beginDeparture(actor);
    const dx = player.x - actor.x, dz = player.z - actor.z, distance = Math.hypot(dx, dz);
    switch (actor.phase) {
      case 'arrival':
        if (walkRoute(actor, player, dt)) actor.waypoint++;
        if (actor.waypoint === actor.route.length) {
          actor.leaveAt = actor.age + 19 + 3 * actor.glance;
          changePhase(actor, 'lookout');
        } else if (actor.phaseTime > 28) beginDeparture(actor);
        break;
      case 'lookout':
        if (distance < player.radius + actor.size + .8) {
          changePhase(actor, 'retreat');
          break;
        }
        actor.decision -= dt;
        if (actor.decision > 0) break;
        actor.decision = .2;
        if (actor.phaseTime >= actor.glance && distance < NOTICE_RANGE && world.lineClear(actor.x, actor.z, player.x, player.z, actor.size)) {
          // Give the hero a clear lane while the rest watch from farther away.
          let nearbyGuests = 0;
          for (const guest of actors) {
            if (guest.phase === 'approach' || guest.phase === 'watch') nearbyGuests++;
          }
          if (nearbyGuests < 2) changePhase(actor, 'approach');
        } else if (actor.phaseTime > 5) beginDeparture(actor);
        break;
      case 'approach': {
        if (distance > NOTICE_RANGE || !world.lineClear(actor.x, actor.z, player.x, player.z, actor.size)) {
          changePhase(actor, 'lookout');
          break;
        }
        const gap = Math.max(actor.standoff, player.radius + actor.size + .6);
        if (distance <= gap + .05 || actor.phaseTime >= 3.8) changePhase(actor, 'watch');
        else {
          const fraction = Math.min(actor.speed * .72 * dt, distance - gap) / distance;
          moveWithRoom(actor, player, dx * fraction, dz * fraction);
        }
        break;
      }
      case 'watch':
        if (distance < 2.2 || actor.phaseTime >= actor.glance) changePhase(actor, 'retreat');
        break;
      case 'retreat':
        if (actor.phaseTime >= 1.35 || distance > 10) changePhase(actor, 'lookout');
        else retreat(actor, player, dt);
        break;
      case 'departure':
        if (walkRoute(actor, player, dt)) actor.waypoint--;
        if (actor.waypoint < 0 || actor.phaseTime > 24) changePhase(actor, 'fade');
        break;
    }
  }

  function update(dt, player, viewPosition) {
    if (dt <= 0 || disposed || !running) return;
    for (let i = actors.length - 1; i >= 0; i--) {
      const actor = actors[i];
      actor.age += dt;
      if (actor.age <= 0) continue;
      actor.root.visible = true;
      actor.panic = Math.max(0, actor.panic - dt); actor.flash = Math.max(0, actor.flash - dt);
      const oldX = actor.x, oldZ = actor.z;
      const phase = actor.phase;
      act(actor, player, dt);
      const fadeOut = actor.phase === 'fade' ? THREE.MathUtils.smoothstep(actor.phaseTime, 0, .8) : 0;
      if (fadeOut >= 1) {
        actor.alive = false; actor.root.visible = false;
        actors.splice(i, 1);
        continue;
      }
      actor.fleeing = actor.panic > 0;
      const scurrying = actor.fleeing || phase === 'approach' || phase === 'retreat';
      const watching = actor.phase === 'watch' || actor.phase === 'lookout';
      const lookAt = watching || actor.phase === 'retreat' ? player : viewPosition;
      const moved = Math.hypot(actor.x - oldX, actor.z - oldZ);
      if (moved > 1e-6) {
        const heading = Math.atan2(actor.x - oldX, actor.z - oldZ);
        actor.heading += Math.atan2(Math.sin(heading - actor.heading), Math.cos(heading - actor.heading)) * (1 - Math.exp(-12 * dt));
        actor.gait += cameoGaitForDistance(moved, scurrying);
      } else if (!actor.fleeing && watching) {
        const turn = Math.atan2(lookAt.x - actor.x, lookAt.z - actor.z) - actor.heading;
        actor.heading += Math.atan2(Math.sin(turn), Math.cos(turn)) * (1 - Math.exp(-6 * dt));
      }
      actor.root.position.set(actor.x, 0, actor.z); actor.root.rotation.y = actor.heading;
      pose(actor, moved > 1e-6, scurrying, actor.fleeing ? null : lookAt);
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
      actor.leaveAt = Math.min(actor.leaveAt, actor.age + 12);
      changePhase(actor, 'lookout');
      actor.panic = 1.5; actor.flash = .18;
      return true;
    },
    dispose() { if (disposed) return; clear(); disposeObject(group); disposed = true; },
  };
}
