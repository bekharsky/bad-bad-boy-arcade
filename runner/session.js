import * as THREE from 'three';
import { animateHero } from '../hero.js';
import { smoothTouchHeading } from '../movement.js';
import { createRunnerRun } from './course.js';
import { createLaneSteering, runnerThrottle } from './runner-input.js';

// Owns the runner's simulation and presentation. The game shell supplies only
// cross-mode effects (health, spray, and campaign transitions).
export function createRunnerSession({
  world, player, cameraRig, seagulls, medkits, touchControls, keys,
  heroHeight, heroScale, isPlaying, onDamage, onImpact, onCrash, onSpray, onCollect,
  onProgress, onFinish,
}) {
  let run = createRunnerRun(), lastPresented = 0, lastHitStop = 0;
  const steering = createLaneSteering(direction => run.dodge(direction));

  function start(definition) {
    run = createRunnerRun(definition);
    player.invulnerable = 0;
    steering.reset();
    lastPresented = -1;
    present();
  }

  function present() {
    if (lastPresented === run.state.elapsed && lastHitStop === run.state.hitStop) return;
    lastPresented = run.state.elapsed;
    lastHitStop = run.state.hitStop;
    world.updateRunner(run.state, cameraRig.camera?.position);
    // Update the reward and HUD after simulation and spray, once per frame.
    onProgress(run.state.distance / run.length, run.state.traffic);
  }

  function update(dt) {
    steering.update(touchControls.input.x, dt);
    run.setThrottle(runnerThrottle(keys, touchControls.input.z));
    const result = run.update(dt), state = run.state;
    player.x = state.x; player.z = 0;
    const { aimX, aimZ } = touchControls.input;
    const tapHeading = player.tapTimer > 0 ? player.touchTapHeading : null;
    const targetHeading = aimX || aimZ ? Math.atan2(aimX, aimZ) : touchControls.aimHeading ?? tapHeading ?? Math.PI;
    player.heading = smoothTouchHeading(player.heading, targetHeading, dt);
    player.dx = Math.sin(player.heading); player.dz = Math.cos(player.heading);
    player.root.position.set(player.x, 0, 0); player.root.rotation.y = player.heading;
    const stopped = result.crash || state.hitStop > 0;
    player.moveSpeed = stopped ? 0 : state.speed;
    player.runTime += player.moveSpeed * dt * Math.PI * 2 / (heroHeight * .45);
    player.runBlend = stopped ? 0 : 1;
    player.body.position.y = Math.abs(Math.sin(player.runTime)) * .035 * heroScale * player.runBlend;
    player.body.rotation.x = THREE.MathUtils.damp(player.body.rotation.x, -.05 - run.pace * .15, 8, dt);
    player.body.rotation.z = THREE.MathUtils.damp(player.body.rotation.z, (run.lanes[state.lane] - state.x) * -.055, 12, dt);
    animateHero(player.rig, player.runTime, player.runBlend, Math.PI - player.heading);
    player.root.updateMatrixWorld(true);
    player.invulnerable = state.invulnerable;
    const firing = keys.has('Space') || keys.has('Fire') || touchControls.input.firing || player.tapTimer > 0;
    for (const impact of result.impacts) onImpact(impact, impact === result.crash);
    if (result.crash) { onCrash(); return; }
    if (result.hits && !onDamage(result.hits)) return;
    const busyCrossing = state.crossings.some(crossing => crossing.phase === 'warning' || crossing.phase === 'crossing');
    seagulls.update(dt, player, { scroll: player.moveSpeed, attacks: !state.finished && !busyCrossing });
    if (!isPlaying()) return;
    onSpray(dt, firing, state.traffic);
    player.tapTimer = Math.max(0, player.tapTimer - dt);
    medkits.update(dt, player, onCollect, state);
    player.invulnerable = state.invulnerable;
    player.model.material.opacity = state.invulnerable > 0 && Math.floor(state.elapsed * 18) % 2 === 0 ? .4 : 1;
    player.model.material.transparent = state.invulnerable > 0;
    cameraRig.frameRunner(run.pace, dt);
    if (state.finished) onFinish();
  }

  return {
    start, update, present,
    get state() { return run.state; },
    dodge(direction) { run.dodge(direction); },
    sprayHit(id, impact) { return run.sprayHit(id, impact); },
    resetInput() { run.setThrottle(0); steering.reset(); },
  };
}
