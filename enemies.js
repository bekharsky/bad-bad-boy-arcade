import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { enemyHealth } from './waves.js';
import { createGooseModel, gooseRig, animateGoose } from './goose.js';
import { paintFigure } from './world/painted-material.js';

const templates = new Map();
const SLUG_MODEL_URL = new URL('./assets/enemies/slug.glb', import.meta.url).href;

function prepareTemplate(source, footprint) {
  const bounds = new THREE.Box3().setFromObject(source.scene);
  const size = bounds.getSize(new THREE.Vector3());
  const scale = footprint / Math.max(size.x, size.z);
  const centre = bounds.getCenter(new THREE.Vector3());
  centre.y = bounds.min.y;
  return { scene: source.scene, animations: source.animations, scale, centre, height: size.y * scale };
}

export async function loadEnemyModels() {
  if (!templates.has('goose')) templates.set('goose', prepareTemplate({ scene: createGooseModel(), animations: [] }, 1.5));
  const loader = new GLTFLoader();
  const slug = await loader.loadAsync(SLUG_MODEL_URL);
  templates.set('slug', prepareTemplate(slug, 1.35));
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
  body.scale.setScalar(source.scale);
  model.position.sub(source.centre);
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
    size: radius, hitHeight: kind === 'goose' ? .6 * source.scale : source.height * .52, baseScale: source.scale,
    hp: enemyHealth(kind, level),
    speed: 0.5 + Math.random() * 0.15 + Math.min(level, 12) * 0.035,
    hit: 0, flashing: false, attack: Math.random() * 0.5, alive: true, wobble: Math.random() * Math.PI * 2,
  };
}

export function animateEnemy(enemy, dt, _time, attacking, speed = enemy.speed) {
  if (enemy.goose) animateGoose(enemy, dt, attacking, speed);
  else if (enemy.mixer) {
    const state = attacking ? 'attack' : 'walk';
    if (state !== enemy.state) {
      enemy.actions[enemy.state].fadeOut(0.15);
      enemy.actions[state].reset().fadeIn(0.15).play();
      enemy.state = state;
    }
    enemy.mixer.update(dt * (attacking ? 1 : speed));
  } else {
    // The slug has no animation clips; its subtle pulse suggests crawling.
    enemy.wobble += dt * (2.5 + speed * 4);
    enemy.body.scale.z = enemy.baseScale * (1 + Math.sin(enemy.wobble) * .025);
    enemy.body.rotation.z = Math.sin(enemy.wobble + .8) * .025;
  }
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
  enemy.mixer?.stopAllAction();
  enemy.mixer?.uncacheRoot(enemy.model);
  const skeletons = new Set();
  enemy.model.traverse(node => { if (node.isSkinnedMesh) skeletons.add(node.skeleton); });
  for (const skeleton of skeletons) skeleton.dispose();
  // Geometry and textures belong to the templates and remain shared.
  for (const material of enemy.materials) material.dispose();
}
