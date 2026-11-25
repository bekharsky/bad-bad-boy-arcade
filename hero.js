import * as THREE from 'three';
import { createSpeedSkates } from './models/speed-skate.js';
import { paintFigure } from './world/painted-material.js';

// The prepared GLB is 1.5 units tall: +Z is forward, X separates the legs,
// and Y is up. Its original UVs and colour material stay on the skinned mesh.
export const HERO_BASE_HEIGHT = 1.5;
const STREAM_SOURCE = new THREE.Vector3(-0.036, 0.534, 0.155);

const LEG_JOINTS = [
  { hip: [-0.085, 0.50, 0.004], knee: [-0.119, 0.265, 0], ankle: [-0.140, 0.050, 0.016], skateOffset: [-.018, -.092, -.047] },
  { hip: [0.095, 0.50, 0.004], knee: [0.119, 0.265, 0], ankle: [0.121, 0.050, 0.013], skateOffset: [-.044, -.092, .043] }
];
const skateUp = new THREE.Vector3(0, 1, 0);
const skateRotation = new THREE.Quaternion(), ankleRotation = new THREE.Quaternion();
const bladePosition = new THREE.Vector3();

export function createHero(scene) {
  const original = scene.getObjectByName('BadBadBoy');
  if (!original?.isMesh) throw new Error('Prepared GLB does not contain the character mesh');
  const geometry = original.geometry;

  const root = new THREE.Bone();
  root.name = 'body';
  const bones = [root];
  const skateModel = createSpeedSkates();
  const legs = LEG_JOINTS.map((joints, side) => {
    const hip = new THREE.Bone(), knee = new THREE.Bone(), ankle = new THREE.Bone();
    hip.name = `hip-${side}`;
    knee.name = `knee-${side}`;
    ankle.name = `ankle-${side}`;
    hip.position.fromArray(joints.hip);
    knee.position.fromArray(joints.knee).sub(new THREE.Vector3(...joints.hip));
    ankle.position.fromArray(joints.ankle).sub(new THREE.Vector3(...joints.knee));
    root.add(hip);
    hip.add(knee);
    knee.add(ankle);
    bones.push(hip, knee, ankle);
    const skate = skateModel.clone();
    skate.position.fromArray(joints.skateOffset);
    skate.rotation.y = side === 0 ? -.38 : -.47;
    skate.scale.set(.84, .65, .49);
    skate.visible = false;
    ankle.add(skate);
    return { hip, knee, ankle, skate, phaseOffset: side * Math.PI };
  });

  const positions = geometry.getAttribute('position');
  const indices = new Uint16Array(positions.count * 4);
  const weights = new Float32Array(positions.count * 4);
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), y = positions.getY(i), offset = i * 4;
    const firstBone = x < 0 ? 1 : 4;
    const leg = 1 - THREE.MathUtils.smoothstep(y, 0.43, 0.515);
    const shin = 1 - THREE.MathUtils.smoothstep(y, 0.22, 0.305);
    const foot = 1 - THREE.MathUtils.smoothstep(y, 0.03, 0.09);
    indices.set([0, firstBone, firstBone + 1, firstBone + 2], offset);
    weights[offset] = 1 - leg;
    weights[offset + 1] = leg * (1 - shin);
    weights[offset + 2] = leg * shin * (1 - foot);
    weights[offset + 3] = leg * shin * foot;
  }
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(indices, 4));
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4));

  const mesh = new THREE.SkinnedMesh(geometry, original.material);
  mesh.material.defines = { ...mesh.material.defines, PAINTED_CLAY: 1 };
  paintFigure(mesh.material);
  mesh.add(root);
  mesh.bind(new THREE.Skeleton(bones));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  // Bent knees can extend beyond the bind-pose bounds during the run cycle.
  mesh.frustumCulled = false;

  const emitter = new THREE.Object3D();
  emitter.name = 'stream-source-under-hands';
  emitter.position.copy(STREAM_SOURCE);
  mesh.add(emitter);
  return { mesh, emitter, legs };
}

export function animateHero(rig, time, strength, travelAngle = 0) {
  const forward = Math.cos(travelAngle);
  const sideways = Math.sin(travelAngle);
  const kneeSwing = 1.08 - .65 * Math.abs(sideways);
  for (const leg of rig.legs) {
    const phase = time + leg.phaseOffset;
    const swing = Math.sin(phase);
    const hip = -.72 * forward * swing;
    const knee = .08 + kneeSwing * Math.max(0, Math.cos(phase - .15));
    const outward = Math.sign(leg.hip.position.x);
    const sideStep = .29 * sideways * swing + .12 * outward * Math.abs(sideways);
    leg.hip.rotation.x = hip * strength;
    leg.hip.rotation.z = sideStep * strength;
    leg.knee.rotation.x = knee * strength;
    leg.ankle.rotation.x = (-(hip + knee) * 0.65 + 0.12 * Math.sin(phase - 0.5)) * strength;
    leg.ankle.rotation.y = 0;
    leg.ankle.rotation.z = -.55 * sideStep * strength;
    leg.skate.visible = false;
  }
}

export function animateSkating(rig, body, phase, strength, travelAngle, blend) {
  const forward = Math.cos(travelAngle);
  const sideways = Math.sin(travelAngle);
  const { lerp } = THREE.MathUtils;
  const weightShift = Math.sin(phase) * strength;
  body.rotation.x = lerp(body.rotation.x, .09 + .13 * forward * strength, blend);
  body.rotation.z = lerp(body.rotation.z, -.08 * weightShift - .1 * sideways * strength, blend);

  let lowestBlade = Infinity;
  for (const leg of rig.legs) {
    const legPhase = phase + leg.phaseOffset;
    const push = Math.max(0, Math.sin(legPhase)) * strength;
    const recover = Math.max(0, -Math.cos(legPhase)) * push * 2;
    const outward = Math.sign(leg.hip.position.x);
    // Reach out and back on the push, then tuck the knee to bring the skate in.
    leg.hip.rotation.x = lerp(leg.hip.rotation.x, -.29 + forward * (.21 * push - .16 * recover), blend);
    leg.hip.rotation.z = lerp(leg.hip.rotation.z, outward * (.065 + .34 * push) + sideways * (.12 * push - .09 * recover), blend);
    leg.knee.rotation.x = lerp(leg.knee.rotation.x, .60 - .26 * push + .55 * recover, blend);

    // Counter the torso and leg rotations so the pushing blade stays flat.
    const toeAngle = outward * (.13 + .22 * push) + .45 * sideways * strength;
    skateRotation.setFromAxisAngle(skateUp, toeAngle - leg.skate.rotation.y);
    ankleRotation.copy(body.quaternion).multiply(leg.hip.quaternion).multiply(leg.knee.quaternion).invert().multiply(skateRotation);
    leg.ankle.quaternion.slerp(ankleRotation, blend);
    leg.skate.visible = true;
    lowestBlade = Math.min(lowestBlade, leg.skate.getWorldPosition(bladePosition).y);
  }
  body.position.y -= lowestBlade * blend;
}
