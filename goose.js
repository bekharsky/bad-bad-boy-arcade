import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// A barnacle goose: cream face/belly, black neck, breast, bill and feet,
// silver-grey barred wings. One skinned draw call, shared by the whole flock.
// +Z is forward, matching the ground enemy controller.
const WING_HINGE_SHIFT = .12;
const WING_HINGE_Z = -.1 + WING_HINGE_SHIFT;
const WING_ROOT_X = .28;
export const WING_FLAP_AMPLITUDE = 1.35;
// The wing mesh points toward the neck along +Z. Open it to ±X, then flap
// around the body's longitudinal Z axis.
const WING_SPREAD_AXIS = new THREE.Vector3(0, 1, 0);
const WING_FLAP_AXIS = new THREE.Vector3(0, 0, 1);

export function createGooseModel() {
  const pivots = [[0, 0, 0], [0, .76, .34], [-.15, .31, -.06], [.15, .31, -.06], [-WING_ROOT_X, .71, WING_HINGE_Z], [WING_ROOT_X, .71, WING_HINGE_Z]];
  const names = ['goose-body', 'goose-neck', 'goose-leg-left', 'goose-leg-right', 'goose-wing-left', 'goose-wing-right'];
  const bones = pivots.map((pivot, index) => {
    const bone = new THREE.Bone(); bone.name = names[index]; bone.position.set(...pivot); return bone;
  });
  for (const bone of bones.slice(1)) bones[0].add(bone);
  const beak = new THREE.Object3D(); beak.name = 'goose-bill-tip';
  beak.position.set(0, .475, .54); bones[1].add(beak);
  const pieces = [];
  function piece(geometry, color, bone = 0) {
    geometry.deleteAttribute('uv');
    geometry.translate(...pivots[bone]);
    const count = geometry.attributes.position.count, shade = new THREE.Color(color);
    const colors = new Float32Array(count * 3), weights = new Float32Array(count * 4), indices = new Uint16Array(count * 4);
    for (let i = 0; i < count; i++) { shade.toArray(colors, i * 3); weights[i * 4] = 1; indices[i * 4] = bone; }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(indices, 4));
    geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4));
    pieces.push(geometry);
  }
  function oval(color, position, scale, bone = 0, rotation = 0, detail = 10) {
    piece(new THREE.SphereGeometry(1, detail, Math.floor(detail * .7)).scale(...scale).rotateX(rotation).translate(...position), color, bone);
  }
  const dark = '#20282c', grey = '#87928e', cream = '#eeeadd';
  oval(grey, [0, .59, -.06], [.34, .33, .57]);
  oval(cream, [0, .43, -.01], [.325, .235, .52]);
  oval(dark, [0, .68, .35], [.26, .30, .265], 0, -.15);
  oval(cream, [0, .54, -.54], [.27, .17, .27]);
  oval(dark, [0, .60, -.68], [.21, .075, .28], 0, -.2);

  // The neck, head and beak articulate together for a forward, low nip.
  oval(dark, [0, .22, .025], [.13, .36, .14], 1, .12);
  oval(dark, [0, .53, .11], [.185, .195, .235], 1);
  oval(cream, [0, .52, .265], [.155, .15, .105], 1);
  for (const side of [-1, 1]) {
    oval(cream, [side * .153, .51, .16], [.047, .135, .16], 1);
    oval('#0b1115', [side * .18, .575, .205], [.025, .026, .028], 1, 0, 6);
    oval('#b4bdb3', [side * .196, .583, .215], [.007, .008, .007], 1, 0, 6);
  }
  oval('#171e22', [0, .475, .385], [.082, .066, .17], 1, -.12);

  for (const [side, bone] of [[-1, 4], [1, 5]]) {
    // Wing starts at the shoulder and extends only outward when spread along X.
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
  mesh.castShadow = mesh.receiveShadow = true;
  // Include the neck lunge, legs and flapping wings in the shared culling bound.
  geometry.computeBoundingSphere();
  mesh.boundingSphere = geometry.boundingSphere.clone();
  mesh.boundingSphere.radius += .55;
  const scene = new THREE.Group(); scene.name = 'Barnacle goose template'; scene.add(mesh);
  return scene;
}

export function gooseRig(model) {
  const wings = ['goose-wing-left', 'goose-wing-right'].map(name => model.getObjectByName(name));
  return {
    neck: model.getObjectByName('goose-neck'),
    beak: model.getObjectByName('goose-bill-tip'),
    legs: ['goose-leg-left', 'goose-leg-right'].map(name => model.getObjectByName(name)),
    wings,
    wingSpread: [-1, 1].map(side => new THREE.Quaternion().setFromAxisAngle(WING_SPREAD_AXIS, side * Math.PI / 2)),
    wingFold: new THREE.Quaternion(),
    wingBase: new THREE.Quaternion(),
    wingFlap: new THREE.Quaternion(),
  };
}

export function animateGoose(enemy, dt, attacking, speed = enemy.speed) {
  enemy.gait += dt * (enemy.airborne ? 25 : attacking ? 9 : speed * 9);
  const phase = enemy.gait, stride = attacking ? .12 : .48 * Math.min(1, speed / .45);
  const wingOpen = THREE.MathUtils.clamp(enemy.wingOpen ?? (enemy.airborne ? 1 : 0), 0, 1);
  const wingFlapAmount = THREE.MathUtils.clamp(enemy.wingFlapAmount ?? (enemy.airborne ? 1 : 0), 0, 1);
  for (let i = 0; i < 2; i++) {
    enemy.goose.legs[i].rotation.x = Math.sin(phase + i * Math.PI) * stride;
    const wingbeat = enemy.airborne ? Math.sin(phase) * WING_FLAP_AMPLITUDE * wingFlapAmount
      : attacking ? .25 + Math.sin(phase) * .1 : Math.sin(phase) * .025;
    const side = i ? 1 : -1;
    const wing = enemy.goose.wings[i];
    enemy.goose.wingBase.copy(enemy.goose.wingFold).slerp(enemy.goose.wingSpread[i], wingOpen);
    enemy.goose.wingFlap.setFromAxisAngle(WING_FLAP_AXIS, side * wingbeat);
    wing.quaternion.copy(enemy.goose.wingFlap).multiply(enemy.goose.wingBase);
  }
  const lunge = attacking ? .7 + Math.sin(phase) * .18 : Math.sin(phase * .5) * .045;
  enemy.goose.neck.rotation.x = THREE.MathUtils.damp(enemy.goose.neck.rotation.x, lunge, 15, dt);
  enemy.body.position.y = Math.abs(Math.sin(phase)) * (attacking ? .008 : .0375 * stride);
  enemy.body.rotation.z = Math.sin(phase) * (attacking ? .015 : .094 * stride);
  enemy.body.rotation.x = attacking ? .06 : 0;
}
