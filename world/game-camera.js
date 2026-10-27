import * as THREE from 'three';

// One physical scale for every district; maps only choose the spawn position.
const HEIGHT = 12, DISTANCE = 15, LOOK_AHEAD = 9, LOOK_HEIGHT = 4;

export function createGameCamera() {
  const camera = new THREE.PerspectiveCamera(56, 1, .1, 150);
  const target = new THREE.Vector3();
  return {
    camera,
    resize(width, height, coarsePointer = false) {
      camera.aspect = width / height;
      camera.fov = coarsePointer || width <= 680 ? 58 : 56;
      camera.updateProjectionMatrix();
    },
    frame(x, z, dt, instant = false) {
      target.set(x, HEIGHT, z + DISTANCE);
      if (instant) camera.position.copy(target);
      else camera.position.lerp(target, 1 - Math.exp(-2.5 * dt));
      camera.lookAt(camera.position.x, LOOK_HEIGHT, camera.position.z - DISTANCE - LOOK_AHEAD);
    },
  };
}
