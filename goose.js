import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// A barnacle goose: cream face/belly, black neck, breast, bill and feet,
// silver-grey barred wings. One skinned draw call, shared by the whole flock.
// +Z is forward, matching the ground enemy controller.
const WING_HINGE_SHIFT = .12;
const WING_ROOT_X = .28;
export const WING_FLAP_AMPLITUDE = 1.35;
export const WING_FLAP_SPEED = 19;
const WING_SPREAD_AXIS = new THREE.Vector3(0, 1, 0);
const WING_FLAP_AXIS = new THREE.Vector3(0, 0, 1);
const WING_FOLDED_YAW = Math.PI + Math.PI / 36;
const WING_FOLDED_ROLL = 3 * Math.PI / 4;
// The sculpted feather bars face up and slightly toward the head when spread.
const WING_SPREAD_ROLL = THREE.MathUtils.degToRad(64);

function poseWing(wing, twist, side, open) {
  const yaw = THREE.MathUtils.lerp(WING_FOLDED_YAW, Math.PI / 2, open);
  const roll = THREE.MathUtils.lerp(WING_FOLDED_ROLL, WING_SPREAD_ROLL, open);
  // Twist along the wing span so the tips still sweep in the horizontal plane.
  twist.setFromAxisAngle(WING_FLAP_AXIS, side * roll);
  wing.quaternion.setFromAxisAngle(WING_SPREAD_AXIS, side * yaw).multiply(twist);
}

export function createGooseModel() {
  const pivots = [[0, 0, 0], [0, .76, .34], [-.15, .31, -.06], [.15, .31, -.06], [-WING_ROOT_X, .71, .24], [WING_ROOT_X, .71, .24]];
  const names = ['goose-body', 'goose-neck', 'goose-leg-left', 'goose-leg-right', 'goose-wing-left', 'goose-wing-right'];
  const bones = pivots.map((pivot, index) => {
    const bone = new THREE.Bone(); bone.name = names[index]; bone.position.set(...pivot); return bone;
  });
  for (const bone of bones.slice(1)) bones[0].add(bone);
  const head = new THREE.Bone();
  head.name = 'goose-head';
  head.position.set(0, .53, .11);
  bones[1].add(head);
  bones.push(head);
  pivots.push(head.position.clone().add(bones[1].position).toArray());
  bones.slice(4, 6).forEach((wing, i) => {
    const tip = new THREE.Bone();
    tip.name = i ? 'goose-tip-right' : 'goose-tip-left';
    tip.position.z = .34;
    wing.add(tip);
    bones.push(tip);
  });
  const beak = new THREE.Object3D(); beak.name = 'goose-bill-tip';
  beak.position.set(0, -.055, .40); head.add(beak);
  const pieces = [];
  function piece(geometry, color, bone = 0) {
    geometry.deleteAttribute('uv');
    geometry.translate(...pivots[bone]);
    const count = geometry.attributes.position.count, shade = new THREE.Color(color);
    const colors = new Float32Array(count * 3), weights = new Float32Array(count * 4), indices = new Uint16Array(count * 4);
    for (let i = 0; i < count; i++) { shade.toArray(colors, i * 3); weights[i * 4] = 1; indices[i * 4] = bone; }
    if (bone === 4 || bone === 5) {
      for (let i = 0; i < count; i++) {
        const span = geometry.attributes.position.getZ(i) - pivots[bone][2];
        const tipWeight = THREE.MathUtils.smoothstep(span, .23, .45);
        indices[i * 4 + 1] = bone + 3;
        weights[i * 4] = 1 - tipWeight;
        weights[i * 4 + 1] = tipWeight;
      }
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(indices, 4));
    geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4));
    pieces.push(geometry);
  }
  function oval(color, position, scale, bone = 0, rotation = 0, detail = 10) {
    piece(new THREE.SphereGeometry(1, detail, Math.floor(detail * .7)).scale(...scale).rotateX(rotation).translate(...position), color, bone);
  }
  const dark = '#20282c', grey = '#858e96', cream = '#eeeadd';
  oval(grey, [0, .59, -.06], [.34, .33, .57]);
  oval(cream, [0, .43, -.01], [.325, .235, .52]);
  oval(dark, [0, .68, .35], [.26, .30, .265], 0, -.15);
  oval(cream, [0, .54, -.54], [.27, .17, .27]);
  oval(dark, [0, .60, -.68], [.21, .075, .28], 0, -.2);

  // The head counter-rotates when the neck stretches forward in flight.
  oval(dark, [0, .22, .025], [.13, .36, .14], 1, .12);
  oval(dark, [0, 0, 0], [.185, .195, .235], 6);
  oval(cream, [0, -.01, .155], [.155, .15, .105], 6);
  for (const side of [-1, 1]) {
    oval(cream, [side * .153, -.02, .05], [.047, .135, .16], 6);
    oval('#0b1115', [side * .18, .045, .095], [.025, .026, .028], 6, 0, 6);
    oval('#b4bdb3', [side * .196, .053, .105], [.007, .008, .007], 6, 0, 6);
  }
  oval('#171e22', [0, -.055, .275], [.08, .062, .14], 6, -.12);

  for (const [side, bone] of [[-1, 4], [1, 5]]) {
    oval('#687671', [side * .02, -.055, .4 - WING_HINGE_SHIFT], [.09, .14, .4], bone, -.13);
    // Overlapping feather edges make the silver/black barring readable from
    // the elevated game camera without another texture or material batch.
    for (let feather = 0; feather < 7; feather++) {
      const z = .1 - WING_HINGE_SHIFT + feather * .1;
      oval(feather % 2 ? '#b5beb5' : '#d0d3c7', [side * .07, .04 - feather * .009, z], [.04, .09, .14], bone, -.18, 6);
      oval('#394642', [side * .08, .005 - feather * .009, z - .055], [.036, .07, .08], bone, -.22, 6);
    }
  }
  for (const bone of [2, 3]) {
    piece(new THREE.CylinderGeometry(.034, .03, .27, 7).translate(0, -.125, 0), dark, bone);
    // Broad webbed feet; a low wedge rather than orange duck paddles.
    const foot = new THREE.BufferGeometry();
    foot.setAttribute('position', new THREE.Float32BufferAttribute([
      0, -.255, -.045, -.085, -.282, .16, .085, -.282, .16,
      0, -.255, -.045, .085, -.282, .16, .075, -.297, .11,
      0, -.255, -.045, .075, -.297, .11, -.075, -.297, .11,
      0, -.255, -.045, -.075, -.297, .11, -.085, -.282, .16,
    ], 3));
    foot.setIndex(Array.from({ length: 12 }, (_, i) => i)); foot.computeVertexNormals();
    piece(foot, '#171e22', bone);
  }
  const geometry = mergeGeometries(pieces);
  for (const part of pieces) part.dispose();
  const mesh = new THREE.SkinnedMesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .85 }));
  mesh.name = 'Barnacle goose'; mesh.add(bones[0]); mesh.bind(new THREE.Skeleton(bones));
  const twist = new THREE.Quaternion();
  poseWing(bones[4], twist, -1, 0);
  poseWing(bones[5], twist, 1, 0);
  mesh.updateMatrixWorld(true);
  mesh.castShadow = mesh.receiveShadow = true;
  // Include the neck lunge, legs and flapping wings in the shared culling bound.
  geometry.computeBoundingSphere();
  mesh.boundingSphere = geometry.boundingSphere.clone();
  mesh.boundingSphere.radius += .55;
  const scene = new THREE.Group(); scene.name = 'Barnacle goose template'; scene.add(mesh);
  return scene;
}

export function gooseRig(model) {
  return {
    neck: model.getObjectByName('goose-neck'),
    head: model.getObjectByName('goose-head'),
    tips: ['goose-tip-left', 'goose-tip-right'].map(name => model.getObjectByName(name)),
    watchPhase: 0,
    beak: model.getObjectByName('goose-bill-tip'),
    legs: ['goose-leg-left', 'goose-leg-right'].map(name => model.getObjectByName(name)),
    wings: ['goose-wing-left', 'goose-wing-right'].map(name => model.getObjectByName(name)),
    wingTwist: new THREE.Quaternion(),
    wingFlap: new THREE.Quaternion(),
  };
}

export function animateGoose(enemy, dt, attacking, speed = enemy.speed) {
  enemy.gait += dt * (enemy.airborne ? WING_FLAP_SPEED : attacking ? 9 : speed * 9);
  const phase = enemy.gait, stride = attacking ? .12 : .48 * Math.min(1, speed / .45);
  const wingOpen = THREE.MathUtils.clamp(enemy.wingOpen ?? (enemy.airborne ? 1 : 0), 0, 1);
  const wingFlapAmount = THREE.MathUtils.clamp(enemy.wingFlapAmount ?? (enemy.airborne ? 1 : 0), 0, 1);
  const extension = enemy.flightExtension ?? (enemy.airborne ? 1 : 0);
  const beat = Math.sin(phase);
  // A quicker power stroke and a longer recovery between beats.
  const stroke = phase - .18 * beat;
  const wingbeat = enemy.airborne ? Math.sin(stroke) * WING_FLAP_AMPLITUDE * wingFlapAmount
    : attacking ? .25 + beat * .1 : beat * .025 * stride;
  for (let i = 0; i < 2; i++) {
    const side = i ? 1 : -1;
    enemy.goose.legs[i].rotation.x = 1.1 * extension - side * beat * stride * (1 - extension);
    const wing = enemy.goose.wings[i];
    poseWing(wing, enemy.goose.wingTwist, side, wingOpen);
    enemy.goose.wingFlap.setFromAxisAngle(WING_FLAP_AXIS, side * (wingbeat + (enemy.landingLift ?? 0)));
    wing.quaternion.premultiply(enemy.goose.wingFlap);
    // Flex the outer primaries behind the shoulder on each stroke reversal.
    enemy.goose.tips[i].rotation.x = Math.cos(stroke) * .28 * wingFlapAmount;
  }
  const watching = !enemy.airborne && !attacking && speed < .05;
  enemy.goose.watchPhase += dt * .95;
  const scan = watching ? .27 * Math.sin(enemy.goose.watchPhase) : 0;
  const lunge = attacking ? .7 + beat * .18 : .19 * stride + Math.sin(phase * .5) * .045;
  const neck = enemy.goose.neck;
  neck.rotation.x = THREE.MathUtils.damp(neck.rotation.x, THREE.MathUtils.lerp(lunge, 1.12, extension), 15, dt);
  neck.rotation.y = THREE.MathUtils.damp(neck.rotation.y, scan, 5, dt);
  enemy.goose.head.rotation.x = -.86 * neck.rotation.x * extension;
  enemy.body.position.y = .033 * (1 - beat) * extension + Math.abs(beat) * .0375 * stride * (1 - extension);
  enemy.body.rotation.z = beat * .094 * stride * (1 - extension);
  enemy.body.rotation.x = attacking ? .06 : -.22 * (enemy.landingLift ?? 0);
}
