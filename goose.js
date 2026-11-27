import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// A barnacle goose: cream face/belly, black neck, breast, bill and feet,
// silver-grey barred wings. One skinned draw call, shared by the whole flock.
// +Z is forward, matching the ground enemy controller.
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
    tip.position.z = .48;
    wing.add(tip);
    bones.push(tip);
  });
  const beak = new THREE.Object3D(); beak.name = 'goose-bill-tip';
  beak.position.set(0, -.055, .40); head.add(beak);
  const pieces = [];
  function piece(geometry, color, bone = 0) {
    geometry.deleteAttribute('uv');
    geometry.translate(...pivots[bone]);
    const count = geometry.attributes.position.count;
    const weights = new Float32Array(count * 4), indices = new Uint16Array(count * 4);
    for (let i = 0; i < count; i++) { weights[i * 4] = 1; indices[i * 4] = bone; }
    if (bone === 4 || bone === 5) {
      for (let i = 0; i < count; i++) {
        const span = geometry.attributes.position.getZ(i) - pivots[bone][2];
        const tipWeight = THREE.MathUtils.smoothstep(span, .36, .65);
        indices[i * 4 + 1] = bone + 3;
        weights[i * 4] = 1 - tipWeight;
        weights[i * 4 + 1] = tipWeight;
      }
    }
    if (!geometry.hasAttribute('color')) {
      const colors = new Float32Array(count * 3), shade = new THREE.Color(color);
      for (let i = 0; i < count; i++) shade.toArray(colors, i * 3);
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    }
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
    // Each section runs from the leading edge to the trailing edge. A curved
    // upper surface and a shallow underside give the wing a continuous profile.
    function panel(sections, height, color, barred = false) {
      const vertices = [], triangles = [], colors = [];
      // Colour the band on the surface so it reads as one patch of plumage.
      const rim = barred
        ? [[0, 0, color], [.25, .88, color], [.44, 1, color], [.49, 1, '#c5cac4'],
           [.62, .91, '#c5cac4'], [.68, .84, '#637075'], [.79, .60, '#637075'],
           [1, 0, color], [.52, -.60, '#606e72']]
        : [[0, 0, color], [.34, 1, color], [.76, .55, color], [1, 0, color], [.52, -.60, color]];
      const rowSize = rim.length;
      for (const [span, front, back, depth] of sections) {
        for (const [fraction, rise, tint] of rim) {
          vertices.push(side * THREE.MathUtils.lerp(front, back, fraction), height + rise * depth, span);
          colors.push(...new THREE.Color(tint).toArray());
        }
      }
      function triangle(a, b, c) {
        triangles.push(a, side > 0 ? b : c, side > 0 ? c : b);
      }
      const last = vertices.length / 3 - rowSize;
      for (let row = 0; row < last; row += rowSize) {
        for (let i = 0; i < rowSize; i++) {
          const a = row + i, b = row + (i + 1) % rowSize;
          triangle(a, a + rowSize, b);
          triangle(b, a + rowSize, b + rowSize);
        }
      }
      for (let i = 1; i < rowSize - 1; i++) {
        triangle(0, i, i + 1);
        triangle(last, last + i + 1, last + i);
      }
      const surface = new THREE.BufferGeometry();
      surface.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      surface.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      surface.setIndex(triangles);
      surface.computeVertexNormals();
      surface.rotateZ(-side * Math.atan2(.06, .04));
      piece(surface, color, bone);
    }
    // Broad, overlapping primaries give the end a three-lobed outline.
    for (let i = 0; i < 3; i++) {
      const offset = i * .082, end = .84 + i * .084;
      panel([[.36, -.015 - offset, .13 - offset, .026],
        [.64, .015 - offset, .265 - offset, .042],
        [end - .085, .08 - offset, .27 - offset, .035],
        [end - .025, .13 - offset, .25 - offset, .022],
        [end, .18 - offset, .215 - offset, .008]],
      -.004 + i * .004, ['#526065', '#455259', '#39464c'][i]);
    }
    panel([[-.075, -.065, .045, .035], [.035, -.14, .15, .066],
      [.20, -.17, .225, .083], [.43, -.165, .24, .078],
      [.63, -.135, .205, .062], [.76, -.095, .16, .044],
      [.83, -.042, .105, .025], [.85, .018, .063, .01]],
    .018, '#899497', true);
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
    const wrist = enemy.goose.tips[i];
    const recovery = .5 + .5 * Math.cos(stroke);
    wrist.rotation.x = Math.cos(stroke) * .32 * wingFlapAmount;
    wrist.rotation.y = side * (.22 * recovery * wingFlapAmount);
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
