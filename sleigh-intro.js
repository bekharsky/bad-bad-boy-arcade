import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { harborMap } from './maps/harbor.js';
import { senateSquareMap } from './maps/senate-square.js';
import { createJoulupukki } from './models/joulupukki.js';
import { createSceneryModel } from './maps/scenery-model.js';
import { createBurstEffects } from './burst-effects.js';
import { disposeObject } from './world/dispose.js';

const { lerp, smoothstep } = THREE.MathUtils;
const IMPACT = 4.18, BREAK = 4.8;
const FLIGHT_RATE = .78;
const DRONE_SCALE = .76, ROTOR_OFFSET = 1.15, ROTOR_HEIGHT = .30, BLADE_LENGTH = 1.14;
const debrisVelocity = [
  [-5.1, .75, 1.75], [5.7, 1.45, 3.8], [-2.7, -2.35, -2.6],
  [2.45, -.45, 5.1], [3.7, 2.05, -3.5], [-4.3, 2.65, -5.6],
];

function fadeMaterials(model) {
  const materials = new Set();
  model.traverse(node => {
    if (!node.isMesh) return;
    node.material.transparent = true;
    materials.add(node.material);
  });
  return materials;
}

function fadeModel(model, materials, opacity) {
  model.visible = opacity > 0;
  for (const material of materials) {
    material.opacity = opacity;
    material.depthWrite = opacity === 1;
  }
}

function createIntroDrone() {
  const frame = createSceneryModel('Delivery drone');
  frame.box('#465264', 0, 0, 0, 1.52, .48, 1.08);
  frame.box('#b8cad6', 0, .18, 0, 1.30, .19, .89);
  frame.box('#d67549', 0, -.35, .04, 1.20, .33, .91);
  for (const yaw of [-Math.PI / 4, Math.PI / 4]) {
    frame.box('#718596', 0, .02, 0, .13, .15, 3.48, yaw);
  }
  const root = frame.finish();
  root.scale.setScalar(DRONE_SCALE);
  const rotors = [];
  const motorMaterial = new THREE.MeshStandardMaterial({ color: '#9fafba', metalness: .45 });
  const motor = new THREE.CylinderGeometry(.19, .22, .23, 10);
  const blade = new THREE.BoxGeometry(.17, .039, BLADE_LENGTH);
  const bladeMaterial = new THREE.MeshStandardMaterial({ color: '#c5d1e4', roughness: .45 });
  const light = new THREE.SphereGeometry(.093, 8, 6);
  const red = new THREE.MeshBasicMaterial({ color: '#ff473b' });
  const white = new THREE.MeshBasicMaterial({ color: '#a3ebff' });
  for (const x of [-ROTOR_OFFSET, ROTOR_OFFSET]) for (const z of [-ROTOR_OFFSET, ROTOR_OFFSET]) {
    const housing = new THREE.Mesh(motor, motorMaterial);
    housing.position.set(x, .16, z);
    const propeller = new THREE.Mesh(blade, bladeMaterial);
    propeller.position.set(x, ROTOR_HEIGHT, z);
    const lamp = new THREE.Mesh(light, z > 0 ? red : white);
    lamp.position.set(x, .03, z);
    root.add(housing, propeller, lamp);
    rotors.push(propeller);
  }
  return { root, rotors, materials: fadeMaterials(root) };
}

function createFadingPieces(sources, parent, centers) {
  return sources.map(({ model }, index) => {
    const ownedMaterials = new Map();
    model.traverse(node => {
      if (!node.isMesh) return;
      if (!ownedMaterials.has(node.material)) ownedMaterials.set(node.material, node.material.clone());
      node.material = ownedMaterials.get(node.material);
    });
    const center = centers?.[index] ?? new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3());
    model.position.sub(center);
    const pivot = new THREE.Group();
    pivot.add(model);
    parent.add(pivot);
    return { pivot, center, velocity: debrisVelocity[index], materials: fadeMaterials(model) };
  });
}

function disposeFadingPieces(pieces) {
  for (const { pivot, materials } of pieces) {
    pivot.removeFromParent();
    for (const material of materials) material.dispose();
  }
}

function addWitnessHeadBone(model) {
  const originalSkeleton = model.skeleton;
  const bodyIndex = originalSkeleton?.bones.findIndex(bone => bone.name === 'body') ?? -1;
  if (bodyIndex < 0) return null;

  const headBone = new THREE.Bone();
  headBone.name = 'witness-head';
  headBone.position.y = 1.02;
  originalSkeleton.bones[bodyIndex].add(headBone);

  // Extend the original bind pose. Skinning uses it for both vertices and normals.
  headBone.updateMatrix();
  const headInverse = headBone.matrix.clone().invert().multiply(originalSkeleton.boneInverses[bodyIndex]);
  const headIndex = originalSkeleton.bones.length;
  model.bind(new THREE.Skeleton(
    [...originalSkeleton.bones, headBone],
    [...originalSkeleton.boneInverses, headInverse],
  ), model.bindMatrix);
  originalSkeleton.dispose();

  const positions = model.geometry.getAttribute('position');
  const skinIndices = model.geometry.getAttribute('skinIndex');
  const skinWeights = model.geometry.getAttribute('skinWeight');
  for (let i = 0; i < positions.count; i++) {
    const offset = i * 4;
    if (skinIndices.array[offset] !== bodyIndex) continue;
    const influence = smoothstep(positions.getY(i), .98, 1.27);
    const transferred = skinWeights.array[offset] * influence;
    if (transferred <= .001) continue;
    skinWeights.array[offset] -= transferred;
    skinIndices.array[offset + 1] = headIndex;
    skinWeights.array[offset + 1] = transferred;
  }
  skinIndices.needsUpdate = true;
  skinWeights.needsUpdate = true;

  return headBone;
}

function addSky(scene) {
  const sky = new THREE.Mesh(new THREE.SphereGeometry(410, 24, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, toneMapped: false,
    uniforms: { horizon: { value: new THREE.Color('#253856') }, zenith: { value: new THREE.Color('#071228') } },
    vertexShader: 'varying float altitude; void main() { altitude = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `
      varying float altitude;
      uniform vec3 horizon;
      uniform vec3 zenith;
      void main() {
        gl_FragColor = vec4(mix(horizon, zenith, smoothstep(-.025, .56, altitude)), 1.);
        #include <colorspace_fragment>
      }
    `,
  }));
  sky.renderOrder = -20;
  scene.add(sky);
  const positions = [];
  for (let i = 0; i < 290; i++) {
    const theta = i * 2.39996323, y = .06 + i / 290 * .8, radius = 362;
    const horizontal = Math.sqrt(1 - y * y) * radius;
    positions.push(Math.sin(theta) * horizontal, y * radius, Math.cos(theta) * horizontal);
  }
  const stars = new THREE.BufferGeometry();
  stars.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  scene.add(new THREE.Points(stars, new THREE.PointsMaterial({ color: '#bfd9fb', size: 1.02, fog: false, toneMapped: false })));

  const moon = document.createElement('canvas');
  moon.width = moon.height = 128;
  const ctx = moon.getContext('2d');
  const glow = ctx.createRadialGradient(64, 64, 13, 64, 64, 64);
  glow.addColorStop(0, '#b9dfff9e'); glow.addColorStop(.35, '#83b1fa30'); glow.addColorStop(1, '#83b1fa00');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, 128, 128);
  ctx.beginPath(); ctx.arc(64, 64, 20, 0, Math.PI * 2); ctx.fillStyle = '#e7efff'; ctx.fill();
  for (const [x, y, radius] of [[57, 56, 6], [69, 64, 4], [60, 73, 3], [72, 52, 3]]) {
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fillStyle = '#a6c2ed58'; ctx.fill();
  }
  const texture = new THREE.CanvasTexture(moon); texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, fog: false, toneMapped: false, depthWrite: false }));
  sprite.position.set(-63, 54, -237); sprite.scale.set(78, 78, 1);
  scene.add(sprite);
}

function lightCity(scene) {
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(660, 660), new THREE.MeshStandardMaterial({ color: '#28374b', roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -.16;
  scene.add(ground);
  const skyline = createSceneryModel('Helsinki night skyline');
  const windows = createSceneryModel('Lit windows and street lamps');
  const amber = ['#ffc178', '#e68d57', '#ffd59b'];
  const masonry = ['#2c354d', '#354256', '#29354b', '#48424e'];
  for (let row = 0; row < 16; row++) for (let i = 0; i < 24; i++) {
    const x = (i - 11.5) * 10.8 + (row % 2) * 4.8, z = -168 + row * 15;
    if (Math.abs(x) < 66 && z > -67 && z < 62) continue;
    const h = 4.4 + ((row * 17 + i * 13) % 21) * .32;
    const width = 7.8 + (row + i) % 3 * .48, depth = 9.1 + i % 3 * .46;
    skyline.box(masonry[(row * 3 + i) % masonry.length], x, h / 2, z, width, h, depth);
    skyline.box('#384555', x, h + .18, z, width + .35, .38, depth + .3);
    if ((i + row) % 3 === 0) skyline.box('#29405c', x, h + .72, z, width * .8, .8, depth * .72);
    for (const floor of [1.8, 3.8, 5.8]) for (const column of [-2.35, 0, 2.35]) {
      if (floor > h - .68 || (i * 9 + row * 7 + Math.round(floor + column * 4)) % 4 > 1) continue;
      const tint = (i + row) % 4 ? '#be895a' : '#e5b685';
      windows.box(tint, x + column, floor, z + depth / 2, .6, .95, .055);
      if ((row + i) % 2) windows.box(tint, x + width / 2, floor, z + column, .055, .95, .58);
    }
  }
  scene.add(skyline.finish({ vertexColors: true, roughness: .99 }));
  for (const [x, w] of [[-26, 8], [-16, 8], [-6, 8], [5, 9], [17, 9], [28, 8]]) {
    const count = Math.floor((w - .5) / 1.6);
    for (const side of [-1, 1]) for (let i = 0; i < count; i++) for (let row = 0; row < 3; row++) {
      if ((i * 3 + row * 7 + x) % 5 === 0) continue;
      const lightX = x + (i - (count - 1) / 2) * 1.6;
      windows.box(amber[(i + row) % amber.length], lightX, 1.25 + row * 1.65, 25.5 + side * 3.135, .53, .87, .045);
    }
  }
  for (const side of [-1, 1]) for (let i = 0; i < 15; i++) for (let row = 0; row < 3; row++) {
    if ((i + row * 3) % 7 === 0) continue;
    windows.box(amber[(i + row) % amber.length], side * 24.38, 1.25 + row * 1.65, -3 + (i - 7) * 1.6, .045, .87, .53);
  }
  for (const z of [11.5, -4, -15.7]) for (const side of [-1, 1]) {
    windows.box('#ffe2ab', side * 19.7, 3.6, z, .19, .16, .24);
    const light = new THREE.PointLight('#ffae63', 29, 9, 1.45);
    light.position.set(side * 19.7, 3.6, z);
    scene.add(light);
  }
  const glow = windows.finish({ vertexColors: true });
  const litWindows = glow.children[0];
  litWindows.material.dispose();
  litWindows.material = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
  scene.add(glow);

  const flood = new THREE.SpotLight('#f2d5ad', 730, 65, .74, .61, 1.45);
  flood.position.set(3, 12, -12);
  flood.target.position.set(0, 8, -35);
  scene.add(flood, flood.target);
}

export function createSleighIntro(overlay, { reducedMotion, onImpact, heroModel, sleighParts }) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2('#283956', .006);
  const camera = new THREE.PerspectiveCamera(52, 1, .2, 520);
  const district = senateSquareMap.create();
  scene.add(district.root);
  addSky(scene);
  lightCity(scene);
  scene.add(new THREE.HemisphereLight('#adc6ff', '#2c254a', .84));
  const moonlight = new THREE.DirectionalLight('#a9c9ff', .77);
  moonlight.position.set(-22, 42, -53);
  scene.add(moonlight);

  const witnessScene = new THREE.Scene();
  witnessScene.background = new THREE.Color('#376b7c');
  addSky(witnessScene);
  const witnessDistrict = harborMap.create();
  witnessScene.add(witnessDistrict.root);
  witnessScene.add(new THREE.HemisphereLight('#d9e6ff', '#776859', 1.45));
  const witnessMoonlight = new THREE.DirectionalLight('#d3def2', 1.05);
  witnessMoonlight.position.set(-18, 42, 15);
  witnessScene.add(witnessMoonlight);
  const witnessCityLight = new THREE.SpotLight('#ffe4c0', 420, 85, .82, .68, 1.15);
  witnessCityLight.position.set(-6, 19, 3);
  witnessCityLight.target.position.set(-3.5, 4, -19);
  witnessScene.add(witnessCityLight, witnessCityLight.target);
  const witnessPartsLight = new THREE.SpotLight('#ffe0b4', 480, 70, .86, .7, 1.25);
  witnessPartsLight.position.set(-3, 19, -5);
  witnessPartsLight.target.position.set(-3.5, 8, -12);
  witnessScene.add(witnessPartsLight, witnessPartsLight.target);
  const witnessPartsBounce = new THREE.PointLight('#ffd19a', 48, 26, 1.6);
  witnessPartsBounce.position.set(-3.5, 11, -12);
  witnessScene.add(witnessPartsBounce);
  const witnessHero = cloneSkinned(heroModel);
  witnessHero.name = 'Bad Bad Boy watching the sleigh';
  witnessHero.geometry = heroModel.geometry.clone();
  // The standard material clone keeps the scan's color atlas and uses Three's skinning shader.
  const witnessHeroMaterials = (Array.isArray(heroModel.material) ? heroModel.material : [heroModel.material])
    .map(material => material.clone());
  witnessHero.material = Array.isArray(heroModel.material) ? witnessHeroMaterials : witnessHeroMaterials[0];
  witnessHero.position.set(-5, 0, 7);
  witnessHero.rotation.y = Math.atan2(1.5, -26.2);
  witnessHero.scale.copy(heroModel.scale);
  const witnessHeadBone = addWitnessHeadBone(witnessHero);
  witnessScene.add(witnessHero);
  const witnessHeroKey = new THREE.SpotLight('#ffe8d7', 110, 16, .48, .75);
  witnessHeroKey.position.set(witnessHero.position.x + 4.5, witnessHero.position.y + 6.6, witnessHero.position.z + 2.8);
  witnessHeroKey.target.position.copy(witnessHero.position);
  witnessHeroKey.target.position.y += 1.55;
  witnessHeroKey.castShadow = true;
  witnessHeroKey.shadow.mapSize.set(512, 512);
  witnessHeroKey.shadow.camera.near = .5;
  witnessHeroKey.shadow.normalBias = .02;
  witnessScene.add(witnessHeroKey, witnessHeroKey.target);
  const witnessCamera = new THREE.PerspectiveCamera(68, 1, .2, 520);
  let narrowFrame = 0;
  const witnessTarget = new THREE.Vector3();
  const witnessLookTarget = new THREE.Vector3();
  const witnessHeadPosition = new THREE.Vector3();
  const witnessLookDirection = new THREE.Vector3();
  const witnessInverseRotation = new THREE.Quaternion();

  const sleigh = new THREE.Group();
  scene.add(sleigh);
  const rider = createJoulupukki();
  const riderMaterials = fadeMaterials(rider.root);
  sleigh.add(rider.root);
  const drone = createIntroDrone();
  const droneFlight = new THREE.Group();
  droneFlight.add(drone.root);
  scene.add(droneFlight);
  const impactSparks = createBurstEffects(scene, 32);
  // Both cinematic views reuse gameplay geometry and own only their transforms
  // and fade materials, avoiding another procedural sleigh build.
  const introPartModels = sleighParts.map(({ model }) => ({ model: model.clone(true) }));
  const witnessPartModels = introPartModels.map(({ model }) => ({ model: model.clone(true) }));
  const pieces = createFadingPieces(introPartModels, sleigh);
  const witnessPieces = createFadingPieces(witnessPartModels, witnessScene, pieces.map(piece => piece.center));
  const lantern = new THREE.PointLight('#ffcd9b', 94, 15, 1.4);
  sleigh.add(lantern);
  lantern.position.set(3.4, 5.2, 5.2);

  const sparkPositions = new Float32Array(6 * 13 * 3), sparkColors = new Float32Array(sparkPositions.length);
  const sparksGeometry = new THREE.BufferGeometry();
  sparksGeometry.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3).setUsage(THREE.DynamicDrawUsage));
  sparksGeometry.setAttribute('color', new THREE.BufferAttribute(sparkColors, 3).setUsage(THREE.DynamicDrawUsage));
  const sparks = new THREE.Points(sparksGeometry, new THREE.PointsMaterial({
    size: .17, vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false,
  }));
  sparks.frustumCulled = false;
  sleigh.add(sparks);

  const windCoords = new Float32Array(16 * 6);
  const windGeometry = new THREE.BufferGeometry();
  windGeometry.setAttribute('position', new THREE.BufferAttribute(windCoords, 3).setUsage(THREE.DynamicDrawUsage));
  const wind = new THREE.LineSegments(windGeometry, new THREE.LineBasicMaterial({
    color: '#c4dcff', transparent: true, depthWrite: false, opacity: 0,
  }));
  wind.frustumCulled = false;
  sleigh.add(wind);

  let elapsed = 0;
  const witnessStart = reducedMotion ? 3.65 : (BREAK + 1.6) / FLIGHT_RATE;
  const witnessDuration = reducedMotion ? 3.6 : 4.8;
  const duration = witnessStart + witnessDuration;
  const color = new THREE.Color('#ffbf73');
  const target = new THREE.Vector3();
  const railContact = new THREE.Vector3(1.22, 2.08, 1.85);
  const flightState = { pullBack: 0, scatter: 0, turbulence: 0 };
  // The leading rotor strikes the outside rail. The drone's centre stays on the far side of it.
  const droneAtImpact = railContact.clone().add(new THREE.Vector3(
    ROTOR_OFFSET + BLADE_LENGTH / 2, -ROTOR_HEIGHT, -ROTOR_OFFSET,
  ).multiplyScalar(DRONE_SCALE));
  const approach = new THREE.Vector3(9.5, 1.3, 4.6);
  const deflection = new THREE.Vector3(9.6, .45, -5.4);
  // Anchor the flight in world space at impact, independently of the sleigh's jolt.
  poseSleigh(IMPACT);
  droneFlight.position.copy(sleigh.position);
  droneFlight.quaternion.copy(sleigh.quaternion);
  const droneContact = droneFlight.localToWorld(railContact.clone());
  const flash = new THREE.PointLight('#ffba70', 0, 9);
  flash.position.copy(droneContact);
  scene.add(flash);

  function poseSleigh(time) {
    const pullBack = smoothstep(time, 4.73, 8.25);
    const jolt = smoothstep(time, IMPACT, 4.49), rebound = smoothstep(time, 4.49, 4.77);
    const scatter = Math.max(0, time - BREAK);
    const turbulence = jolt * (1 - pullBack);
    sleigh.position.set(-18 + time * 5.1, 22.3 + time * .66 + Math.sin(time * 2.1) * .35 - 3.5 * jolt + 1.4 * rebound, -12 + time * 1.6);
    sleigh.rotation.set(.028 * Math.sin(time * 3.2) + .26 * jolt - .38 * rebound,
      1.2 + .045 * Math.sin(time * 1.55) - .2 * turbulence, -.13 * Math.sin(time * 1.8) - .57 * jolt + .86 * rebound);
    flightState.pullBack = pullBack;
    flightState.scatter = scatter;
    flightState.turbulence = turbulence;
    return flightState;
  }

  function pose(time) {
    const { pullBack, scatter, turbulence } = poseSleigh(time);
    const close = smoothstep(time, 1.25, 3.35);
    const { x, y, z } = sleigh.position;
    const portrait = camera.aspect < .8;
    const widen = portrait ? 1.36 : 1;
    camera.position.set(x + lerp(-11, 11.2, close) * widen + pullBack * 9,
      y + lerp(11.8, 5.1, close) + pullBack * 6,
      z + lerp(50, 11.8, close) * widen + pullBack * 18);
    target.set(lerp(-6 + x * .26, x, close) + pullBack * 2.5,
      lerp(13.8, y + 1.7, close) - pullBack * 6.8,
      lerp(-29, z, close) - pullBack * 4.5);
    camera.lookAt(target);
    if (!reducedMotion) camera.rotateZ(.072 * Math.sin(time * 26) * turbulence * (1 - smoothstep(time, 4.5, 5.25)));

    const beforeImpact = Math.max(0, IMPACT - time);
    const afterImpact = Math.max(0, time - IMPACT);
    drone.root.position.copy(droneAtImpact).addScaledVector(approach, beforeImpact).addScaledVector(deflection, afterImpact);
    drone.root.position.y -= 3.2 * afterImpact ** 2;
    drone.root.rotation.set(-.15 * Math.min(1, beforeImpact) + afterImpact * 2.9, -afterImpact * 2.4, -.2 * Math.min(1, beforeImpact) - afterImpact * 3.4);
    drone.rotors.forEach((rotor, i) => { rotor.rotation.y = i * Math.PI / 2 + (time - IMPACT) * 45 * (i % 2 ? 1 : -1); });
    fadeModel(drone.root, drone.materials, smoothstep(time, 2.25, 2.75) * (1 - smoothstep(afterImpact, 1.04, 1.62)));
    flash.intensity = time >= IMPACT ? 175 * (1 - smoothstep(afterImpact, .03, .24)) : 0;

    rider.root.position.set(.95 * scatter, 1.77 + 2.7 * scatter - 1.55 * scatter ** 2, .09 - 2.8 * scatter);
    rider.root.rotation.set(-.24 * turbulence - .61 * scatter, -.3 * scatter, -.82 * scatter + .25 * turbulence);
    rider.arms.forEach((arm, i) => {
      arm.rotation.x = -(turbulence * .75 + smoothstep(scatter, 0, .36) * .85) + Math.sin(time * 15 + i) * .35 * pullBack;
      arm.rotation.z = (i ? 1 : -1) * (.14 + smoothstep(scatter, 0, .35) * .95);
    });
    fadeModel(rider.root, riderMaterials, 1 - smoothstep(scatter, 1.65, 3.08));

    for (let i = 0; i < pieces.length; i++) {
      const { pivot, center, velocity, materials } = pieces[i];
      pivot.position.set(center.x + velocity[0] * scatter, center.y + velocity[1] * scatter - 1.04 * scatter ** 2, center.z + velocity[2] * scatter);
      pivot.rotation.set((i % 2 ? 1 : -1) * scatter * (1.2 + i * .24), scatter * (1.7 - i * .58), scatter * (.9 - i * .35));
      fadeModel(pivot, materials, 1 - smoothstep(scatter, 2.03 + i * .12, 3.2 + i * .115));
    }
    sparks.visible = scatter > 0 && scatter < 3.6;
    if (sparks.visible) {
      for (let i = 0; i < pieces.length; i++) {
        const { center, velocity } = pieces[i];
        for (let j = 0; j < 13; j++) {
          const age = Math.max(0, scatter - j * .052);
          const n = (i * 13 + j) * 3;
          sparkPositions[n] = center.x + velocity[0] * age + Math.sin(i * 8 + j) * scatter * .31;
          sparkPositions[n + 1] = center.y + velocity[1] * age - 1.04 * age ** 2 + Math.cos(j * 7.3) * scatter * .28;
          sparkPositions[n + 2] = center.z + velocity[2] * age + Math.sin(j * 5.1) * scatter * .34;
          const fade = (1 - j / 14) * (1 - smoothstep(scatter, 1.7, 3.6));
          sparkColors[n] = color.r * fade; sparkColors[n + 1] = color.g * fade; sparkColors[n + 2] = color.b * fade;
        }
      }
      sparksGeometry.attributes.position.needsUpdate = sparksGeometry.attributes.color.needsUpdate = true;
    }
    wind.visible = !reducedMotion && time > 3.7 && time < 5.45;
    if (wind.visible) {
      wind.material.opacity = .46 * smoothstep(time, 3.7, 4.15) * (1 - smoothstep(time, 4.9, 5.45));
      for (let i = 0; i < 16; i++) {
        const n = i * 6, z = 10 - ((time * 17 + i * 5.17) % 22);
        const x = Math.cos(i * 2.39996) * (3.4 + i % 4 * .88), y = -1 + Math.sin(i * 2.39996) * 4.3;
        windCoords.set([x, y, z, x * 1.04, y + .15, z - 1.1 - i % 3 * .6], n);
      }
      windGeometry.attributes.position.needsUpdate = true;
    }
  }

  function poseWitness(time, dt) {
    const scatter = .95 + time * .58;
    const opacity = 1 - smoothstep(time, witnessDuration - 1.1, witnessDuration - .32);
    witnessLookTarget.set(0, 0, 0);
    for (let i = 0; i < witnessPieces.length; i++) {
      const { pivot, center, velocity, materials } = witnessPieces[i];
      const verticalVelocity = THREE.MathUtils.clamp(velocity[1], -.8, 1.2);
      pivot.position.set(
        -3.5 + center.x + velocity[0] * scatter,
        20.5 + center.y + verticalVelocity * scatter - scatter ** 2,
        -12 + center.z + velocity[2] * scatter,
      );
      pivot.rotation.set((i % 2 ? 1 : -1) * scatter * (1.2 + i * .24), scatter * (1.7 - i * .58), scatter * (.9 - i * .35));
      fadeModel(pivot, materials, opacity);
      witnessLookTarget.add(pivot.position);
    }
    witnessLookTarget.multiplyScalar(1 / witnessPieces.length);

    if (witnessHeadBone) {
      witnessHeadPosition.set(
        witnessHero.position.x,
        witnessHero.position.y + 1.28 * witnessHero.scale.y,
        witnessHero.position.z,
      );
      witnessLookDirection.subVectors(witnessLookTarget, witnessHeadPosition)
        .applyQuaternion(witnessInverseRotation.copy(witnessHero.quaternion).invert());
      const horizontal = Math.hypot(witnessLookDirection.x, witnessLookDirection.z);
      const yaw = THREE.MathUtils.clamp(Math.atan2(witnessLookDirection.x, witnessLookDirection.z), -.68, .68);
      const pitch = THREE.MathUtils.clamp(Math.atan2(witnessLookDirection.y, horizontal), -.62, .72);
      const tracking = reducedMotion ? 5 : 8;
      witnessHeadBone.rotation.y = THREE.MathUtils.damp(witnessHeadBone.rotation.y, yaw * 1.25, tracking, dt);
      witnessHeadBone.rotation.x = THREE.MathUtils.damp(witnessHeadBone.rotation.x, -pitch * 1.35, tracking, dt);
    }
  }

  function frameWitnessCamera(time) {
    const slide = reducedMotion ? 0 : smoothstep(time, 0, witnessDuration);
    const cameraX = lerp(4, -2, narrowFrame) - slide * lerp(4.2, 1.6, narrowFrame);
    const targetX = lerp(-3.5, -5.2, narrowFrame) - slide * lerp(1.6, .7, narrowFrame);
    witnessCamera.position.set(cameraX, 1.65, lerp(15, 13.5, narrowFrame));
    witnessTarget.set(targetX, 8, -14.5);
    witnessCamera.lookAt(witnessTarget);
  }

  frameWitnessCamera(0);

  return {
    resize(width, height) {
      camera.aspect = width / height;
      camera.fov = camera.aspect < .8 ? 57 : 52;
      camera.updateProjectionMatrix();
      witnessCamera.aspect = width / height;
      narrowFrame = 1 - smoothstep(witnessCamera.aspect, .75, 1.4);
      witnessCamera.fov = lerp(68, 92, narrowFrame);
      witnessCamera.updateProjectionMatrix();
      frameWitnessCamera(elapsed - witnessStart);
    },
    update(dt) {
      const last = elapsed;
      elapsed += dt;
      const witnessTime = elapsed - witnessStart;
      const time = reducedMotion ? (elapsed < 2.35 ? 3.68 : 5.87) : elapsed * FLIGHT_RATE;
      if (witnessTime < 0) pose(time);
      else {
        poseWitness(witnessTime, dt);
        frameWitnessCamera(witnessTime);
      }
      if (!reducedMotion && last * FLIGHT_RATE < IMPACT && time >= IMPACT) {
        impactSparks.burst(droneContact.x, droneContact.y, droneContact.z, '#ffb963', 24, null, 1.75);
        onImpact();
      }
      if (!reducedMotion && time >= IMPACT && time < IMPACT + 1) impactSparks.update(dt);
      const fadeIn = 1 - smoothstep(elapsed, 0, .75);
      const fadeBetweenShots = smoothstep(witnessTime, -.72, 0) * (1 - smoothstep(witnessTime, 0, .66));
      const fadeOut = smoothstep(elapsed, duration - .65, duration);
      const cut = reducedMotion ? Math.max(0, 1 - Math.abs(elapsed - 2.35) / .19) : 0;
      overlay.style.setProperty('--intro-shade', Math.max(fadeIn, fadeBetweenShots, fadeOut, cut).toFixed(3));
      overlay.style.setProperty('--intro-caption', (smoothstep(elapsed, .6, 1.12) * (1 - smoothstep(elapsed, 2.4, 3.28))).toFixed(3));
      return elapsed >= duration;
    },
    render(renderer) {
      if (elapsed >= witnessStart) renderer.render(witnessScene, witnessCamera);
      else renderer.render(scene, camera);
    },
    dispose() {
      witnessHero.removeFromParent();
      witnessHero.skeleton?.dispose();
      witnessHero.geometry.dispose();
      for (const material of witnessHeroMaterials) material.dispose();
      witnessHeroKey.dispose();
      witnessDistrict.dispose();
      disposeFadingPieces(witnessPieces);
      disposeObject(witnessScene);
      district.dispose();
      disposeFadingPieces(pieces);
      disposeObject(scene);
    },
  };
}
