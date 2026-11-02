import * as THREE from 'three';

// One physical scale for every district; maps only choose the spawn position.
const HEIGHT = 12, DISTANCE = 15, LOOK_AHEAD = 9, LOOK_HEIGHT = 4;

export function createGameCamera() {
  const camera = new THREE.PerspectiveCamera(56, 1, .1, 150);
  const target = new THREE.Vector3();
  let baseFov = 56;
  function frame(x, z, dt, instant = false, pace = 0) {
    target.set(x, HEIGHT, z + DISTANCE);
    if (instant) camera.position.copy(target);
    else camera.position.lerp(target, 1 - Math.exp(-2.5 * dt));
    camera.lookAt(camera.position.x, LOOK_HEIGHT, camera.position.z - DISTANCE - LOOK_AHEAD);
    // Follow achieved speed, not a key press. Braking closes the view slightly;
    // boosting opens the peripheral street without camera shake or blur.
    const fov = baseFov + Math.max(-1, Math.min(1, pace)) * (pace < 0 ? 8 : 12);
    const nextFov = instant ? fov : THREE.MathUtils.damp(camera.fov, fov, 6, dt);
    if (Math.abs(nextFov - camera.fov) > .001) { camera.fov = nextFov; camera.updateProjectionMatrix(); }
  }
  return {
    camera,
    resize(width, height, coarsePointer = false) {
      camera.aspect = width / height;
      const offset = camera.fov - baseFov;
      baseFov = coarsePointer || width <= 680 ? 58 : 56;
      camera.fov = baseFov + offset;
      camera.updateProjectionMatrix();
    },
    frame,
    frameRunner(pace, dt) { frame(0, 0, dt, false, pace); },
  };
}
