import * as THREE from 'three';

// One physical scale for every district; maps only choose the spawn position.
const HEIGHT = 12, DISTANCE = 15, LOOK_AHEAD = 9, LOOK_HEIGHT = 4;
const MOBILE_FOV = 65, MOBILE_FOOT_Y = .72;
const ARENA_FOCUS_HEIGHT = 1.7, ARENA_LEAD_SECONDS = .62, ARENA_MAX_LEAD = 2.2;
const ARENA_LEAD_RESPONSE = 3, ARENA_FOLLOW_FREQUENCY = 7.5;
const pitch = Math.atan2(HEIGHT - LOOK_HEIGHT, DISTANCE + LOOK_AHEAD);

export function createGameCamera() {
  const camera = new THREE.PerspectiveCamera(56, 1, .1, 150);
  const target = new THREE.Vector3();
  const lead = new THREE.Vector2(), desiredLead = new THREE.Vector2();
  const velocity = new THREE.Vector2();
  const displacement = new THREE.Vector2(), correction = new THREE.Vector2();
  let baseFov = 56;
  let viewportWidth = 1, viewportHeight = 1, mobileFraming = false;
  let arenaFraming = false;

  function updateProjection() {
    if (arenaFraming || mobileFraming) {
      // Shift the lens to frame the hero without changing the viewing angle.
      const height = HEIGHT - (arenaFraming ? ARENA_FOCUS_HEIGHT : 0);
      const viewY = -height * Math.cos(pitch) + DISTANCE * Math.sin(pitch);
      const depth = height * Math.sin(pitch) + DISTANCE * Math.cos(pitch);
      const screenY = .5 - viewY / (2 * depth * Math.tan(camera.fov * Math.PI / 360));
      const anchorY = arenaFraming ? .5 : MOBILE_FOOT_Y;
      camera.setViewOffset(viewportWidth, viewportHeight, 0, (screenY - anchorY) * viewportHeight, viewportWidth, viewportHeight);
    } else if (camera.view?.enabled) camera.clearViewOffset();
    else camera.updateProjectionMatrix();
  }

  function followArena(dt) {
    // Critical damping carries the camera's velocity through a new target,
    // including sudden reversals, without bouncing around a resting hero.
    const rate = ARENA_FOLLOW_FREQUENCY;
    const decay = Math.exp(-rate * dt);
    displacement.set(camera.position.x - target.x, camera.position.z - target.z);
    correction.copy(velocity).addScaledVector(displacement, rate).multiplyScalar(dt);
    camera.position.set(
      target.x + (displacement.x + correction.x) * decay,
      HEIGHT,
      target.z + (displacement.y + correction.y) * decay,
    );
    velocity.addScaledVector(correction, -rate).multiplyScalar(decay);
  }

  function frame(x, z, dt, instant = false, pace = 0, arena = false) {
    const framingChanged = arenaFraming !== arena;
    arenaFraming = arena;
    target.set(x, HEIGHT, z + DISTANCE);
    if (instant) camera.position.copy(target);
    else if (arena) followArena(dt);
    else camera.position.lerp(target, 1 - Math.exp(-2.5 * dt));
    camera.lookAt(camera.position.x, LOOK_HEIGHT, camera.position.z - DISTANCE - LOOK_AHEAD);
    if (instant) camera.updateMatrixWorld();
    // Follow achieved speed, not a key press. Braking closes the view slightly;
    // boosting opens the peripheral street without camera shake or blur.
    const fov = baseFov + Math.max(-1, Math.min(1, pace)) * (pace < 0 ? 8 : 12);
    const nextFov = instant ? fov : THREE.MathUtils.damp(camera.fov, fov, 6, dt);
    const lensChanged = Math.abs(nextFov - camera.fov) > .001;
    if (lensChanged) camera.fov = nextFov;
    if (framingChanged || lensChanged) updateProjection();
  }

  function frameArena(x, z, dt, { dx = 0, dz = 0, instant = false } = {}) {
    if (instant) {
      lead.set(0, 0);
      velocity.set(0, 0);
    } else if (dt > 0) {
      // Use the distance actually travelled so pushing into a wall recentres.
      const scale = ARENA_LEAD_SECONDS / dt;
      desiredLead.set(dx * scale, dz * scale).clampLength(0, ARENA_MAX_LEAD);
      lead.lerp(desiredLead, 1 - Math.exp(-ARENA_LEAD_RESPONSE * dt));
    }
    frame(x + lead.x, z + lead.y, dt, instant, 0, true);
  }
  return {
    camera,
    resize(width, height, coarsePointer = false) {
      camera.aspect = width / height;
      viewportWidth = width; viewportHeight = height;
      mobileFraming = coarsePointer || width <= 680;
      const offset = camera.fov - baseFov;
      baseFov = mobileFraming ? MOBILE_FOV : 56;
      camera.fov = baseFov + offset;
      updateProjection();
    },
    frame,
    frameArena,
    frameRunner(pace, dt, instant = false) { frame(0, 0, dt, instant, pace); },
  };
}
