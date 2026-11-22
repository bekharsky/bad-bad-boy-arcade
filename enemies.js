import * as THREE from 'three';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { enemyHealth } from './waves.js';
import { createGooseModel, gooseRig, animateGoose } from './goose.js';
import { paintFigure } from './world/painted-material.js';

let template;

function prepareTemplate(model, footprint) {
  const bounds = new THREE.Box3().setFromObject(model);
  const size = bounds.getSize(new THREE.Vector3());
  const scale = footprint / Math.max(size.x, size.z);
  const centre = bounds.getCenter(new THREE.Vector3());
  centre.y = bounds.min.y;
  return { model, scale, centre };
}

export function loadEnemyModels() {
  template ??= prepareTemplate(createGooseModel(), 1.5);
}

export function createEnemy(kind, level) {
  const hp = enemyHealth(kind, level);
  const model = clone(template.model);
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body); body.add(model);
  const materials = new Map();
  model.traverse(node => {
    if (!node.isMesh) return;
    node.castShadow = node.receiveShadow = true;
    if (node.isSkinnedMesh && !node.boundingSphere) node.frustumCulled = false;
    const copyMaterial = original => {
      if (!materials.has(original)) {
        const material = original.clone();
        material.metalness = 0;
        paintFigure(material);
        materials.set(original, material);
      }
      return materials.get(original);
    };
    node.material = Array.isArray(node.material) ? node.material.map(copyMaterial) : copyMaterial(node.material);
  });
  body.scale.setScalar(template.scale);
  model.position.sub(template.centre);
  return {
    root, body, model, kind, materials: [...materials.values()],
    goose: gooseRig(model), gait: Math.random() * Math.PI * 2,
    size: .47, hitHeight: .6 * template.scale, hp,
    speed: .88 + Math.random() * .14 + Math.min(level, 12) * .045,
    hit: 0, flashing: false, attack: Math.random() * .3, alive: true,
  };
}

export function animateEnemy(enemy, dt, _time, attacking, speed = enemy.speed) {
  animateGoose(enemy, dt, attacking, speed);
  const flashing = enemy.hit > 0;
  if (flashing === enemy.flashing) return;
  enemy.flashing = flashing;
  for (const material of enemy.materials) {
    material.emissive.set(flashing ? '#ffe58c' : '#000000');
    material.emissiveIntensity = flashing ? .7 : 0;
  }
}

export function disposeEnemy(enemy) {
  enemy.root.removeFromParent();
  const skeletons = new Set();
  enemy.model.traverse(node => { if (node.isSkinnedMesh) skeletons.add(node.skeleton); });
  for (const skeleton of skeletons) skeleton.dispose();
  // Geometry and textures belong to the templates and remain shared.
  for (const material of enemy.materials) material.dispose();
}
