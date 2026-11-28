import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const MODEL_URL = new URL('../assets/renault-duster.glb', import.meta.url);
const PAINT_COLOR = '#153b68';
const PAINT_MATERIALS = new Set(['Material#4', 'PaletteMaterial005']);
const MODEL_SCALE = new THREE.Vector3(.75, .9, .81);
const MODEL_YAW = Math.PI; // The source model points down -Z; the map model points +Z.
const MODEL_HALF_LENGTH = 5.325 * MODEL_SCALE.z / 2;
const MODEL_HALF_WIDTH = 2.48 * MODEL_SCALE.x / 2;
const MODEL_HEIGHT = 1.91 * MODEL_SCALE.y;

let modelPromise;

export function prepareDaciaDuster() {
  if (!modelPromise) {
    modelPromise = (async () => {
      const [{ MeshoptDecoder }] = await Promise.all([import('meshoptimizer/decoder')]);
      const loader = new GLTFLoader();
      loader.setMeshoptDecoder(MeshoptDecoder);
      const gltf = await loader.loadAsync(MODEL_URL.href);
      return gltf.scene;
    })();
  }
  return modelPromise;
}

function cloneModel(source) {
  const model = source.clone(true);
  const materialCopies = new Map();
  const paintMaterials = [];

  function copyMaterial(material) {
    if (!material) return material;
    if (!PAINT_MATERIALS.has(material.name)) return material;
    if (materialCopies.has(material)) return materialCopies.get(material);
    const copy = material.clone();
    materialCopies.set(material, copy);
    if (copy.name === 'Material#4') {
      copy.color.set(PAINT_COLOR);
      copy.roughness = .58;
      copy.metalness = .08;
    }
    paintMaterials.push({ material: copy, emissive: copy.emissive.clone(), intensity: copy.emissiveIntensity });
    return copy;
  }

  model.traverse(node => {
    if (!node.isMesh) return;
    node.material = Array.isArray(node.material)
      ? node.material.map(copyMaterial)
      : copyMaterial(node.material);
  });

  const bounds = new THREE.Box3().setFromObject(model);
  const center = bounds.getCenter(new THREE.Vector3());
  model.position.set(-center.x, -bounds.min.y, -center.z);

  const placement = new THREE.Group();
  placement.name = 'Dacia Duster model placement';
  placement.rotation.y = MODEL_YAW;
  placement.scale.copy(MODEL_SCALE);
  placement.add(model);
  return { placement, paintMaterials };
}

export function createDaciaDuster(parent, { x = 7, z = -14.5, rotation = Math.PI / 2 } = {}) {
  const root = new THREE.Group();
  root.name = 'Dacia Duster';
  root.position.set(x, 0, z);
  root.rotation.y = rotation;
  parent.add(root);

  const sideways = Math.abs(Math.sin(rotation)) > .5;
  const collider = {
    minX: x - (sideways ? MODEL_HALF_LENGTH : MODEL_HALF_WIDTH),
    maxX: x + (sideways ? MODEL_HALF_LENGTH : MODEL_HALF_WIDTH),
    minZ: z - (sideways ? MODEL_HALF_WIDTH : MODEL_HALF_LENGTH),
    maxZ: z + (sideways ? MODEL_HALF_WIDTH : MODEL_HALF_LENGTH),
    height: MODEL_HEIGHT + .03,
  };
  const target = {
    kind: 'dacia-duster', root, x, z, size: 2.1, hitHeight: MODEL_HEIGHT * .54,
    hp: 28, maxHp: 28, nextJetHit: 0, age: 1, alive: true, airborne: false, hit: 0,
    collider, paintMaterials: [], modelRoot: null,
    attachModel(source) {
      if (target.modelRoot || !root.parent || !target.alive) return;
      const instance = cloneModel(source);
      target.modelRoot = instance.placement;
      target.paintMaterials = instance.paintMaterials;
      root.add(target.modelRoot);
    },
    update(dt) {
      target.hit = Math.max(0, target.hit - dt);
      const flashing = target.hit > 0;
      for (const paint of target.paintMaterials) {
        if (flashing) {
          paint.material.emissive.set('#f5d48c');
          paint.material.emissiveIntensity = .38;
        } else {
          paint.material.emissive.copy(paint.emissive);
          paint.material.emissiveIntensity = paint.intensity;
        }
      }
    },
    reset() {
      target.hp = target.maxHp;
      target.nextJetHit = 0;
      target.hit = 0;
      target.alive = true;
      root.visible = true;
      target.update(0);
    },
  };

  if (modelPromise) {
    modelPromise.then(source => target.attachModel(source), error => {
      console.warn('Could not load the Renault Duster model:', error);
    });
  } else {
    prepareDaciaDuster().then(source => target.attachModel(source), error => {
      console.warn('Could not load the Renault Duster model:', error);
    });
  }

  return target;
}
