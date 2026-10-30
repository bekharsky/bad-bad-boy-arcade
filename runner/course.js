export const BAANA_LENGTH = 700;
export const RIDER_BONUS = 150;
export const RIDER_HEALTH = .4;
export const RUN_LANES = Object.freeze([-3, 0, 3]);
export const TRAM_LANES = Object.freeze([-2.2, 2.2]);
export const TRAFFIC_COLORS = Object.freeze(['green', 'blue', 'red']);
export const TRAFFIC_CAPACITY = 24;

export const ROADWORK_TYPES = Object.freeze(['cone', 'tractor', 'barrier', 'trench']);
const PROFILES = {
  bike: { halfLength: 1.2, width: 1.05, depth: 1.65, size: .7, hitHeight: 1.2 },
  scooter: { halfLength: .95, width: 1.05, depth: 1.65, size: .7, hitHeight: 1.2 },
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
  if (a.crossing || b.crossing || a.lane !== b.lane || a.cleared || b.cleared) return false;
  const clearance = trafficProfile(a.kind).halfLength + trafficProfile(b.kind).halfLength + 1.5;
  const gap = a.progress - b.progress;
  if (a.speed === b.speed) return Math.abs(gap) < clearance;
  return a.speed > b.speed ? gap > -clearance : gap < clearance;
}

// Swept collision in the runner's moving frame: quick lane changes and a long
// frame cannot jump through a cyclist between two rendered positions.
export function trafficContact(x0, gap0, x1, gap1, laneX, width = 1.05, depth = 1.65) {
  let enter = 0, leave = 1;
  for (const [from, to, min, max] of [[x0, x1, laneX - width, laneX + width], [gap0, gap1, -depth, depth]]) {
    const change = to - from;
    if (Math.abs(change) < 1e-9) { if (from < min || from > max) return false; }
    else {
      const a = (min - from) / change, b = (max - from) / change;
      enter = Math.max(enter, Math.min(a, b)); leave = Math.min(leave, Math.max(a, b));
      if (enter > leave) return false;
    }
  }
  return true;
}

export function createRunnerRun({ length = BAANA_LENGTH, random = Math.random, riderKinds = ['bike', 'scooter'], lanes = RUN_LANES, tramChance = 0, roadworkKinds = ROADWORK_TYPES, crossingPoints = [], startSpeed = 9, speedLimit = 17, acceleration = .08 } = {}) {
  if (!Number.isFinite(length) || length <= 0) throw new Error('Runner length must be positive');
  if (!Array.isArray(riderKinds) || !riderKinds.length || riderKinds.some(kind => !['bike', 'scooter'].includes(kind))) throw new Error('Runner requires supported rider kinds');
  if (!Array.isArray(lanes) || lanes.length < 2 || lanes.some((x, i) => !Number.isFinite(x) || (i && x <= lanes[i - 1]))) throw new Error('Runner lanes must be ordered positions');
  if (!Number.isFinite(tramChance) || tramChance < 0 || tramChance > 1) throw new Error('Invalid tram chance');
  if (!Array.isArray(roadworkKinds) || roadworkKinds.some(kind => !ROADWORK_TYPES.includes(kind))) throw new Error('Invalid roadwork kinds');
  if (![startSpeed, speedLimit, acceleration].every(Number.isFinite) || startSpeed <= 0 || speedLimit < startSpeed || acceleration < 0) throw new Error('Invalid runner speed');
  if (!Array.isArray(crossingPoints) || crossingPoints.some((p, i) => !Number.isFinite(p) || p <= 50 || p >= length - 30 || (i && p <= crossingPoints[i - 1]))) throw new Error('Invalid crossing points');
  lanes = [...lanes];
  const riders = [...riderKinds];
  const startLane = Math.floor((lanes.length - 1) / 2);
  const crossings = crossingPoints.map((progress, i) => ({ progress, side: i % 2 ? 1 : -1, phase: 'approach', launched: 0, launchAt: Infinity }));
  const state = { distance: 0, elapsed: 0, speed: startSpeed, x: lanes[startLane], lane: startLane, invulnerable: 0, passed: 0, cleared: 0, bonus: 0, finished: false, traffic: [], crossings };
  let nextSpawn = 0, nextId = 0, safeLane = startLane;
  const choose = count => Math.min(count - 1, Math.max(0, Math.floor(random() * count)));
  function reset() {
    Object.assign(state, { distance: 0, elapsed: 0, speed: startSpeed, x: lanes[startLane], lane: startLane, invulnerable: 0, passed: 0, cleared: 0, bonus: 0, finished: false });
    for (const crossing of crossings) Object.assign(crossing, { phase: 'approach', launched: 0, launchAt: Infinity });
    state.traffic.length = 0; nextSpawn = 0; nextId = 0; safeLane = startLane;
  }
  function row() {
    const choices = [safeLane - 1, safeLane, safeLane + 1].filter(lane => lane >= 0 && lane < lanes.length);
    const tram = tramChance > 0 && random() < tramChance;
    const roadworks = !tram && roadworkKinds.length > 0 && choose(4) === 0, speed = tram ? 7.5 : roadworks ? 0 : 5.2;
    // Reserve arrival times, not world-space spacing: parked roadworks and
    // oncoming riders must not converge into an unavoidable three-lane wall.
    let arrival = 3.2;
    for (const agent of state.traffic) if (!agent.cleared && !agent.crossing) {
      const clearance = tramChance > 0 ? trafficProfile(agent.kind).depth : 0;
      arrival = Math.max(arrival, (agent.progress - state.distance + clearance) / (state.speed + agent.speed) + .85);
    }
    if (arrival > 5 || state.traffic.length + 2 > TRAFFIC_CAPACITY) return;
    const candidates = [];
    for (let lane = 0; lane < lanes.length; lane++) {
      const kind = tram ? 'tram' : roadworks ? roadworkKinds[choose(roadworkKinds.length)] : riders[choose(riders.length)];
      const profile = trafficProfile(kind), progress = state.distance + arrival * (state.speed + speed) + (tramChance > 0 ? profile.depth : 0);
      // Keep a clear window around cross traffic. A tram must not close the
      // only escape lane while a scooter shoots out of a side street.
      const contactTime = (progress - state.distance) / (state.speed + speed);
      if (crossings.some(c => Math.abs((c.progress - state.distance) / state.speed - contactTime) < 1.8 + profile.depth / (state.speed + speed))) continue;
      const agent = { id: nextId, lane, safeLane, row: state.elapsed, progress, speed, kind, color: tram ? 'tram' : TRAFFIC_COLORS[choose(3)], hp: roadworks || tram ? 1.5 : RIDER_HEALTH, x: lanes[lane], z: state.distance - progress, size: profile.size, hitHeight: profile.hitHeight, alive: true, hit: false, passed: false, hitUntil: 0 };
      if (state.traffic.some(existing => trafficRoutesConflict(agent, existing))) continue;
      candidates.push(agent);
    }
    // Prefer a full group, but use a single free lane beside roadworks rather
    // than spawning through a blocked lane or making the whole route empty.
    const count = lane => candidates.filter(agent => agent.lane !== lane).length;
    const most = Math.max(...choices.map(count));
    if (!most) return false;
    const safeChoices = choices.filter(lane => count(lane) === most);
    safeLane = safeChoices[choose(safeChoices.length)];
    for (const agent of candidates.filter(agent => agent.lane !== safeLane)) {
      agent.id = nextId++; agent.safeLane = safeLane; state.traffic.push(agent);
    }
    return true;
  }

  return {
    state, length, lanes, reset,
    sprayHit(id, { damage = 1, charge = 0 } = {}) {
      const agent = state.traffic.find(agent => agent.id === id);
      if (!agent || !agent.alive || !['bike', 'scooter'].includes(agent.kind) || state.finished) return false;
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
    update(dt) {
      if (!Number.isFinite(dt) || dt < 0) throw new Error('Runner dt must be non-negative');
      let hits = 0, passed = 0, warning = null;
      // Fixed maximum steps make collision, scoring and acceleration stable at
      // different refresh rates, including low-frame-rate mobile browsers.
      for (let remaining = dt; remaining > 1e-9 && !state.finished;) {
        const step = Math.min(remaining, 1 / 120); remaining -= step;
        const oldX = state.x, oldDistance = state.distance;
        state.invulnerable = Math.max(0, state.invulnerable - step);
        state.elapsed += step; state.speed = Math.min(speedLimit, startSpeed + state.elapsed * acceleration);
        state.distance = Math.min(length, state.distance + state.speed * step);
        const target = lanes[state.lane], change = target - state.x;
        state.x += Math.sign(change) * Math.min(Math.abs(change), 13 * step);
        if (state.elapsed >= nextSpawn && state.distance < length - 65) {
          const spawned = row();
          nextSpawn = state.elapsed + (spawned ? Math.max(.85, 1.05 - state.distance / 6000) : .15);
        }
        for (const crossing of crossings) {
          const gap = crossing.progress - state.distance;
          if (crossing.phase === 'approach' && gap <= state.speed * 2.5) {
            crossing.phase = 'warning';
            const nearLane = crossing.side < 0 ? lanes[0] : lanes.at(-1);
            crossing.launchAt = state.elapsed + gap / state.speed - Math.abs(crossing.side * 14 - nearLane) / 15;
            warning = crossing.side < 0 ? 'SCOOTERS FROM THE LEFT →' : '← SCOOTERS FROM THE RIGHT';
          }
          while (crossing.launched < 2 && state.elapsed >= crossing.launchAt + crossing.launched * .65) {
            crossing.phase = 'crossing'; crossing.launched++;
            if (state.traffic.length >= TRAFFIC_CAPACITY) continue;
            const profile = trafficProfile('scooter');
            state.traffic.push({ id: nextId++, kind: 'scooter', color: TRAFFIC_COLORS[choose(3)], crossing: true, vx: -crossing.side * 15, x: crossing.side * 14, z: -gap, progress: crossing.progress, speed: 0, size: profile.size, hitHeight: profile.hitHeight, hp: RIDER_HEALTH, alive: true, hit: false, passed: false, hitUntil: 0 });
          }
          if (crossing.launched === 2 && state.elapsed > crossing.launchAt + 3) crossing.phase = 'clear';
        }
        for (const traffic of state.traffic) {
          const oldGap = traffic.progress - oldDistance;
          const oldTrafficX = traffic.x ?? lanes[traffic.lane];
          if (traffic.crossing) traffic.x += traffic.vx * step;
          else { traffic.progress -= traffic.speed * step; traffic.x = lanes[traffic.lane]; }
          const gap = traffic.progress - state.distance;
          traffic.z = -gap;
          const profile = trafficProfile(traffic.kind), width = traffic.crossing ? profile.depth : profile.width, depth = traffic.crossing ? profile.width : profile.depth;
          if (!traffic.cleared && !traffic.hit && trafficContact(oldX - oldTrafficX, oldGap, state.x - traffic.x, gap, 0, width, depth)) {
            traffic.hit = true;
            if (state.invulnerable <= 0) { hits++; state.invulnerable = 1.2; }
          }
          if (!traffic.passed && gap < -depth - .6) {
            traffic.passed = true;
            if (!traffic.hit && !traffic.cleared) { passed++; state.passed++; }
          }
        }
        for (let i = state.traffic.length - 1; i >= 0; i--) if (state.traffic[i].progress - state.distance < -12 || (state.traffic[i].crossing && Math.abs(state.traffic[i].x) > 19) || (state.traffic[i].cleared && state.elapsed - state.traffic[i].clearedAt > .6)) state.traffic.splice(i, 1);
        state.finished = state.distance >= length;
      }
      return { hits, passed, warning, finished: state.finished };
    },
  };
}
