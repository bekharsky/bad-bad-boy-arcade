import * as THREE from 'three';

export function createBuildingVisibility(buildings) {
  const sightRay = new THREE.Ray();
  const intersection = new THREE.Vector3();
  const cameraRight = new THREE.Vector3();
  const heroPosition = new THREE.Vector3();
  const sightTargets = Array.from({ length: 5 }, () => new THREE.Vector3());
  let visibilityTime = 0;
  function updateVisibility(camera, hero, height, dt) {
    visibilityTime += dt;
    camera.updateMatrixWorld();
    hero.getWorldPosition(heroPosition);
    cameraRight.setFromMatrixColumn(camera.matrixWorld, 0);
    const samples = [[0, 0.12], [0, 0.5], [0, 0.9], [-0.19, 0.6], [0.19, 0.6]];
    samples.forEach(([side, y], i) => {
      sightTargets[i].copy(heroPosition).addScaledVector(cameraRight, side * height);
      sightTargets[i].y += y * height;
    });
    for (const house of buildings) {
      const occluded = sightTargets.some(target => {
        sightRay.origin.copy(camera.position);
        sightRay.direction.copy(target).sub(camera.position).normalize();
        return sightRay.intersectBox(house.bounds, intersection) !== null && intersection.distanceToSquared(camera.position) < target.distanceToSquared(camera.position) - 0.01;
      });
      if (occluded) house.hiddenUntil = visibilityTime + 0.15;
      const target = occluded || visibilityTime < house.hiddenUntil ? 0.12 : 1;
      let opacity = THREE.MathUtils.damp(house.opacity, target, 14, dt);
      if (Math.abs(opacity - target) < 0.003) opacity = target;
      if (Math.abs(opacity - house.opacity) < 0.00001) continue;
      house.opacity = opacity;
      for (const material of house.materials) {
        const transparent = opacity < 1;
        if (material.transparent !== transparent) { material.transparent = transparent; material.needsUpdate = true; }
        material.opacity = opacity;
        material.depthWrite = !transparent;
      }
      for (const mesh of house.meshes) mesh.castShadow = opacity > 0.98;
    }
  }

  function reset() {
    visibilityTime = 0;
    for (const house of buildings) {
      house.opacity = 1;
      house.hiddenUntil = 0;
      for (const material of house.materials) {
        if (material.transparent) { material.transparent = false; material.needsUpdate = true; }
        material.opacity = 1;
        material.depthWrite = true;
      }
      for (const mesh of house.meshes) mesh.castShadow = true;
    }
  }
  return { update: updateVisibility, reset };
}
