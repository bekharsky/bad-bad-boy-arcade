import * as THREE from 'three';
import { createSceneryModel } from '../maps/scenery-model.js';
import { createCameoPhotoHead, poseCameoPhoto } from './cameo-photos.js';

const LOOKS = {
  purra: { name: 'Purra', skin: '#f1c5aa', jacket: '#d73587', lapel: '#bd2d75', shirt: '#25212a', trousers: '#32313a', scale: [.98, 1, 1] },
  orpo: { name: 'Orpo', skin: '#e9bd9e', jacket: '#344356', lapel: '#29384a', shirt: '#f2eee4', trousers: '#303b4d', scale: [1.03, 1, 1] },
  marin: { name: 'Marin', skin: '#f3cbb1', jacket: '#f1eee4', lapel: '#e1ddd4', shirt: '#333039', trousers: '#34333b', scale: [.94, 1, 1] },
  stubb: { name: 'Stubb', skin: '#eabe9d', jacket: '#304563', lapel: '#253a56', shirt: '#f4efe4', trousers: '#2d3b53', scale: [.97, 1.05, 1] },
};
const INK = '#29282c';
const JACKET = { bottom: 1.145, height: 1.03, waist: .28, shoulders: .33, depth: .7, sides: 20 };

function oval(model, color, x, y, z, sx, sy, sz, rotation = 0, segments = 20) {
  model.geometry(color, new THREE.SphereGeometry(1, segments, 12).scale(sx, sy, sz).rotateZ(rotation).translate(x, y, z));
}

function rod(model, color, a, b, radius, endRadius = radius) {
  const start = new THREE.Vector3(...a), delta = new THREE.Vector3(...b).sub(start);
  const shape = new THREE.CylinderGeometry(endRadius, radius, delta.length(), 10);
  shape.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.clone().normalize()));
  model.geometry(color, shape.translate(...start.addScaledVector(delta, .5).toArray()));
}

function jacketRadius(y) {
  return THREE.MathUtils.lerp(JACKET.waist, JACKET.shoulders, (y - JACKET.bottom) / JACKET.height);
}

function clipPanel(points, distance) {
  const clipped = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    const from = distance(a), to = distance(b);
    if (from >= 0) clipped.push(a);
    if (from * to < 0) {
      const t = from / (from - to);
      clipped.push(a.map((value, axis) => THREE.MathUtils.lerp(value, b[axis], t)));
    }
  }
  return clipped;
}

// Clip and project each detail onto the matching front face of the jacket.
// This keeps even the tips of the lapels attached when seen edge-on.
function jacketPanel(model, color, outline, layer) {
  const step = 2 * Math.PI / JACKET.sides;
  const quarter = JACKET.sides / 4;
  const taper = (JACKET.shoulders - JACKET.waist) / JACKET.height;
  const normal = new THREE.Vector3();
  for (let face = -quarter; face < quarter; face++) {
    const a = face * step, b = a + step;
    const left = Math.sin(a), right = Math.sin(b);
    const clipped = clipPanel(clipPanel(outline, ([x, y]) => x - jacketRadius(y) * left),
      ([x, y]) => jacketRadius(y) * right - x);
    if (clipped.length < 3) continue;
    const geometry = new THREE.ShapeGeometry(new THREE.Shape(clipped.map(([x, y]) => new THREE.Vector2(x, y))));
    const { position, normal: normals } = geometry.attributes;
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i), y = position.getY(i), radius = jacketRadius(y);
      const t = (x / radius - left) / (right - left);
      const depth = THREE.MathUtils.lerp(Math.cos(a), Math.cos(b), t);
      position.setZ(i, radius * JACKET.depth * depth + layer);
      normal.set(x / radius, -taper, depth / JACKET.depth).normalize();
      normals.setXYZ(i, normal.x, normal.y, normal.z);
    }
    model.geometry(color, geometry);
  }
}

function body(model, look, kind) {
  const suit = kind === 'orpo' || kind === 'stubb';
  const { bottom, height, waist, shoulders, depth, sides } = JACKET;
  model.geometry(look.jacket, new THREE.CylinderGeometry(shoulders, waist, height, sides)
    .scale(1, 1, depth).translate(0, bottom + height / 2, 0));
  oval(model, look.trousers, 0, 1.19, 0, .255, .16, .18);
  jacketPanel(model, look.shirt, [[-.14, 2.16], [.14, 2.16], [.095, 1.69], [-.095, 1.69]], .001);
  for (const side of [-1, 1]) {
    jacketPanel(model, look.lapel,
      [[side*.14, 2.16], [side*.27, 2.06], [side*.08, 1.68], [side*.19, 1.94], [side*.10, 2.02]], .002);
  }
  if (suit) {
    jacketPanel(model, kind === 'stubb' ? '#8185b2' : '#6691b4',
      [[0, 2.10], [-.039, 2.03], [-.045, 1.69], [0, 1.65], [.045, 1.69], [.039, 2.03]], .003);
  }
  jacketPanel(model, INK, [[-.004, 1.65], [.004, 1.65], [.004, 1.17], [-.004, 1.17]], .001);
  for (const y of [1.55, 1.39]) {
    const button = Array.from({ length: 10 }, (_, i) => {
      const angle = i * Math.PI / 5;
      return [.042 + .012 * Math.cos(angle), y + .012 * Math.sin(angle)];
    });
    jacketPanel(model, INK, button, .002);
  }
}

function limbs(root, look, shoulderDrop = 0) {
  for (const side of [-1, 1]) {
    const leg = createSceneryModel(`${look.name} leg ${side}`);
    rod(leg, look.trousers, [0, .02, 0], [0, -.55, 0], .126, .10);
    const legRoot = leg.finish({ vertexColors: true });
    legRoot.position.set(side * .16, 1.21, 0);
    legRoot.userData.stride = side;
    const shin = createSceneryModel(`${look.name} knee ${side}`);
    oval(shin, look.trousers, 0, 0, 0, .10, .11, .105);
    rod(shin, look.trousers, [0, 0, 0], [0, -.50, 0], .10, .075);
    oval(shin, INK, 0, -.52, .08, .115, .08, .225);
    const knee = shin.finish({ vertexColors: true });
    knee.position.y = -.55;
    knee.userData.knee = side;
    legRoot.add(knee);
    root.add(legRoot);

    const arm = createSceneryModel(`${look.name} arm ${side}`);
    oval(arm, look.jacket, 0, -.04, 0, .105, .13, .12);
    rod(arm, look.jacket, [0, -.06, 0], [0, -.37, 0], .105, .083);
    const armRoot = arm.finish({ vertexColors: true });
    armRoot.position.set(side * .34, 2.05 - shoulderDrop, 0);
    armRoot.userData.swing = -side;
    const forearm = createSceneryModel(`${look.name} elbow ${side}`);
    rod(forearm, look.jacket, [0, 0, 0], [0, -.30, 0], .085, .067);
    oval(forearm, look.skin, 0, -.35, 0, .077, .10, .068);
    const elbow = forearm.finish({ vertexColors: true });
    elbow.position.y = -.37;
    elbow.rotation.x = -.18;
    elbow.userData.elbow = true;
    armRoot.add(elbow);
    root.add(armRoot);
  }
}

export function createCameoModel(kind) {
  const look = LOOKS[kind];
  if (!look) throw new Error(`Unknown cameo: ${kind}`);
  const root = new THREE.Group();
  root.name = `cameo ${kind}`;
  root.userData.character = kind;
  root.userData.style = 'photo-cutout';
  root.scale.set(...look.scale);
  const costume = createSceneryModel(`${look.name} body`);
  body(costume, look, kind);
  const collarDrop = kind === 'orpo' ? .16 : 0;
  const jacketScale = 1 - collarDrop / JACKET.height;
  const jacketOffset = JACKET.bottom * (1 - jacketScale);
  if (collarDrop) {
    // The jacket and its details move together to meet the photo neck.
    const localY = y => (y - jacketOffset) / jacketScale;
    const collarTop = JACKET.bottom + JACKET.height - collarDrop;
    rod(costume, look.shirt, [0, localY(collarTop - .015), .075], [0, localY(collarTop + .025), .075], .158, .143);
  }
  const jacket = costume.finish({ vertexColors: true, roughness: .95 });
  jacket.scale.y = jacketScale;
  jacket.position.y = jacketOffset;
  root.add(jacket);
  limbs(root, look, collarDrop * .7);
  root.add(createCameoPhotoHead(kind, kind === 'stubb' ? 1.04 : .98));
  return root;
}

export function animateCameo(root, time, running = true, viewerYaw = 0) {
  const phase = time * 9, stride = running ? Math.sin(phase) : 0;
  root.position.y = running ? Math.abs(Math.cos(phase)) * .035 : 0;
  for (const part of root.children) {
    if (part.userData.stride) {
      const side = part.userData.stride;
      const swing = stride * side;
      part.position.z = running ? 0 : side * .045;
      part.rotation.x = swing * .65;
      part.children.find(child => child.userData.knee).rotation.x = Math.max(0, -swing) * 1.05;
    }
    if (part.userData.swing) {
      const swing = stride * part.userData.swing;
      part.rotation.x = running ? swing * .58 : part.userData.swing * .055;
      part.children.find(child => child.userData.elbow).rotation.x = running ? -.92 + Math.min(0, swing) * .24 : -.18;
    }
  }
  return poseCameoPhoto(root, viewerYaw, time, running);
}
