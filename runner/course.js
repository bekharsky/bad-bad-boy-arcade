import { TRAM_CAR_OFFSET } from './tram-route.js';
import { createEncounters } from './encounters.js';
import { CAMEO_KINDS, CAMEO_HEALTH, cameoGaitForDistance, isCameo, STUMBLE_DURATION } from './cameo-roster.js';

export const BAANA_LENGTH = 700;
export const RIDER_BONUS = 50;
export const RIDER_DODGE_BONUS = 150;
export const OBSTACLE_PASS_BONUS = 25;
export const RUNNER_BRAKE = .45;
export const RUNNER_BOOST = 1.5;
export const RIDER_HEALTH = .4;
export const SCOOTER_HEALTH = 1.8;
export const RIDER_KINDS = Object.freeze(['bike', 'scooter', ...CAMEO_KINDS]);
const canSpray = kind => kind === 'goose' || RIDER_KINDS.includes(kind);
export const riderHealth = kind => kind === 'goose' ? 1.5 : kind === 'scooter' ? SCOOTER_HEALTH : isCameo(kind) ? CAMEO_HEALTH : RIDER_HEALTH;
export const RUN_LANES = Object.freeze([-3, 0, 3]);
export const TRAM_LANES = Object.freeze([-2.2, 2.2]);
export const TRAFFIC_COLORS = Object.freeze(['green', 'blue', 'red']);
export const TRAFFIC_CAPACITY = 24;
export const RUNNER_IMPACT_PAUSE = .2;
const CONTACT_MARGIN = .025;
const PASSERBY_LANE_OFFSET = 1.35;
const CAMEO_JOG_SPEED = 2.8;
const FIRST_BUSY_CAMEO_DISTANCE = 22;
const RUNNER_COLLISION_DAMAGE = 1;

export const ROADWORK_TYPES = Object.freeze(['cone', 'tractor', 'barrier', 'trench']);
const PROFILES = {
  bike: { halfLength: 1.2, width: 1.05, depth: 1.65, size: .7, hitHeight: 1.2 },
  scooter: { halfLength: .95, width: 1.05, depth: 1.65, size: .7, hitHeight: 1.2 },
  goose: { halfLength: .9, width: .85, depth: 1.35, size: .58, hitHeight: .78 },
  ...Object.fromEntries(CAMEO_KINDS.map(kind => [kind, { halfLength: .6, width: .9, depth: 1.65, size: .7, hitHeight: 1.45 }])),
  stubb: { halfLength: .6, width: .9, depth: 1.65, size: .7, hitHeight: 1.6 },
  cone: { halfLength: .6, width: 1.05, depth: 1.65, size: .55, hitHeight: .55 },
  tractor: { halfLength: 1.9, width: 1.65, depth: 2.4, size: 1.1, hitHeight: 1.2 },
  barrier: { halfLength: .6, width: 1.65, depth: 1.4, size: 1.1, hitHeight: .7 },
  trench: { halfLength: 2.8, width: 1.65, depth: 3.4, size: 1.2, hitHeight: .3 },
  tram: { halfLength: 7.6, width: 1.75, depth: 8.15, size: 1.3, hitHeight: 1.7 },
};
export const trafficProfile = kind => PROFILES[kind] ?? PROFILES.bike;

// Progress runs forward along the course; oncoming traffic decreases progress.
// Reject not just overlaps at spawn, but any route that would catch a parked
// obstacle (or a slower rider) later in the visible section.
export function trafficRoutesConflict(a, b) {
  if (a.crossing || b.crossing || a.lane !== b.lane || a.cleared || b.cleared || isCameo(a.kind) || isCameo(b.kind)) return false;
  const clearance = trafficProfile(a.kind).halfLength + trafficProfile(b.kind).halfLength + 1.5;
  const gap = a.progress - b.progress;
  if (a.speed === b.speed) return Math.abs(gap) < clearance;
  return a.speed > b.speed ? gap > -clearance : gap < clearance;
}

// Swept collision in the runner's moving frame: quick lane changes and a long
// frame cannot jump through a cyclist between two rendered positions.
export function trafficContact(x0, gap0, x1, gap1, laneX, width = 1.05, depth = 1.65) {
  return contactFraction(x0 - laneX, gap0, x1 - laneX, gap1, width, depth) !== null;
}

function contactFraction(x0, gap0, x1, gap1, width, depth) {
  // Most traffic is far from the hero. Reject it without allocating a slab array.
  if ((x0 < -width && x1 < -width) || (x0 > width && x1 > width)
    || (gap0 < -depth && gap1 < -depth) || (gap0 > depth && gap1 > depth)) return null;
  const dx = x1 - x0, dz = gap1 - gap0;
  const xNear = dx ? (-(Math.sign(dx) * width) - x0) / dx : -Infinity;
  const xFar = dx ? (Math.sign(dx) * width - x0) / dx : Infinity;
  const zNear = dz ? (-(Math.sign(dz) * depth) - gap0) / dz : -Infinity;
  const zFar = dz ? (Math.sign(dz) * depth - gap0) / dz : Infinity;
  const enter = Math.max(0, xNear, zNear);
  return enter <= Math.min(1, xFar, zFar) ? enter : null;
}

export function createRunnerRun({ length = BAANA_LENGTH, random = Math.random, riderKinds = ['bike', 'scooter'], lanes = RUN_LANES, tramChance = 0, tramStartDelay = 0, tramRoute = null, roadworkKinds = ROADWORK_TYPES, crossingPoints = [], startSpeed = 9, speedLimit = 17, acceleration = .08, variety = false, cameoShoulder, busy = false } = {}) {
  if (!Number.isFinite(length) || length <= 0) throw new Error('Runner length must be positive');
  if (!Array.isArray(riderKinds) || !riderKinds.length || riderKinds.some(kind => !canSpray(kind))) throw new Error('Runner requires supported rider kinds');
  if (!Array.isArray(lanes) || lanes.length < 2 || lanes.some((x, i) => !Number.isFinite(x) || (i && x <= lanes[i - 1]))) throw new Error('Runner lanes must be ordered positions');
  const roadEdge = Math.max(Math.abs(lanes[0]), Math.abs(lanes.at(-1)));
  cameoShoulder ??= roadEdge + 1.5;
  if (!Number.isFinite(cameoShoulder) || cameoShoulder <= roadEdge + PASSERBY_LANE_OFFSET) throw new Error('Runner cameo shoulder must be outside the lanes');
  if (!Number.isFinite(tramChance) || tramChance < 0 || tramChance > 1) throw new Error('Invalid tram chance');
  if (!Number.isFinite(tramStartDelay) || tramStartDelay < 0) throw new Error('Invalid tram start delay');
  if (tramRoute !== null && typeof tramRoute !== 'function') throw new Error('Invalid tram route');
  if (!Array.isArray(roadworkKinds) || roadworkKinds.some(kind => !ROADWORK_TYPES.includes(kind))) throw new Error('Invalid roadwork kinds');
  if (![startSpeed, speedLimit, acceleration].every(Number.isFinite) || startSpeed <= 0 || speedLimit < startSpeed || acceleration < 0) throw new Error('Invalid runner speed');
  if (!Array.isArray(crossingPoints) || crossingPoints.some((p, i) => !Number.isFinite(p) || p <= 50 || p >= length - 30 || (i && p <= crossingPoints[i - 1]))) throw new Error('Invalid crossing points');
  lanes = [...lanes];
  const regularRiders = riderKinds.filter(kind => kind !== 'goose' && !isCameo(kind));
  const cameoRiders = [...new Set(riderKinds.filter(isCameo))], hasGeese = riderKinds.includes('goose');
  const availableCameos = [...cameoRiders];
  const startLane = Math.floor((lanes.length - 1) / 2);
  const encounters = createEncounters({ random, variety, tramChance, roadworks: roadworkKinds.length > 0 });
  const crossings = crossingPoints.map((progress, i) => ({ progress, side: i % 2 ? 1 : -1, phase: 'approach', launched: 0, launchAt: Infinity, nextLaunchAt: Infinity }));
  const maxSpeed = speedLimit * RUNNER_BOOST;
  const firstCameoDistance = busy ? FIRST_BUSY_CAMEO_DISTANCE : 0;
  const state = { distance: 0, elapsed: 0, speed: startSpeed, cruiseSpeed: startSpeed, throttle: 0, x: lanes[startLane], lane: startLane, invulnerable: 0, hitStop: 0, passed: 0, cleared: 0, bonus: 0, finished: false, traffic: [], crossings };
  let nextSpawn = 0, nextId = 0, safeLane = startLane, nextCameo = firstCameoDistance, lastCameoSide = 0;
  let nextGeese = 0; // Start with a goose row, subject to the usual traffic spacing.
  const oldPose = {}, pose = {};
  function arrivalTime(distance) {
    if (distance <= 0) return 0;
    const target = state.cruiseSpeed * (1 + state.throttle * (state.throttle < 0 ? 1 - RUNNER_BRAKE : RUNNER_BOOST - 1));
    const ramp = Math.abs(target - state.speed) / 12, rampDistance = (target + state.speed) * .5 * ramp;
    if (distance >= rampDistance) return ramp + (distance - rampDistance) / target;
    const acceleration = Math.sign(target - state.speed) * 12;
    return 2 * distance / (state.speed + Math.sqrt(Math.max(0, state.speed ** 2 + 2 * acceleration * distance)));
  }
  function tramContact(agent, oldProgress, oldX, oldDistance) {
    let first = null;
    for (const offset of [-TRAM_CAR_OFFSET, TRAM_CAR_OFFSET]) {
      tramRoute(oldProgress + offset, lanes[agent.lane], oldPose);
      tramRoute(agent.progress + offset, lanes[agent.lane], pose);
      const dx0 = oldX - oldPose.x, dz0 = -oldDistance - oldPose.z;
      const dx1 = state.x - pose.x, dz1 = -state.distance - pose.z;
      const c0 = Math.cos(oldPose.heading), s0 = Math.sin(oldPose.heading), c1 = Math.cos(pose.heading), s1 = Math.sin(pose.heading);
      const fraction = contactFraction(dx0 * c0 - dz0 * s0, dx0 * s0 + dz0 * c0, dx1 * c1 - dz1 * s1, dx1 * s1 + dz1 * c1, PROFILES.tram.width, PROFILES.tram.depth - TRAM_CAR_OFFSET);
      if (fraction !== null && (first === null || fraction < first)) first = fraction;
    }
    return first;
  }
  const choose = count => Math.min(count - 1, Math.max(0, Math.floor(random() * count)));
  function reserveCameoWindow() {
    if (!cameoRiders.length) return false;
    const active = state.traffic.find(agent => isCameo(agent.kind));
    if (active) return !busy && !active.passed && ((active.age < 1.25 && active.panicSide === undefined) || Number.isFinite(active.tripAt) || Math.abs(active.x) < cameoShoulder - .05);
    if (state.distance < nextCameo) return false;
    if (!busy && crossings.some(entry => entry.phase === 'warning' || entry.phase === 'crossing')) return true;
    const approachSpeed = Math.max(state.speed, state.cruiseSpeed * .75);
    const crossing = crossings.find(entry => entry.phase !== 'clear');
    // Allow a switch from braking to full boost during the reveal. Leave
    // the crossing warning its own time on screen after the jogger passes.
    const boostSpeed = Math.min(speedLimit, state.cruiseSpeed + 5 * acceleration) * RUNNER_BOOST;
    const distanceBeforeWarning = crossing ? crossing.progress - state.distance - boostSpeed * 2.5 - 2 : Infinity;
    const room = busy ? Infinity : distanceBeforeWarning * (1 + CAMEO_JOG_SPEED / boostSpeed);
    const closingSpeed = approachSpeed + CAMEO_JOG_SPEED;
    const minimumLead = (boostSpeed + CAMEO_JOG_SPEED) * 2.2;
    const lead = Math.min(room, length - state.distance - 1, Math.max(minimumLead, closingSpeed * 3.4));
    if (lead < minimumLead) return false;
    let progress = state.distance + lead;
    // A jogger placed on a crossing line cannot yield before the first scooter.
    for (const crossing of crossings) for (const pass of crossing.passes) {
      if (Math.abs(pass.progress - progress) < 3) progress = pass.progress + 3;
    }
    if (progress >= length) return false;
    // On the campaign routes, the shoulder joggers can share the street with traffic.
    if (!busy && state.traffic.some(agent => !agent.cleared && !agent.passed)) return true;
    if (state.traffic.length >= TRAFFIC_CAPACITY) return !busy;
    if (!availableCameos.length) availableCameos.push(...cameoRiders);
    const [kind] = availableCameos.splice(choose(availableCameos.length), 1);
    const profile = trafficProfile(kind);
    // Join the road from the sidewalk, staying outside the outer traffic lane.
    lastCameoSide = lastCameoSide ? -lastCameoSide : choose(2) ? 1 : -1;
    const x = lastCameoSide * cameoShoulder;
    const jogX = lastCameoSide > 0 ? lanes.at(-1) + PASSERBY_LANE_OFFSET : lanes[0] - PASSERBY_LANE_OFFSET;
    const varietyRoll = random();
    const canTrip = varietyRoll < .24 && distanceBeforeWarning > lead * 3 + boostSpeed * 3;
    state.traffic.push({
      id: nextId++, kind, progress, speed: CAMEO_JOG_SPEED, x, jogX, heading: 0,
      z: state.distance - progress, size: profile.size, hitHeight: profile.hitHeight,
      hp: riderHealth(kind), alive: true, passed: false, hitUntil: 0, age: 0, gait: 0,
      tripAt: canTrip ? .85 + varietyRoll : Infinity,
      paceTime: canTrip ? 0 : .8,
    });
    // On streets with cross traffic, leave a longer stretch for ordinary traffic.
    nextCameo = state.distance + (busy ? (crossings.length ? 46 : 40) : (crossings.length ? 56 : 40)) + 10 * varietyRoll;
    return !busy;
  }
  function resetCrossings() {
    const sides = [];
    for (const [index, crossing] of crossings.entries()) {
      const side = encounters.side(index, sides); sides.push(side);
      Object.assign(crossing, { side, phase: 'approach', launched: 0, launchAt: Infinity, nextLaunchAt: Infinity, passes: encounters.crossing(crossing.progress, side, lanes) });
    }
  }
  resetCrossings();
  function reset() {
    Object.assign(state, { distance: 0, elapsed: 0, speed: startSpeed, cruiseSpeed: startSpeed, throttle: 0, x: lanes[startLane], lane: startLane, invulnerable: 0, hitStop: 0, passed: 0, cleared: 0, bonus: 0, finished: false });
    encounters.reset(); resetCrossings();
    state.traffic.length = 0; nextSpawn = 0; nextId = 0; safeLane = startLane; nextCameo = firstCameoDistance; lastCameoSide = 0; nextGeese = 0;
    availableCameos.splice(0, availableCameos.length, ...cameoRiders);
  }
  function row() {
    const encounter = encounters.row();
    const choices = [safeLane - 1, safeLane, safeLane + 1].filter(lane => lane >= 0 && lane < lanes.length);
    const goose = hasGeese && state.distance >= nextGeese;
    const tram = !goose && tramChance > 0 && state.distance >= tramStartDelay && random() < encounter.tramChance;
    const roadworks = !goose && !tram && roadworkKinds.length > 0 && (variety ? random() < encounter.roadworkChance + (busy ? .1 : 0) : choose(4) === 0);
    const speed = tram ? 7.5 : roadworks ? 0 : goose ? 3.35 : encounter.riderSpeed;
    // Reserve arrival times, not world-space spacing: parked roadworks and
    // oncoming riders must not converge into an unavoidable three-lane wall.
    let arrival = encounter.lead;
    const minSpeed = Math.min(speedLimit, startSpeed + state.elapsed * acceleration) * RUNNER_BRAKE;
    const spacingSpeed = Math.min(speedLimit, startSpeed + (state.elapsed + 5) * acceleration) * RUNNER_BOOST;
    const groupDepth = tram ? PROFILES.tram.depth : roadworks ? Math.max(...roadworkKinds.map(kind => trafficProfile(kind).depth)) : goose ? PROFILES.goose.depth : PROFILES.bike.depth;
    for (const agent of state.traffic) if (!agent.cleared && !agent.crossing && !isCameo(agent.kind)) {
      const gap = agent.progress - state.distance, depth = trafficProfile(agent.kind).depth;
      const relativeSpeed = speed - agent.speed;
      // Keep the next front behind the previous rear for every achievable
      // speed, including braking beside a rider then boosting at roadworks.
      const clearTime = Math.max(0, (gap + depth) / ((relativeSpeed > 0 ? minSpeed : maxSpeed) + agent.speed));
      const requiredGap = gap + depth + groupDepth + relativeSpeed * clearTime + .7 * (spacingSpeed + speed);
      arrival = Math.max(arrival, requiredGap / (state.speed + speed));
    }
    if (arrival > 5 || state.traffic.length + 2 > TRAFFIC_CAPACITY) return;
    const guest = state.traffic.find(agent => isCameo(agent.kind) && !agent.passed);
    const guestTargetX = guest?.panicSide === undefined
      ? guest?.jogX ?? guest?.x
      : guest.panicSide * cameoShoulder;
    const candidates = [];
    for (let lane = 0; lane < lanes.length; lane++) {
      if (!tram && !roadworks && !goose && !regularRiders.length) continue;
      const kind = tram ? 'tram' : roadworks ? roadworkKinds[choose(roadworkKinds.length)] : goose ? 'goose' : regularRiders[choose(regularRiders.length)];
      const profile = trafficProfile(kind), progress = state.distance + arrival * (state.speed + speed) + (tramChance > 0 ? profile.depth : 0);
      if (kind !== 'tram' && progress > length) continue;
      if (guest && Math.min(Math.abs(guest.x - lanes[lane]), Math.abs(guestTargetX - lanes[lane])) < profile.width + .55) {
        const gap = progress - guest.progress;
        const arrivalGap = gap - speed * Math.max(1, STUMBLE_DURATION - (guest.stumbleTime ?? STUMBLE_DURATION));
        const clearance = profile.halfLength + 3.5;
        if (Math.min(gap, arrivalGap) < clearance && Math.max(gap, arrivalGap) > -clearance) continue;
      }
      // Keep a clear window around cross traffic. A tram must not close the
      // only escape lane while a scooter shoots out of a side street.
      const gap = progress - state.distance;
      const meetFrom = gap * minSpeed / (minSpeed + speed), meetTo = gap * maxSpeed / (maxSpeed + speed);
      if (crossings.some(c => c.phase !== 'clear' && c.progress - state.distance + 22 + profile.depth >= meetFrom && c.progress - state.distance - 22 - profile.depth <= meetTo)) continue;
      const agent = { id: nextId, lane, safeLane, row: state.elapsed, encounter: encounter.pattern, progress, speed, kind, color: tram || goose ? kind : TRAFFIC_COLORS[choose(3)], hp: roadworks || tram ? 1.5 : riderHealth(kind), x: lanes[lane], z: state.distance - progress, size: profile.size, hitHeight: profile.hitHeight, alive: true, hit: false, passed: false, hitUntil: 0 };
      if (state.traffic.some(existing => trafficRoutesConflict(agent, existing))) continue;
      candidates.push(agent);
    }
    // Prefer a full group, but use a single free lane beside roadworks rather
    // than spawning through a blocked lane or making the whole route empty.
    const count = lane => candidates.filter(agent => agent.lane !== lane).length;
    const most = Math.max(...choices.map(count));
    if (!most) return false;
    let safeChoices = choices.filter(lane => count(lane) === most);
    if (encounter.pattern === 'slalom' && safeChoices.some(lane => lane !== safeLane)) safeChoices = safeChoices.filter(lane => lane !== safeLane);
    safeLane = safeChoices[choose(safeChoices.length)];
    const group = candidates.filter(agent => agent.lane !== safeLane);
    for (const agent of group) {
      agent.id = nextId++; agent.safeLane = safeLane; agent.spawnTime = state.elapsed; state.traffic.push(agent);
    }
    if (goose) nextGeese = state.distance + (crossings.length ? 86 : 70) + choose(21);
    return true;
  }

  function clearToStumble(guest) {
    if (crossings.some(crossing => Math.abs(crossing.progress - guest.progress) < 22)) return false;
    return !state.traffic.some(agent => agent !== guest && !agent.cleared && !agent.recoiling && !isCameo(agent.kind)
      && Math.abs(agent.x - guest.x) < trafficProfile(agent.kind).width + .75
      && Math.abs(agent.progress - guest.progress) < trafficProfile(agent.kind).halfLength + 4 + agent.speed * STUMBLE_DURATION);
  }
  function yieldAtCrossing(advance, step, gap, x, vx, startsIn, nearX, farX) {
    const nearTime = startsIn + (nearX - x) / vx, farTime = startsIn + (farX - x) / vx;
    if (Math.max(nearTime, farTime) < -.18 || Math.min(nearTime, farTime) > 2.6) return advance;
    const clearance = 1.8;
    if (Math.abs(gap) < clearance) {
      return -(Math.sign(gap) || -1) * Math.min(CAMEO_JOG_SPEED * step, clearance - Math.abs(gap));
    }
    if (gap < 0 && advance < 0) return Math.max(advance, gap + clearance);
    if (gap > 0 && advance > 0) return Math.min(advance, gap - clearance);
    return advance;
  }
  function moveCameo(traffic, step, oldDistance) {
    traffic.age = (traffic.age ?? 1.2) + step;
    const oldLateral = traffic.x ?? lanes[traffic.lane], previousProgress = traffic.progress;
    traffic.x = oldLateral;
    let advance = -traffic.speed * step;
    const besideRunner = Math.abs(state.x - oldLateral) < 2.6 || traffic.speed < 0;
    if (traffic.panicSide === undefined && traffic.paceTime > 0 && besideRunner && previousProgress - oldDistance < 5) {
      const crossing = crossings.find(entry => entry.phase !== 'clear');
      const room = (crossing?.progress ?? Infinity) - state.distance;
      const boostSpeed = Math.min(speedLimit, state.cruiseSpeed + 5 * acceleration) * RUNNER_BOOST;
      if (room > boostSpeed * (2.5 + traffic.paceTime + .9) + 5) {
        traffic.paceTime = Math.max(0, traffic.paceTime - step);
        traffic.speed = -CAMEO_JOG_SPEED;
        advance = state.distance - oldDistance;
      } else traffic.paceTime = 0;
    }
    const shouldTrip = traffic.panicSide === undefined && traffic.age >= traffic.tripAt;
    if (traffic.stumbleTime !== undefined || (shouldTrip && clearToStumble(traffic))) {
      traffic.stumbleTime = (traffic.stumbleTime ?? 0) + step;
      traffic.z = state.distance - traffic.progress;
      traffic.passed = traffic.z > 2;
      if (traffic.stumbleTime < STUMBLE_DURATION) return;
      delete traffic.stumbleTime;
      fleeToShoulder(traffic);
      advance = -traffic.speed * step;
    }
    if (traffic.jogX !== undefined || traffic.panicSide !== undefined) {
      const shoulder = (traffic.panicSide ?? Math.sign(traffic.jogX)) * cameoShoulder;
      let targetX = traffic.age < .12 || traffic.panicSide !== undefined ? shoulder : traffic.jogX;
      for (const other of state.traffic) {
        if (other === traffic || other.cleared || other.recoiling || isCameo(other.kind)) continue;
        const gap = other.progress - previousProgress;
        if (other.crossing) {
          advance = yieldAtCrossing(advance, step, gap, other.x, other.vx, 0, targetX, shoulder);
        } else {
          const profile = trafficProfile(other.kind);
          const futureGap = gap - (other.speed + advance / step) * 1.7;
          const clearance = profile.halfLength + 1.65;
          if (Math.min(gap, futureGap) < clearance && Math.max(gap, futureGap) > -clearance
            && Math.abs(targetX - other.x) < profile.width + .55) targetX = shoulder;
        }
      }
      for (const crossing of crossings) if (crossing.phase === 'warning' || crossing.phase === 'crossing') {
        for (let i = crossing.launched; i < crossing.passes.length; i++) {
          const pass = crossing.passes[i];
          advance = yieldAtCrossing(advance, step, pass.progress - previousProgress, crossing.side * 14, -crossing.side * pass.speed,
            pass.launchAt - state.elapsed, targetX, shoulder);
        }
      }
      const dx = targetX - oldLateral, lateralSpeed = traffic.panicSide === undefined ? 2.8 : 4.4;
      traffic.x += Math.sign(dx) * Math.min(Math.abs(dx), lateralSpeed * step);
    }
    if (Math.abs(advance) + Math.abs(traffic.x - oldLateral) > 1e-8) {
      const heading = traffic.heading ?? 0;
      const turn = Math.atan2(traffic.x - oldLateral, -advance) - heading;
      traffic.heading = heading + Math.atan2(Math.sin(turn), Math.cos(turn)) * (1 - Math.exp(-10 * step));
    }
    traffic.progress = Math.min(length, previousProgress + advance);
    traffic.z = state.distance - traffic.progress;
    traffic.passed = traffic.z > 2;
    const moved = Math.hypot(traffic.x - oldLateral, traffic.progress - previousProgress);
    traffic.waiting = moved < 1e-8;
    traffic.gait = (traffic.gait ?? 0) + cameoGaitForDistance(moved, true);
  }
  function fleeToShoulder(agent) {
    if (agent.panicSide !== undefined) return;
    const x = agent.x ?? lanes[agent.lane];
    agent.panicSide = Math.sign(x - state.x) || Math.sign(x) || 1;
    agent.speed = -Math.min(4.7, startSpeed * RUNNER_BRAKE * .8);
  }
  return {
    state, length, lanes, reset,
    get pace() {
      const ratio = state.speed / state.cruiseSpeed - 1;
      return Math.max(-1, Math.min(1, ratio / (ratio < 0 ? 1 - RUNNER_BRAKE : RUNNER_BOOST - 1)));
    },
    sprayHit(id, { damage = 1, charge = 0 } = {}) {
      const agent = state.traffic.find(agent => agent.id === id);
      if (!agent || !agent.alive || agent.passed || !canSpray(agent.kind) || state.finished) return false;
      if (isCameo(agent.kind)) {
        fleeToShoulder(agent);
        agent.hitUntil = state.elapsed + .18;
        return false;
      }
      agent.hp -= damage * (.75 + Math.max(0, Math.min(1, charge)) * 1.75);
      agent.hitUntil = state.elapsed + .18;
      if (agent.hp > 0) return false;
      agent.alive = false; agent.cleared = true; agent.clearedAt = state.elapsed;
      state.cleared++; state.bonus += RIDER_BONUS;
      return true;
    },
    dodge(direction) {
      if (!state.finished && direction) state.lane = Math.max(0, Math.min(lanes.length - 1, state.lane + Math.sign(direction)));
    },
    setThrottle(value) {
      if (!Number.isFinite(value)) throw new Error('Runner throttle must be finite');
      if (!state.finished) state.throttle = Math.max(-1, Math.min(1, value));
    },
    update(dt) {
      if (!Number.isFinite(dt) || dt < 0) throw new Error('Runner dt must be non-negative');
      const impacts = [];
      let hits = 0, damage = 0, passed = 0, dodged = 0, warning = null, crash = null;
      // Fixed maximum steps make collision, scoring and acceleration stable at
      // different refresh rates, including low-frame-rate mobile browsers.
      for (let remaining = dt; remaining > 1e-9 && !state.finished;) {
        const step = Math.min(remaining, 1 / 120); remaining -= step;
        const oldX = state.x, oldDistance = state.distance;
        if (state.hitStop > 0) {
          state.hitStop = Math.max(0, state.hitStop - step);
          if (state.hitStop < 1e-9) {
            state.hitStop = 0;
            for (let i = state.traffic.length - 1; i >= 0; i--) {
              if (state.traffic[i].recoiling) state.traffic.splice(i, 1);
            }
          }
          continue;
        }
        state.invulnerable = Math.max(0, state.invulnerable - step);
        state.elapsed += step;
        state.cruiseSpeed = Math.min(speedLimit, startSpeed + state.elapsed * acceleration);
        const targetSpeed = state.cruiseSpeed * (1 + state.throttle * (state.throttle < 0 ? 1 - RUNNER_BRAKE : RUNNER_BOOST - 1));
        state.speed += Math.sign(targetSpeed - state.speed) * Math.min(Math.abs(targetSpeed - state.speed), 12 * step);
        state.distance = Math.min(length, state.distance + state.speed * step);
        encounters.update(state.distance);
        const target = lanes[state.lane], change = target - state.x;
        state.x += Math.sign(change) * Math.min(Math.abs(change), 13 * step);
        const cameoWindow = reserveCameoWindow();
        if (!cameoWindow && state.elapsed >= nextSpawn && state.distance < length - 65) {
          const spawned = row();
          const minimumSpacing = busy ? (crossings.length ? 1 : 1.7) : 0;
          nextSpawn = state.elapsed + (spawned ? Math.max(minimumSpacing, encounters.delay(state.distance)) : .15);
        }
        for (const crossing of crossings) {
          const gap = crossing.progress - state.distance;
          if (crossing.phase === 'approach' && gap <= state.speed * 2.5) {
            crossing.phase = 'warning';
            for (const pass of crossing.passes) pass.launchAt = state.elapsed + (pass.progress - state.distance + pass.bias) / state.speed - Math.abs(crossing.side * 14 - lanes[pass.targetLane]) / pass.speed;
            crossing.launchAt = crossing.passes[0].launchAt;
            crossing.nextLaunchAt = crossing.passes[1].launchAt;
            warning = crossing.side < 0 ? 'SCOOTERS FROM THE LEFT →' : '← SCOOTERS FROM THE RIGHT';
          }
          if (variety && (crossing.phase === 'warning' || crossing.phase === 'crossing')) {
            // Until a rider commits, account for the runner's current speed
            // ramp. Once moving, its speed and trajectory stay fixed.
            for (let i = crossing.launched; i < crossing.passes.length; i++) {
              const pass = crossing.passes[i];
              pass.launchAt = state.elapsed + arrivalTime(pass.progress - state.distance + pass.bias) - Math.abs(crossing.side * 14 - lanes[pass.targetLane]) / pass.speed;
            }
            crossing.launchAt = crossing.passes[0].launchAt; crossing.nextLaunchAt = crossing.passes[1].launchAt;
          }
          while (crossing.launched < 2 && state.elapsed >= (crossing.launched === 0 ? crossing.launchAt : crossing.nextLaunchAt)) {
            const pass = crossing.passes[crossing.launched], { progress } = pass;
            crossing.phase = 'crossing'; crossing.launched++;
            if (state.traffic.length >= TRAFFIC_CAPACITY) continue;
            const profile = trafficProfile('scooter');
            state.traffic.push({ id: nextId++, kind: 'scooter', color: TRAFFIC_COLORS[choose(3)], crossing: true, vx: -crossing.side * pass.speed, x: crossing.side * 14, z: state.distance - progress, progress, speed: 0, size: profile.size, hitHeight: profile.hitHeight, hp: SCOOTER_HEALTH, alive: true, hit: false, passed: false, hitUntil: 0, spawnTime: state.elapsed });
          }
          if (crossing.phase === 'crossing' && crossing.launched === 2 && gap < -10 &&
              !state.traffic.some(agent => agent.crossing && !agent.passed)) crossing.phase = 'clear';
        }
        let contact = null;
        for (const traffic of state.traffic) {
          traffic.stepX = traffic.x ?? lanes[traffic.lane];
          traffic.stepProgress = traffic.progress;
          if (isCameo(traffic.kind)) {
            moveCameo(traffic, step, oldDistance);
            continue;
          }
          const oldProgress = traffic.progress;
          const oldGap = traffic.progress - oldDistance;
          const oldTrafficX = traffic.x ?? lanes[traffic.lane];
          if (traffic.crossing) traffic.x += traffic.vx * step;
          else { traffic.progress -= traffic.speed * step; traffic.x = lanes[traffic.lane]; }
          const gap = traffic.progress - state.distance;
          traffic.z = -gap;
          const routedTram = traffic.kind === 'tram' && tramRoute;
          if (routedTram) {
            tramRoute(traffic.progress, lanes[traffic.lane], pose);
            traffic.x = pose.x; traffic.z = state.distance + pose.z; traffic.heading = pose.heading;
          }
          const profile = trafficProfile(traffic.kind), width = traffic.crossing ? profile.depth : profile.width, depth = traffic.crossing ? profile.width : profile.depth;
          if (!traffic.cleared && !traffic.hit) {
            const fraction = routedTram ? tramContact(traffic, oldProgress, oldX, oldDistance)
              : contactFraction(oldX - oldTrafficX, oldGap, state.x - traffic.x, gap, width, depth);
            if (fraction !== null && (!contact || fraction < contact.fraction)) {
              contact = { traffic, fraction, oldTrafficX, oldProgress };
            }
          }
        }
        if (contact) {
          const { traffic, fraction, oldTrafficX, oldProgress } = contact;
          const dx = state.x - oldX, dz = state.distance - oldDistance;
          const relativeTravel = Math.hypot(dx - (traffic.x - oldTrafficX), dz - (traffic.progress - oldProgress));
          const stop = Math.max(0, fraction - CONTACT_MARGIN / Math.max(CONTACT_MARGIN, relativeTravel));
          state.x = oldX + dx * stop;
          state.distance = oldDistance + dz * stop;
          state.elapsed -= step * (1 - stop);
          traffic.hit = true;
          for (const agent of state.traffic) {
            agent.progress = agent.stepProgress + (agent.progress - agent.stepProgress) * stop;
            if (agent.kind === 'tram' && tramRoute) {
              tramRoute(agent.progress, lanes[agent.lane], pose);
              agent.x = pose.x; agent.z = state.distance + pose.z; agent.heading = pose.heading;
            } else {
              agent.x = agent.stepX + (agent.x - agent.stepX) * stop;
              agent.z = state.distance - agent.progress;
            }
          }
          const impact = { x: (state.x + traffic.x) / 2, z: Math.max(-1.2, Math.min(.35, traffic.z)), kind: traffic.kind };
          impacts.push(impact);
          if (ROADWORK_TYPES.includes(traffic.kind)) { crash = impact; break; }
          traffic.recoiling = true;
          state.hitStop = RUNNER_IMPACT_PAUSE;
          if (state.invulnerable <= 0) { hits++; damage += RUNNER_COLLISION_DAMAGE; state.invulnerable = traffic.crossing ? .45 : 1.2; }
        }
        for (let i = state.traffic.length - 1; i >= 0; i--) {
          const agent = state.traffic[i], gap = agent.progress - state.distance;
          if (!isCameo(agent.kind) && !agent.passed) {
            const profile = trafficProfile(agent.kind);
            const depth = agent.crossing ? profile.width : profile.depth;
            const crossedAway = agent.crossing && (agent.vx > 0
              ? agent.x > lanes.at(-1) + profile.depth + .6 : agent.x < lanes[0] - profile.depth - .6);
            if (gap < -depth - .6 || crossedAway) {
              agent.passed = true;
              if (!agent.hit && !agent.cleared) {
                passed++; state.passed++;
                const rider = RIDER_KINDS.includes(agent.kind);
                if (rider) dodged++;
                state.bonus += rider ? RIDER_DODGE_BONUS : OBSTACLE_PASS_BONUS;
              }
            }
          }
          if (gap < -12 || (agent.crossing && Math.abs(agent.x) > 19) || (agent.cleared && state.elapsed - agent.clearedAt > .6)) state.traffic.splice(i, 1);
        }
        state.finished = state.distance >= length;
      }
      return { hits, damage, impacts, crash, passed, dodged, warning, finished: state.finished };
    },
  };
}
