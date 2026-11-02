import * as THREE from 'three';

// Register only after attaching all facade details. Each building must own its
// materials so fading it cannot change a neighbouring house.
export function registerBuilding(group) {
  group.updateWorldMatrix(true, true);
  const meshes = [], materials = new Set();
  group.traverse(node => {
    if (!node.isMesh) return;
    meshes.push(node);
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) materials.add(material);
  });
  return { group, meshes, materials: [...materials], opacity: 1, hiddenUntil: 0, bounds: new THREE.Box3().setFromObject(group).expandByScalar(.06) };
}

export function createBuildingVisibility(buildings) {
  const samples = [[0, 0.12], [0, 0.5], [0, 0.9], [-0.19, 0.6], [0.19, 0.6]];
  const sightRays = samples.map(() => new THREE.Ray());
  const sightDistances = samples.map(() => 0);
  const intersection = new THREE.Vector3();
  const cameraRight = new THREE.Vector3();
  const heroPosition = new THREE.Vector3();
  const sightTargets = samples.map(() => new THREE.Vector3());
  let visibilityTime = 0;
  function updateVisibility(camera, hero, height, dt) {
    visibilityTime += dt;
    camera.updateMatrixWorld();
    hero.getWorldPosition(heroPosition);
    cameraRight.setFromMatrixColumn(camera.matrixWorld, 0);
    samples.forEach(([side, y], i) => {
      sightTargets[i].copy(heroPosition).addScaledVector(cameraRight, side * height);
      sightTargets[i].y += y * height;
      sightRays[i].origin.copy(camera.position);
      sightRays[i].direction.copy(sightTargets[i]).sub(camera.position).normalize();
      sightDistances[i] = sightTargets[i].distanceToSquared(camera.position) - 0.01;
    });
    for (const house of buildings) {
      const occluded = sightRays.some((ray, i) => {
        return ray.intersectBox(house.bounds, intersection) !== null && intersection.distanceToSquared(camera.position) < sightDistances[i];
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
