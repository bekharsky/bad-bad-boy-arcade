import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { enemyHealth } from './waves.js';
import { createGooseModel, gooseRig, animateGoose } from './goose.js';

const templates = new Map();
const SLUG_MODEL_URL = new URL('./assets/enemies/slug.glb', import.meta.url).href;

export async function loadEnemyModels() {
  if (!templates.has('goose')) templates.set('goose', { scene: createGooseModel(), animations: [] });
  const loader = new GLTFLoader();
  const slug = await loader.loadAsync(SLUG_MODEL_URL);
  templates.set('slug', slug);
}

export function createEnemy(kind, level) {
  const source = templates.get(kind);
  if (!source) throw new Error(`Enemy model not loaded: ${kind}`);
  const model = clone(source.scene);
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body); body.add(model);
  const materials = new Map();
  model.traverse(node => {
    if (!node.isMesh) return;
    node.castShadow = node.receiveShadow = true;
    if (node.isSkinnedMesh) node.frustumCulled = false;
    const copyMaterial = original => {
      if (!materials.has(original)) {
        const material = original.clone();
        material.metalness = 0;
        materials.set(original, material);
      }
      return materials.get(original);
    };
    node.material = Array.isArray(node.material) ? node.material.map(copyMaterial) : copyMaterial(node.material);
  });
  model.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(model);
  const size = bounds.getSize(new THREE.Vector3());
  const scale = (kind === 'goose' ? 1.5 : 1.35) / Math.max(size.x, size.z);
  body.scale.setScalar(scale);
  const centre = bounds.getCenter(new THREE.Vector3());
  model.position.sub(new THREE.Vector3(centre.x, bounds.min.y, centre.z));
  const radius = kind === 'goose' ? .47 : .52;
  const mixer = source.animations.length ? new THREE.AnimationMixer(model) : null;
  const actions = {};
  if (mixer) {
    for (const clip of source.animations) actions[clip.name.split('_').at(-1).toLowerCase()] = mixer.clipAction(clip);
    actions.walk.play();
    mixer.setTime(Math.random());
  }
  return {
    root, body, model, kind, mixer, actions, state: 'walk', materials: [...materials.values()],
    goose: kind === 'goose' ? gooseRig(model) : null, gait: Math.random() * Math.PI * 2,
    size: radius, hitHeight: kind === 'goose' ? .6 * scale : size.y * scale * .52, baseScale: scale,
    hp: enemyHealth(kind, level),
    speed: 0.5 + Math.random() * 0.15 + Math.min(level, 12) * 0.035,
    hit: 0, attack: Math.random() * 0.5, alive: true, wobble: Math.random() * Math.PI * 2,
  };
}

export function animateEnemy(enemy, dt, time, attacking) {
  if (enemy.goose) animateGoose(enemy, dt, attacking);
  else if (enemy.mixer) {
    const state = attacking ? 'attack' : 'walk';
    if (state !== enemy.state) {
      enemy.actions[enemy.state].fadeOut(0.15);
      enemy.actions[state].reset().fadeIn(0.15).play();
      enemy.state = state;
    }
    enemy.mixer.update(dt * (attacking ? 1 : enemy.speed));
  } else {
    // The slug has no animation clips; its subtle pulse suggests crawling.
    enemy.body.scale.z = enemy.baseScale * (1 + Math.sin(time * 5 + enemy.wobble) * 0.025);
    enemy.body.rotation.z = Math.sin(time * 3 + enemy.wobble) * 0.025;
  }
  for (const material of enemy.materials) {
    material.emissive.set(enemy.hit > 0 ? '#ffe58c' : '#000000');
    material.emissiveIntensity = enemy.hit > 0 ? 0.7 : 0;
  }
}

export function disposeEnemy(enemy) {
  enemy.root.removeFromParent();
  enemy.mixer?.stopAllAction();
  enemy.mixer?.uncacheRoot(enemy.model);
  const skeletons = new Set();
  enemy.model.traverse(node => { if (node.isSkinnedMesh) skeletons.add(node.skeleton); });
  for (const skeleton of skeletons) skeleton.dispose();
  // Geometry and textures belong to the templates and remain shared.
  for (const material of enemy.materials) material.dispose();
}
