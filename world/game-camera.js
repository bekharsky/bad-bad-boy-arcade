import * as THREE from 'three';

// One physical scale for every district; maps only choose the spawn position.
const HEIGHT = 12, DISTANCE = 15, LOOK_AHEAD = 9, LOOK_HEIGHT = 4;
const MOBILE_FOV = 65, MOBILE_FOOT_Y = .72;
const pitch = Math.atan2(HEIGHT - LOOK_HEIGHT, DISTANCE + LOOK_AHEAD);
const footUp = -HEIGHT * Math.cos(pitch) + DISTANCE * Math.sin(pitch);
const footDepth = HEIGHT * Math.sin(pitch) + DISTANCE * Math.cos(pitch);

export function createGameCamera() {
  const camera = new THREE.PerspectiveCamera(56, 1, .1, 150);
  const target = new THREE.Vector3();
  let baseFov = 56;
  let viewportWidth = 1, viewportHeight = 1, mobileFraming = false;

  function updateProjection() {
    if (mobileFraming) {
      // Shift the lens towards the ground rather than moving the hero. Keep
      // the feet above the touch controls even as runner speed changes FOV.
      const footY = .5 - footUp / (2 * footDepth * Math.tan(camera.fov * Math.PI / 360));
      camera.setViewOffset(viewportWidth, viewportHeight, 0, (footY - MOBILE_FOOT_Y) * viewportHeight, viewportWidth, viewportHeight);
    } else if (camera.view?.enabled) camera.clearViewOffset();
    else camera.updateProjectionMatrix();
  }
  function frame(x, z, dt, instant = false, pace = 0) {
    target.set(x, HEIGHT, z + DISTANCE);
    if (instant) camera.position.copy(target);
    else camera.position.lerp(target, 1 - Math.exp(-2.5 * dt));
    camera.lookAt(camera.position.x, LOOK_HEIGHT, camera.position.z - DISTANCE - LOOK_AHEAD);
    // Follow achieved speed, not a key press. Braking closes the view slightly;
    // boosting opens the peripheral street without camera shake or blur.
    const fov = baseFov + Math.max(-1, Math.min(1, pace)) * (pace < 0 ? 8 : 12);
    const nextFov = instant ? fov : THREE.MathUtils.damp(camera.fov, fov, 6, dt);
    if (Math.abs(nextFov - camera.fov) > .001) { camera.fov = nextFov; updateProjection(); }
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
    frameRunner(pace, dt) { frame(0, 0, dt, false, pace); },
  };
}
