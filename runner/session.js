import * as THREE from 'three';
import { animateHero } from '../hero.js';
import { createRunnerRun } from './course.js';
import { createLaneSteering, runnerThrottle } from './runner-input.js';

// Owns the runner's simulation and presentation. The game shell supplies only
// cross-mode effects (health, spray, score, and campaign transitions).
export function createRunnerSession({
  world, player, cameraRig, seagulls, medkits, touchControls, keys,
  heroHeight, heroScale, isPlaying, onDamage, onSpray, onCollect,
  onScore, onProgress, onFinish,
}) {
  let run = createRunnerRun();
  let baseScore = 0;
  const steering = createLaneSteering(direction => run.dodge(direction));

  function syncScore() {
    const { distance, bonus } = run.state;
    onScore(baseScore + Math.floor(distance) * 2 + bonus);
  }

  function start(definition, score) {
    run = createRunnerRun(definition);
    baseScore = score;
    player.invulnerable = 0;
    steering.reset();
    onProgress(0);
    world.updateRunner(run.state);
  }

  function update(dt) {
    steering.update(touchControls.input.x, dt);
    run.setThrottle(runnerThrottle(keys, touchControls.input.z));
    const result = run.update(dt), state = run.state;
    player.x = state.x; player.z = 0;
    player.heading = Math.PI; player.dx = 0; player.dz = -1;
    player.root.position.set(player.x, 0, 0); player.root.rotation.y = Math.PI;
    player.runTime += state.speed * dt * Math.PI * 2 / (heroHeight * .45);
    player.runBlend = 1; player.moveSpeed = state.speed;
    player.body.position.y = Math.abs(Math.sin(player.runTime)) * .035 * heroScale;
    player.body.rotation.x = THREE.MathUtils.damp(player.body.rotation.x, -.05 - run.pace * .15, 8, dt);
    player.body.rotation.z = THREE.MathUtils.damp(player.body.rotation.z, (run.lanes[state.lane] - state.x) * -.055, 12, dt);
    animateHero(player.rig, player.runTime, 1);
    player.root.updateMatrixWorld(true);
    player.invulnerable = state.invulnerable;
    const firing = keys.has('Space') || keys.has('Fire') || touchControls.input.firing || player.tapTimer > 0;
    player.tapTimer = Math.max(0, player.tapTimer - dt);
    world.updateRunner(state);
    if (result.hits && !onDamage(result.hits)) return;
    seagulls.update(dt, player, { scroll: state.speed, attacks: !state.finished });
    if (!isPlaying()) return;
    onSpray(dt, firing, state.traffic);
    // Settle after spray damage so a hit on the finishing frame is counted.
    syncScore();
    onProgress(state.distance / run.length);
    medkits.update(dt, player, onCollect, state);
    player.invulnerable = state.invulnerable;
    player.model.material.opacity = state.invulnerable > 0 && Math.floor(state.elapsed * 18) % 2 === 0 ? .4 : 1;
    player.model.material.transparent = state.invulnerable > 0;
    cameraRig.frameRunner(run.pace, dt);
    if (state.finished) onFinish();
  }

  return {
    start, update, syncScore,
    get state() { return run.state; },
    dodge(direction) { run.dodge(direction); },
    sprayHit(id, impact) { return run.sprayHit(id, impact); },
    resetInput() { run.setThrottle(0); steering.reset(); },
  };
}
