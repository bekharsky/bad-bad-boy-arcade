// Independent ambient hazards. All timing uses the game clock; birds never
// enter the wave director or the runner's traffic/score accounting.
const STEP = 1 / 120;
const WINDUP = 1.6;
const STRIKE_TIME = .9;
const APPROACH_TIME = 4.5;
const EXIT_TIME = 3;
const SETTLE_TIME = 1.8;
const GRAVITY = 9;
const smooth = t => t * t * (3 - 2 * t);

export function createGullFlight({ random = Math.random, canStandAt = () => true, lineClear3D = () => true, onImpact = () => {}, onRepel = () => {} } = {}) {
  const birds = Array.from({ length: 2 }, (_, id) => ({
    id, kind: 'gull', airborne: true, size: .62, alive: false,
    x: 0, z: 0, hitHeight: 6, vx: 0, vy: 0, vz: 0,
    phase: 'waiting', age: 0, nextJetHit: 0, target: null, drop: null,
  }));
  let time = 0, accumulator = 0, nextAttack = 6, nextBird = 0, runner = false;
  const previous = { x: 0, z: 0 };

  function reset(player, running = false) {
    time = accumulator = nextBird = 0; nextAttack = 9 + random() * 2; runner = running;
    previous.x = player.x; previous.z = player.z;
    for (const bird of birds) {
      Object.assign(bird, { phase: 'waiting', age: 0, alive: false, nextJetHit: 0, target: null, drop: null, start: null, vx: 0, vy: 0, vz: 0,
        orbitScale: 1, nextOrbitCheck: 0, entryDelay: 2 + bird.id * 5 + random(), returnAfter: 0, goal: {} });
      bird.x = player.x; bird.z = player.z - 90; bird.hitHeight = 10;
    }
  }

  function orbitGoal(bird, player) {
    const angle = time * .65 + bird.id * Math.PI;
    const height = 6.3 + Math.sin(angle * 1.3) * .65;
    const dx = Math.cos(angle) * (runner ? 3.6 : 6), dz = -5 + Math.sin(angle) * 3.5;
    if (time >= bird.nextOrbitCheck) {
      bird.nextOrbitCheck = time + .15;
      bird.orbitScale = 1;
      const anchor = { x: player.x, y: height, z: player.z };
      for (let i = 0; i < 4; i++) {
        const candidate = { x: player.x + dx * bird.orbitScale, y: height, z: player.z + dz * bird.orbitScale };
        if (lineClear3D(anchor, candidate, .3)) break;
        bird.orbitScale *= .5;
      }
    }
    const x = player.x + dx * bird.orbitScale, z = player.z + dz * bird.orbitScale;
    if (!Number.isFinite(bird.goal.x)) { bird.goal.x = x; bird.goal.z = z; bird.goal.y = height; }
    else {
      const response = 1 - Math.exp(-8 * STEP);
      bird.goal.x += (x - bird.goal.x) * response;
      bird.goal.z += (z - bird.goal.z) * response;
      bird.goal.y += (height - bird.goal.y) * response;
    }
    return bird.goal;
  }

  function approach(bird, player) {
    bird.phase = 'approach'; bird.age = 0; bird.alive = true; bird.nextJetHit = 0;
    bird.x = player.x + (bird.id ? -1 : 1) * (runner ? 1.2 : 8);
    bird.z = player.z - 90; bird.hitHeight = (runner ? 12 : 15) + bird.id;
    bird.start = { x: bird.x, y: bird.hitHeight, z: bird.z };
  }

  function leave(bird) {
    bird.phase = 'flee'; bird.age = 0;
    bird.start = { x: bird.x, y: bird.hitHeight, z: bird.z };
  }

  function blend(bird, target, amount) {
    bird.x = bird.start.x + (target.x - bird.start.x) * amount;
    bird.z = bird.start.z + (target.z - bird.start.z) * amount;
    bird.hitHeight = bird.start.y + (target.y - bird.start.y) * amount;
  }

  function launch(bird, player, velocity, scroll) {
    // Commit to a position, rather than tracking the player through the dive.
    // Maintaining pace is dangerous; a lane change or braking can evade it.
    const lead = WINDUP + STRIKE_TIME;
    const target = {
      x: player.x + velocity.x * (runner ? .15 : .4),
      y: .12,
      z: player.z + (runner ? -scroll * lead : velocity.z * .4),
    };
    if (!canStandAt(target.x, target.z, .4)) return false;
    const above = { x: target.x, y: 7, z: target.z };
    if (!lineClear3D(above, target, .2)) return false;
    bird.phase = random() < .5 ? 'drop-windup' : 'dive-windup';
    bird.age = 0; bird.target = target;
    bird.start = { x: bird.x, y: bird.hitHeight, z: bird.z };
    return true;
  }

  function finish(bird) {
    bird.phase = 'recover'; bird.age = 0; bird.target = null;
    bird.start = { x: bird.x, y: bird.hitHeight, z: bird.z };
    if (!bird.alive) leave(bird);
    nextAttack = time + 6 + random() * 4;
  }

  function impact(bird, player, type) {
    const target = bird.target;
    const hit = Math.hypot(player.x - target.x, player.z - target.z) < player.radius + (type === 'drop' ? .8 : .65);
    onImpact({ x: target.x, y: type === 'drop' ? .14 : 1.9, z: target.z, type, hit });
    finish(bird);
  }

  function step(player, velocity, scroll, attacks) {
    time += STEP;
    for (const bird of birds) {
      const ox = bird.x, oy = bird.hitHeight, oz = bird.z;
      const shift = scroll * STEP;
      bird.z += shift;
      if (bird.target) bird.target.z += shift;
      if (bird.start && bird.phase !== 'approach' && bird.phase !== 'flee') bird.start.z += shift;
      if (bird.drop) bird.drop.z += shift;
      bird.age += STEP;
      if (bird.phase === 'waiting') {
        if (bird.age >= bird.entryDelay) approach(bird, player);
      } else if (bird.phase === 'approach') {
        blend(bird, orbitGoal(bird, player), smooth(Math.min(1, bird.age / APPROACH_TIME)));
        if (bird.age >= APPROACH_TIME) { bird.phase = 'orbit'; bird.age = 0; }
      } else if (bird.phase === 'orbit') {
        const goal = orbitGoal(bird, player), response = 1 - Math.exp(-4 * STEP);
        // Wall avoidance and following the player change the desired orbit,
        // never the bird's position in a single frame.
        bird.x += (goal.x - bird.x) * response;
        bird.z += (goal.z - bird.z) * response;
        bird.hitHeight += (goal.y - bird.hitHeight) * response;
      }
      else if (bird.phase.endsWith('-windup')) {
        const t = smooth(Math.min(1, bird.age / WINDUP));
        const dive = bird.phase === 'dive-windup';
        bird.x = bird.start.x + (bird.target.x + (dive ? 3 : 0) - bird.start.x) * t;
        bird.z = bird.start.z + (bird.target.z + (dive ? -4 : 0) - bird.start.z) * t;
        bird.hitHeight = bird.start.y + (7 - bird.start.y) * t;
        if (bird.age >= WINDUP) {
          bird.age = 0;
          bird.start = { x: bird.x, y: bird.hitHeight, z: bird.z };
          if (dive) bird.phase = 'dive';
          else {
            bird.phase = 'drop';
            bird.drop = { x: bird.x, y: bird.hitHeight, z: bird.z,
              vx: (bird.target.x - bird.x) / STRIKE_TIME,
              vz: (bird.target.z - bird.z) / STRIKE_TIME,
              vy: (.12 - bird.hitHeight + .5 * GRAVITY * STRIKE_TIME ** 2) / STRIKE_TIME };
          }
        }
      } else if (bird.phase === 'dive') {
        const t = Math.min(1, bird.age / STRIKE_TIME);
        const from = { x: bird.x, y: bird.hitHeight, z: bird.z };
        bird.x = bird.start.x + (bird.target.x - bird.start.x) * t;
        bird.z = bird.start.z + (bird.target.z - bird.start.z) * t;
        bird.hitHeight = bird.start.y + (1.9 - bird.start.y) * smooth(t);
        if (!lineClear3D(from, { x: bird.x, y: bird.hitHeight, z: bird.z }, .3)) finish(bird);
        else if (t >= 1) impact(bird, player, 'dive');
      } else if (bird.phase === 'drop') {
        const drop = bird.drop;
        const from = { x: drop.x, y: drop.y, z: drop.z };
        drop.x += drop.vx * STEP; drop.z += drop.vz * STEP;
        drop.y += drop.vy * STEP - .5 * GRAVITY * STEP ** 2; drop.vy -= GRAVITY * STEP;
        if (bird.alive) bird.x += (bird.id ? -1 : 1) * STEP * 3;
        else { bird.hitHeight += STEP * 5; bird.z -= STEP * 7; }
        if (!lineClear3D(from, drop, .12)) { bird.drop = null; finish(bird); }
        else if (bird.age >= STRIKE_TIME) { impact(bird, player, 'drop'); bird.drop = null; }
      } else if (bird.phase === 'recover') {
        const t = smooth(Math.min(1, bird.age / 1.3));
        blend(bird, orbitGoal(bird, player), t);
        if (bird.age > 1.3) { bird.phase = 'orbit'; bird.age = 0; }
      } else if (bird.phase === 'flee') {
        blend(bird, { x: player.x + (bird.id ? -1 : 1) * 35, y: 35, z: player.z - 25 }, smooth(Math.min(1, bird.age / EXIT_TIME)));
        if (bird.age >= EXIT_TIME) { bird.phase = 'away'; bird.age = 0; }
      } else if (bird.phase === 'away' && bird.age >= bird.returnAfter - EXIT_TIME) {
        approach(bird, player);
      }
      bird.vx = (bird.x - ox) / STEP;
      bird.vy = (bird.hitHeight - oy) / STEP;
      bird.vz = (bird.z - oz) / STEP;
      // Only invisible staging relocates a bird; visible flight is continuous.
      if (bird.phase === 'approach' && bird.age === 0) bird.vx = bird.vy = bird.vz = 0;
    }
    if (attacks && time >= nextAttack && !birds.some(b => b.target || b.drop)) {
      const bird = birds[nextBird++ % birds.length];
      if (!bird.alive || bird.phase !== 'orbit' || bird.age < SETTLE_TIME || !launch(bird, player, velocity, scroll)) nextAttack = time + 1;
      else nextAttack = Infinity;
    }
  }

  return {
    birds, reset,
    update(dt, player, { scroll = 0, attacks = true } = {}) {
      if (dt <= 0) return;
      const velocity = { x: (player.x - previous.x) / dt, z: (player.z - previous.z) / dt };
      accumulator += dt;
      const steps = Math.floor((accumulator + 1e-10) / STEP);
      const current = { x: player.x, z: player.z, radius: player.radius };
      for (let i = 0; i < steps; i++) {
        current.x = previous.x + (player.x - previous.x) * (i + 1) / steps;
        current.z = previous.z + (player.z - previous.z) * (i + 1) / steps;
        step(current, velocity, scroll, attacks);
        accumulator -= STEP;
      }
      previous.x = player.x; previous.z = player.z;
    },
    repel(bird) {
      if (!birds.includes(bird) || !bird.alive) return false;
      // A falling parcel is already committed and survives its bird fleeing.
      // Cancel windups/dives, but retain an airborne dropping until impact.
      onRepel(bird);
      bird.alive = false; bird.returnAfter = 8 + random() * 4;
      if (!bird.drop) { leave(bird); bird.target = null; }
      nextAttack = Math.min(nextAttack, time + 6);
      return true;
    },
  };
}
