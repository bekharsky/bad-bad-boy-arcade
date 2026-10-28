export const BAANA_LENGTH = 1300;
export const RUN_LANES = Object.freeze([-3, 0, 3]);
export const TRAFFIC_COLORS = Object.freeze(['green', 'blue', 'red']);
export const TRAFFIC_CAPACITY = 18;

// Swept collision in the runner's moving frame: quick lane changes and a long
// frame cannot jump through a cyclist between two rendered positions.
export function trafficContact(x0, gap0, x1, gap1, laneX) {
  let enter = 0, leave = 1;
  for (const [from, to, min, max] of [[x0, x1, laneX - 1.05, laneX + 1.05], [gap0, gap1, -1.65, 1.65]]) {
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

export function createBaanaRun({ length = BAANA_LENGTH, random = Math.random } = {}) {
  if (!Number.isFinite(length) || length <= 0) throw new Error('Runner length must be positive');
  const state = { distance: 0, elapsed: 0, speed: 9, x: 0, lane: 1, invulnerable: 0, passed: 0, finished: false, traffic: [] };
  let nextRow = 44, nextId = 0, safeLane = 1;
  const choose = count => Math.min(count - 1, Math.max(0, Math.floor(random() * count)));
  function reset() {
    Object.assign(state, { distance: 0, elapsed: 0, speed: 9, x: 0, lane: 1, invulnerable: 0, passed: 0, finished: false });
    state.traffic.length = 0; nextRow = 44; nextId = 0; safeLane = 1;
  }
  function row() {
    const choices = [safeLane - 1, safeLane, safeLane + 1].filter(lane => lane >= 0 && lane < RUN_LANES.length);
    safeLane = choices[choose(choices.length)];
    let occupied = [0, 1, 2].filter(lane => lane !== safeLane);
    if (nextRow < 200 || choose(4) === 0) occupied = [occupied[choose(occupied.length)]];
    if (state.traffic.length + occupied.length <= TRAFFIC_CAPACITY) for (const lane of occupied) {
      state.traffic.push({ id: nextId++, lane, safeLane, row: nextRow, progress: nextRow, speed: 5.2, kind: choose(2) ? 'scooter' : 'bike', color: TRAFFIC_COLORS[choose(3)], hit: false, passed: false });
    }
    // Adjacent safe lanes and at least 26 m between rows leave ample reaction time.
    nextRow += Math.max(26, 34 - state.distance / 180);
  }
  return {
    state, length, reset,
    dodge(direction) {
      if (!state.finished && direction) state.lane = Math.max(0, Math.min(2, state.lane + Math.sign(direction)));
    },
    update(dt) {
      if (!Number.isFinite(dt) || dt < 0) throw new Error('Runner dt must be non-negative');
      let hits = 0, passed = 0;
      // Fixed maximum steps make collision, scoring and acceleration stable at
      // different refresh rates, including low-frame-rate mobile browsers.
      for (let remaining = dt; remaining > 1e-9 && !state.finished;) {
        const step = Math.min(remaining, 1 / 120); remaining -= step;
        const oldX = state.x, oldDistance = state.distance;
        state.invulnerable = Math.max(0, state.invulnerable - step);
        state.elapsed += step; state.speed = Math.min(17, 9 + state.elapsed * .08);
        state.distance = Math.min(length, state.distance + state.speed * step);
        const target = RUN_LANES[state.lane], change = target - state.x;
        state.x += Math.sign(change) * Math.min(Math.abs(change), 13 * step);
        while (nextRow <= state.distance + 54 && nextRow < length - 16) row();
        for (const traffic of state.traffic) {
          const oldGap = traffic.progress - oldDistance;
          traffic.progress -= traffic.speed * step;
          const gap = traffic.progress - state.distance;
          if (!traffic.hit && trafficContact(oldX, oldGap, state.x, gap, RUN_LANES[traffic.lane])) {
            traffic.hit = true;
            if (state.invulnerable <= 0) { hits++; state.invulnerable = 1.2; }
          }
          if (!traffic.passed && gap < -2.2) {
            traffic.passed = true;
            if (!traffic.hit) { passed++; state.passed++; }
          }
        }
        for (let i = state.traffic.length - 1; i >= 0; i--) if (state.traffic[i].progress - state.distance < -12) state.traffic.splice(i, 1);
        state.finished = state.distance >= length;
      }
      return { hits, passed, finished: state.finished };
    },
  };
}
