import * as THREE from 'three';
import { PURRA_SHAPE } from './head-data.js';

const skin = new THREE.MeshPhysicalMaterial({
  color: '#e1b7a0',
  roughness: 0.64,
  metalness: 0,
  sheen: 0.12,
  sheenColor: new THREE.Color('#d0917d'),
});
const hairMat = new THREE.MeshStandardMaterial({ color: '#b5a58c', roughness: 0.64 });
const jacket = new THREE.MeshStandardMaterial({ color: '#bd2166', roughness: 0.82 });
const dark = new THREE.MeshStandardMaterial({ color: '#292732', roughness: 0.9 });
const shoe = new THREE.MeshStandardMaterial({ color: '#24242a', roughness: 0.72 });
const P = PURRA_SHAPE.landmarks.map((p) => new THREE.Vector3(...p));
function ellipsoid(parent, material, p, size, segments = 32) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, segments, 20).scale(...size), material);
  mesh.position.set(...p);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
function tube(parent, points, radius, material) {
  const mesh = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), Math.max(12, points.length * 4), radius, 6, false),
    material
  );
  parent.add(mesh);
  return mesh;
}
const matte = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.78 });
function bone(parent, material, a, b, r1, r2 = r1) {
  const delta = new THREE.Vector3(...b).sub(new THREE.Vector3(...a)),
    mesh = new THREE.Mesh(new THREE.CylinderGeometry(r2, r1, delta.length(), 16), material);
  mesh.position.copy(new THREE.Vector3(...a).addScaledVector(delta, 0.5));
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
  parent.add(mesh);
  mesh.castShadow = true;
  return mesh;
}
function panel(parent, points, material) {
  const shape = new THREE.Shape(points.map((p) => new THREE.Vector2(...p))),
    mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.018, bevelEnabled: false }), material);
  mesh.position.z = 0.249;
  parent.add(mesh);
  return mesh;
}
export function createBody({ neck = true } = {}) {
  const root = new THREE.Group();
  root.name = 'Purra study';
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.28, 1.03, 32).scale(1, 1, 0.7), jacket);
  torso.position.y = 1.66;
  root.add(torso);
  torso.castShadow = true;
  ellipsoid(root, dark, [0, 1.19, 0], [0.255, 0.16, 0.18]);
  if (neck) bone(root, skin, [0, 2.12, -0.03], [0, 2.48, -0.03], 0.105, 0.12);
  panel(
    root,
    [
      [-0.14, 2.16],
      [0.14, 2.16],
      [0.095, 1.69],
      [-0.095, 1.69],
    ],
    dark
  );
  for (const side of [-1, 1]) {
    panel(
      root,
      [
        [side * 0.14, 2.16],
        [side * 0.27, 2.06],
        [side * 0.08, 1.68],
        [side * 0.19, 1.94],
        [side * 0.1, 2.02],
      ],
      matte('#ce2d76')
    );
    const hip = new THREE.Group();
    hip.position.set(side * 0.16, 1.21, 0);
    hip.userData.leg = side;
    root.add(hip);
    bone(hip, dark, [0, 0, 0], [0, -0.55, 0], 0.126, 0.1);
    ellipsoid(hip, dark, [0, -0.55, 0], [0.1, 0.11, 0.105]);
    const knee = new THREE.Group();
    knee.position.y = -0.55;
    hip.add(knee);
    hip.userData.knee = knee;
    bone(knee, dark, [0, 0, 0], [0, -0.5, 0], 0.1, 0.075);
    ellipsoid(knee, shoe, [0, -0.52, 0.08], [0.115, 0.08, 0.225]);
    const arm = new THREE.Group();
    arm.position.set(side * 0.34, 2.05, 0);
    arm.userData.arm = -side;
    root.add(arm);
    ellipsoid(arm, jacket, [0, -0.04, 0], [0.105, 0.13, 0.12]);
    bone(arm, jacket, [0, -0.06, 0], [0, -0.37, 0], 0.105, 0.083);
    const elbow = new THREE.Group();
    elbow.position.y = -0.37;
    elbow.rotation.x = -1.05;
    arm.add(elbow);
    bone(elbow, jacket, [0, 0, 0], [0, -0.3, 0], 0.085, 0.067);
    ellipsoid(elbow, skin, [0, -0.35, 0], [0.077, 0.1, 0.068]);
  }
  for (const y of [1.55, 1.72]) ellipsoid(root, matte('#8b6a6a'), [0.04, y, 0.238], [0.012, 0.012, 0.008], 12);
  return root;
}

// Loop subdivision smooths a fitted surface, including its measured boundary.
function subdivide(vertices, faces, rounds = 2) {
  for (let step = 0; step < rounds; step++) {
    const edges = new Map(),
      neighbors = vertices.map(() => new Set()),
      border = vertices.map(() => []);
    for (const [a, b, c] of faces)
      for (const [u, v, opposite] of [
        [a, b, c],
        [b, c, a],
        [c, a, b],
      ]) {
        neighbors[u].add(v);
        neighbors[v].add(u);
        const key = u < v ? `${u}:${v}` : `${v}:${u}`;
        if (!edges.has(key)) edges.set(key, { a: u, b: v, opposite: [] });
        edges.get(key).opposite.push(opposite);
      }
    for (const e of edges.values())
      if (e.opposite.length === 1) {
        border[e.a].push(e.b);
        border[e.b].push(e.a);
      }
    const next = vertices.map((p, i) => {
      if (border[i].length === 2)
        return p
          .clone()
          .multiplyScalar(0.75)
          .addScaledVector(vertices[border[i][0]], 0.125)
          .addScaledVector(vertices[border[i][1]], 0.125);
      const n = neighbors[i].size,
        beta = n === 3 ? 3 / 16 : 3 / (8 * n),
        v = p.clone().multiplyScalar(1 - n * beta);
      for (const j of neighbors[i]) v.addScaledVector(vertices[j], beta);
      return v;
    });
    for (const e of edges.values()) {
      const p = new THREE.Vector3()
        .addVectors(vertices[e.a], vertices[e.b])
        .multiplyScalar(e.opposite.length === 2 ? 0.375 : 0.5);
      if (e.opposite.length === 2) for (const j of e.opposite) p.addScaledVector(vertices[j], 0.125);
      e.index = next.length;
      next.push(p);
    }
    const edge = (a, b) => edges.get(a < b ? `${a}:${b}` : `${b}:${a}`).index;
    const nextFaces = [];
    for (const [a, b, c] of faces) {
      const ab = edge(a, b),
        bc = edge(b, c),
        ca = edge(c, a);
      nextFaces.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
    }
    vertices = next;
    faces = nextFaces;
  }
  return { vertices, faces };
}
function makeGeometry(vertices, faces) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      vertices.flatMap((p) => p.toArray()),
      3
    )
  );
  geometry.setIndex(faces.flat());
  geometry.computeVertexNormals();
  return geometry;
}
function inPolygon(x, y, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i],
      b = points[j];
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
const LIPS = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146].map(
  (i) => P[i]
);
const OVAL = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
  172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109,
];
function addEyes(head) {
  const rimMat = matte('#a7796c'),
    lashMat = matte('#77635a'),
    browMat = matte('#a28b74');
  const eyeContours = [
    [33, 160, 159, 158, 133, 153, 145, 144],
    [362, 385, 386, 387, 263, 373, 374, 380],
  ];
  eyeContours.forEach((contour, index) => {
    const points = contour.map((i) => P[i].clone()),
      center = points.reduce((a, p) => a.add(p), new THREE.Vector3()).multiplyScalar(1 / points.length);
    center.z += 0.009;
    const vertices = [center, ...points.map((p) => p.clone().add(new THREE.Vector3(0, 0, 0.003)))],
      faces = [];
    for (let i = 0; i < points.length; i++) faces.push([0, i + 1, ((i + 1) % points.length) + 1]);
    const geo = makeGeometry(vertices, faces);
    const eye = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({ color: '#dfd9c9', side: THREE.DoubleSide, roughness: 0.35 })
    );
    head.add(eye);
    const iris = P[index === 0 ? 468 : 473].clone();
    iris.z = center.z + 0.006;
    const eyeGroup = new THREE.Group();
    eyeGroup.position.copy(iris);
    eyeGroup.rotation.y = (index === 0 ? -1 : 1) * 0.2;
    head.add(eyeGroup);
    ellipsoid(eyeGroup, matte('#75887c'), [0, 0, 0], [0.022, 0.022, 0.004], 32);
    ellipsoid(eyeGroup, matte('#4b6057'), [0, 0, 0.003], [0.014, 0.014, 0.002], 24);
    ellipsoid(eyeGroup, matte('#151d1e'), [0, 0, 0.006], [0.008, 0.008, 0.002], 24);
    ellipsoid(
      eyeGroup,
      new THREE.MeshBasicMaterial({ color: '#fff8eb' }),
      [-0.004, 0.005, 0.009],
      [0.0025, 0.0025, 0.001],
      12
    );
    const upper = contour.slice(0, 5).map((i) => P[i].clone().add(new THREE.Vector3(0, 0, 0.006)));
    tube(head, upper, 0.0025, lashMat);
    tube(
      head,
      [...contour.slice(4), contour[0]].map((i) => P[i].clone().add(new THREE.Vector3(0, 0, 0.004))),
      0.0016,
      rimMat
    );
  });
  for (const brow of [
    [70, 63, 105, 66, 107],
    [336, 296, 334, 293, 300],
  ]) {
    const points = brow.map((i) => P[i].clone().add(new THREE.Vector3(0, 0.003, 0.004)));
    tube(head, points, 0.0035, browMat);
    for (let i = 1; i < points.length; i++)
      for (let j = 0; j < 6; j++) {
        const p = points[i - 1].clone().lerp(points[i], j / 6);
        tube(head, [p, p.clone().add(new THREE.Vector3(0.003, 0.009, 0.001))], 0.0007, matte('#a08c71'));
      }
  }
}
function hair(root) {
  const vertices = [],
    faces = [],
    colors = [],
    layers = 32,
    segments = 112;
  const base = new THREE.Color('#ac9d87'),
    hi = new THREE.Color('#ded2b4'),
    shade = new THREE.Color();
  for (let j = 0; j <= layers; j++)
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2,
        c = Math.cos(a),
        s = Math.sin(a),
        t = j / layers;
      const fromPart = Math.abs(Math.atan2(Math.sin(a - 0.045), Math.cos(a - 0.045)));
      const hairline = 3.13 - 0.25 * THREE.MathUtils.smoothstep(fromPart, 0.05, 0.76);
      const hem = hairline - 0.59 * THREE.MathUtils.smoothstep(fromPart, 0.7, 0.96) + 0.017 * Math.sin(a * 3);
      const y = 3.285 + (hem - 3.285) * t;
      const crown = Math.sqrt(Math.max(0.0001, 1 - ((Math.max(y, 2.94) - 2.94) / 0.345) ** 2));
      const width = 0.393 * crown * (1 + 0.02 * Math.sin(t * 6 + a * 5));
      const fringe = Math.max(0, c) * 0.054 * THREE.MathUtils.smoothstep(y, 2.91, 3.18);
      const z = -0.145 + c * 0.4 * crown + fringe + 0.01 * Math.sin(t * 9 + a * 17) * t;
      const x = s * width + 0.017 * (1 - t);
      vertices.push(new THREE.Vector3(x, y, z));
      const strand = 0.5 + 0.5 * Math.sin(a * 53 + 0.15 * Math.sin(t * 9));
      shade.copy(base).lerp(hi, 0.17 + 0.36 * strand);
      colors.push(shade.r, shade.g, shade.b);
    }
  for (let j = 0; j < layers; j++)
    for (let i = 0; i < segments; i++) {
      const a = j * (segments + 1) + i,
        b = a + segments + 1;
      faces.push([a, b, a + 1], [a + 1, b, b + 1]);
    }
  const geo = makeGeometry(vertices, faces);
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.6 })
  );
  root.add(mesh);
  mesh.castShadow = true;
  // Narrow raised strand groups follow the same volume instead of a painted cap.
  for (let i = 0; i < 72; i++) {
    const a = ((i + 0.25) / 72) * Math.PI * 2,
      points = [];
    for (let j = 3; j <= layers; j += 3) {
      const nearest = Math.round((a / (Math.PI * 2)) * segments),
        p = vertices[j * (segments + 1) + nearest].clone();
      p.x *= 1.003;
      p.z += Math.cos(a) * 0.002;
      points.push(p);
    }
    tube(root, points, 0.0008, i % 3 ? hairMat : matte('#d1c2a5'));
  }
  const part = [];
  for (let j = 6; j <= layers; j += 2) {
    const p = vertices[j * (segments + 1) + 1].clone();
    p.z += 0.0015;
    part.push(p);
  }
  tube(root, part, 0.0034, matte('#95846e'));
}
export function createSculptHead() {
  const head = new THREE.Group();
  head.name = 'Measured 3D head';
  const subdivided = subdivide(
    P.slice(0, 468).map((p) => p.clone()),
    PURRA_SHAPE.triangles,
    2
  );
  const geo = makeGeometry(subdivided.vertices, subdivided.faces),
    colors = [];
  const base = new THREE.Color('#dfb39e'),
    lip = new THREE.Color('#b98489'),
    cheek = new THREE.Color('#da9e91'),
    color = new THREE.Color();
  for (const p of subdivided.vertices) {
    color.copy(base);
    const blush = Math.exp(-(((Math.abs(p.x) - 0.235) / 0.11) ** 2 + ((p.y - 2.67) / 0.075) ** 2)) * 0.26;
    color.lerp(cheek, blush);
    if (inPolygon(p.x, p.y, LIPS)) color.copy(lip);
    colors.push(color.r, color.g, color.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const face = new THREE.Mesh(
    geo,
    new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.61, sheen: 0.09, side: THREE.DoubleSide })
  );
  head.add(face);
  face.castShadow = true;
  face.receiveShadow = true;
  const rim = OVAL.map((i) => P[i]),
    backVertices = [],
    backFaces = [],
    layers = 16;
  for (let j = 0; j <= layers; j++)
    for (const p of rim) {
      const a = ((j / layers) * Math.PI) / 2,
        c = Math.cos(a);
      backVertices.push(new THREE.Vector3(p.x * c, 2.78 + (p.y - 2.78) * c, p.z * c - 0.47 * Math.sin(a)));
    }
  for (let j = 0; j < layers; j++)
    for (let i = 0; i < rim.length; i++) {
      const a = j * rim.length + i,
        b = j * rim.length + ((i + 1) % rim.length);
      backFaces.push([a, b, a + rim.length], [b, b + rim.length, a + rim.length]);
    }
  const back = new THREE.Mesh(makeGeometry(backVertices, backFaces), skin);
  head.add(back);
  for (const side of [-1, 1]) {
    ellipsoid(head, skin, [side * 0.346, 2.765, -0.12], [0.043, 0.085, 0.032]);
    ellipsoid(head, matte('#c08e7c'), [side * 0.358, 2.765, -0.095], [0.019, 0.055, 0.007]);
  }
  addEyes(head);
  const mouthLine = [61, 78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 291].map((i) =>
    P[i].clone().add(new THREE.Vector3(0, 0, 0.003))
  );
  tube(head, mouthLine, 0.0015, matte('#92686e'));
  for (const index of [98, 327])
    ellipsoid(
      head,
      matte('#a37468'),
      P[index]
        .clone()
        .add(new THREE.Vector3(0, -0.001, 0.001))
        .toArray(),
      [0.008, 0.0025, 0.0025],
      16
    );
  hair(head);
  return head;
}
export function createSculptPurra() {
  const root = createBody();
  const head = new THREE.Group();
  const surface = createSculptHead();
  surface.position.y = -2.75;
  head.position.y = 2.75;
  head.add(surface);
  root.add(head);
  root.userData.head = head;
  return root;
}
export function animateStudy(root, time, running = true) {
  const stride = running ? Math.sin(time * 9) : 0;
  root.position.y = running ? Math.abs(Math.cos(time * 9)) * 0.035 : 0;
  for (const part of root.children) {
    if (part.userData.leg) {
      part.rotation.x = stride * part.userData.leg * 0.65;
      part.userData.knee.rotation.x = Math.max(0, -stride * part.userData.leg) * 1.05;
    }
    if (part.userData.arm) part.rotation.x = stride * part.userData.arm * 0.58;
  }
  if (root.userData.head) root.userData.head.rotation.z = running ? Math.sin(time * 9) * 0.012 : 0;
}
