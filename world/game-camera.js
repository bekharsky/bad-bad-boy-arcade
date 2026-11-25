import * as THREE from 'three';

const RUNNER_VIEW = { height: 12, distance: 15, pitch: Math.atan2(8, 24) };
const MENU_VIEW = { ...RUNNER_VIEW, heroAnchorY: .5 };
const ARENA_VIEW = {
  height: 18, distance: 15, pitch: THREE.MathUtils.degToRad(35), lensScale: .86,
  heroAnchorY: .55, mobileHeroAnchorY: .5,
};
const ARENA_OPENING_VIEW = {
  ...ARENA_VIEW, pitch: THREE.MathUtils.degToRad(20), lensScale: 1.35,
  heroAnchorY: .68, mobileHeroAnchorY: .6,
};
const MOBILE_FOV = 65, MOBILE_FOOT_Y = .72;
const ARENA_FOCUS_HEIGHT = 1.7, ARENA_LEAD_SECONDS = .62, ARENA_MAX_LEAD = 2.2;
const ARENA_LEAD_RESPONSE = 3, ARENA_FOLLOW_FREQUENCY = 7.5;
const ARENA_OPENING_SECONDS = 1.2;

function lensForView(fov, view) {
  if (!view.lensScale) return fov;
  return Math.atan(Math.tan(fov * Math.PI / 360) * view.lensScale) * 360 / Math.PI;
}

export function createGameCamera() {
  const camera = new THREE.PerspectiveCamera(56, 1, .1, 150);
  const target = new THREE.Vector3();
  const lead = new THREE.Vector2(), desiredLead = new THREE.Vector2();
  const velocity = new THREE.Vector2();
  const displacement = new THREE.Vector2(), correction = new THREE.Vector2();
  const arenaView = { ...ARENA_OPENING_VIEW };
  let openingProgress = 0;
  let baseFov = 56;
  let viewportWidth = 1, viewportHeight = 1, mobileFraming = false;
  let currentView = RUNNER_VIEW;

  function updateProjection() {
    const { height, distance, pitch, heroAnchorY, mobileHeroAnchorY } = currentView;
    if (heroAnchorY !== undefined || mobileFraming) {
      // Shift the lens to frame the hero without changing the viewing angle.
      const focusDrop = height - (heroAnchorY !== undefined ? ARENA_FOCUS_HEIGHT : 0);
      const viewY = -focusDrop * Math.cos(pitch) + distance * Math.sin(pitch);
      const depth = focusDrop * Math.sin(pitch) + distance * Math.cos(pitch);
      const screenY = .5 - viewY / (2 * depth * Math.tan(camera.fov * Math.PI / 360));
      const anchorY = (mobileFraming ? mobileHeroAnchorY : undefined) ?? heroAnchorY ?? MOBILE_FOOT_Y;
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
      target.y,
      target.z + (displacement.y + correction.y) * decay,
    );
    velocity.addScaledVector(correction, -rate).multiplyScalar(decay);
  }

  function frame(x, z, dt, instant = false, pace = 0, view = RUNNER_VIEW, blending = false) {
    const framingChanged = currentView !== view;
    currentView = view;
    target.set(x, view.height, z + view.distance);
    if (instant) camera.position.copy(target);
    else if (view === arenaView) followArena(dt);
    else camera.position.lerp(target, 1 - Math.exp(-2.5 * dt));
    camera.rotation.set(-view.pitch, 0, 0);
    if (instant) camera.updateMatrixWorld();
    // Follow achieved speed, not a key press. Braking closes the view slightly;
    // boosting opens the peripheral street without camera shake or blur.
    const fov = lensForView(baseFov, view) + Math.max(-1, Math.min(1, pace)) * (pace < 0 ? 8 : 12);
    const nextFov = instant || framingChanged || blending ? fov : THREE.MathUtils.damp(camera.fov, fov, 6, dt);
    const lensChanged = Math.abs(nextFov - camera.fov) > .001;
    if (lensChanged) camera.fov = nextFov;
    if (instant || framingChanged || lensChanged || blending) updateProjection();
  }

  function frameArena(x, z, dt, { dx = 0, dz = 0, instant = false } = {}) {
    if (instant) {
      lead.set(0, 0);
      velocity.set(0, 0);
      Object.assign(arenaView, ARENA_OPENING_VIEW);
      openingProgress = 0;
    } else if (dt > 0) {
      // Use the distance actually travelled so pushing into a wall recentres.
      const scale = ARENA_LEAD_SECONDS / dt;
      desiredLead.set(dx * scale, dz * scale).clampLength(0, ARENA_MAX_LEAD);
      lead.lerp(desiredLead, 1 - Math.exp(-ARENA_LEAD_RESPONSE * dt));
    }
    // The first movement commits to the gameplay view, even if the hero stops again.
    const blending = !instant && dt > 0 && openingProgress < 1 && (openingProgress > 0 || dx !== 0 || dz !== 0);
    if (blending) {
      openingProgress = Math.min(1, openingProgress + dt / ARENA_OPENING_SECONDS);
      const blend = THREE.MathUtils.smootherstep(openingProgress, 0, 1);
      const { lerp } = THREE.MathUtils;
      arenaView.pitch = lerp(ARENA_OPENING_VIEW.pitch, ARENA_VIEW.pitch, blend);
      arenaView.lensScale = lerp(ARENA_OPENING_VIEW.lensScale, ARENA_VIEW.lensScale, blend);
      arenaView.heroAnchorY = lerp(ARENA_OPENING_VIEW.heroAnchorY, ARENA_VIEW.heroAnchorY, blend);
      arenaView.mobileHeroAnchorY = lerp(ARENA_OPENING_VIEW.mobileHeroAnchorY, ARENA_VIEW.mobileHeroAnchorY, blend);
    }
    frame(x + lead.x, z + lead.y, dt, instant, 0, arenaView, blending);
  }
  return {
    camera,
    resize(width, height, coarsePointer = false) {
      camera.aspect = width / height;
      viewportWidth = width; viewportHeight = height;
      mobileFraming = coarsePointer || width <= 680;
      const offset = camera.fov - lensForView(baseFov, currentView);
      baseFov = mobileFraming ? MOBILE_FOV : 56;
      camera.fov = lensForView(baseFov, currentView) + offset;
      updateProjection();
    },
    frame,
    frameArena,
    frameMenu(x, z) { frame(x, z, 0, true, 0, MENU_VIEW); },
    frameRunner(pace, dt, instant = false) { frame(0, 0, dt, instant, pace); },
  };
}
