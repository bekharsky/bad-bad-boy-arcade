import * as THREE from 'three';

const material = (color, roughness, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const brass = material('#e0a94c', .24, .57);
const highlight = material('#ffdfa0', .38, .33);
const red = material('#b3283d', .3, .12);
const darkRed = material('#6b202d', .48);
const wood = material('#86442e', .68);
const woodEnd = material('#ae6441', .57);
const velvet = material('#216759', .86);
const teal = material('#3c9d86', .52);
const ivory = material('#f1dbc2', .52);

function add(root, geometry, surface, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(geometry, surface);
  mesh.position.set(x, y, z);
  root.add(mesh);
  return mesh;
}

function box(root, surface, x, y, z, w, h, d) {
  return add(root, new THREE.BoxGeometry(w, h, d), surface, x, y, z);
}

function tube(root, surface, radius, points) {
  const curve = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point)));
  return add(root, new THREE.TubeGeometry(curve, points.length * 6, radius, 8), surface);
}

function runner(root, side) {
  const x = side * 1.02;
  const profile = [[-2.4, .29], [-2.03, .14], [-1.45, .12], [0, .12], [1.38, .12], [2.15, .18], [2.63, .44], [2.94, .86], [2.96, 1.16], [2.78, 1.33], [2.54, 1.31], [2.42, 1.13], [2.51, .99]];
  tube(root, brass, .105, profile.map(([z, y]) => [x, y, z]));
  tube(root, highlight, .034, profile.map(([z, y]) => [x + side * .088, y + .045, z]));
  for (const z of [-1.46, 1.13]) {
    tube(root, brass, .085, [[x, .16, z + .31], [x, .37, z + .13], [x, .68, z], [x, .91, z]]);
    const collar = add(root, new THREE.CylinderGeometry(.145, .145, .11, 10), highlight, x, .75, z);
    collar.rotation.y = Math.PI / 10;
  }
  add(root, new THREE.SphereGeometry(.136, 14, 8), highlight, x, .99, 2.51);
}

function chassis(root) {
  for (const x of [-.89, .89]) box(root, wood, x, .95, -.23, .18, .25, 3.95);
  for (const z of [-1.46, 1.13]) {
    box(root, woodEnd, 0, .94, z, 2.29, .18, .23);
    for (const x of [-1.05, 1.05]) box(root, brass, x, .94, z, .13, .2, .246);
  }
  for (let i = 0; i < 7; i++) box(root, i % 2 ? wood : woodEnd, (i - 3) * .263, 1.075, -.24, .245, .105, 3.71);
}

function body(root) {
  const outline = new THREE.Shape();
  outline.moveTo(-2.1, 1.04);
  outline.lineTo(1.5, 1.04);
  outline.quadraticCurveTo(1.81, 1.12, 1.96, 2.12);
  outline.bezierCurveTo(1.36, 2.19, 1.11, 1.59, .45, 1.58);
  outline.bezierCurveTo(-.65, 1.45, -1.15, 1.95, -2.1, 2.35);
  outline.quadraticCurveTo(-2.23, 1.84, -2.1, 1.04);
  for (const x of [-1.01, 1.12]) {
    const panel = add(root, new THREE.ExtrudeGeometry(outline, {
      depth: .11, bevelThickness: .04, bevelSize: .045, bevelSegments: 2, curveSegments: 16,
    }), red, x);
    panel.rotation.y = -Math.PI / 2;
    const edgeX = x > 0 ? x + .04 : x - .15;
    tube(root, brass, .044, outline.getPoints(14).map(({ x: z, y }) => [edgeX, y, z]));
    tube(root, highlight, .027, [[edgeX, 1.31, -1.83], [edgeX, 1.23, -.93], [edgeX, 1.2, .16], [edgeX, 1.23, 1.24], [edgeX, 1.59, 1.74]]);
    const medallion = add(root, new THREE.CylinderGeometry(.16, .16, .057, 8), brass, edgeX, 1.44, -.96);
    medallion.rotation.z = Math.PI / 2;
    const inset = box(root, ivory, edgeX + Math.sign(x) * .034, 1.44, -.96, .045, .13, .13);
    inset.rotation.x = Math.PI / 4;
  }
  const back = box(root, darkRed, 0, 1.68, -2.02, 1.99, 1.26, .19);
  back.rotation.x = .11;
  box(root, brass, 0, 2.31, -2.091, 2.24, .09, .17);
  const dash = box(root, red, 0, 1.6, 1.7, 2.08, .99, .14);
  dash.rotation.x = .36;
  tube(root, brass, .063, [[-1.08, 2.09, 1.9], [-.57, 2.17, 1.91], [0, 2.19, 1.91], [.57, 2.17, 1.91], [1.08, 2.09, 1.9]]);
  for (const x of [-.72, .72]) {
    box(root, brass, x, 1.83, 1.83, .25, .34, .21);
    box(root, ivory, x, 1.83, 1.95, .17, .24, .05);
  }
}

function seat(root) {
  for (const x of [-.63, .63]) box(root, wood, x, 1.29, .03, .16, .41, .63);
  box(root, brass, 0, 1.49, .03, 1.8, .13, .8);
  box(root, velvet, 0, 1.62, .03, 1.74, .19, .75);
  const back = box(root, velvet, 0, 1.89, -.36, 1.74, .57, .15);
  back.rotation.x = .16;
  tube(root, highlight, .029, [[-.87, 1.96, -.39], [-.81, 2.15, -.4], [0, 2.21, -.4], [.81, 2.15, -.4], [.87, 1.96, -.39]]);
  for (const x of [-.55, -.18, .18, .55]) add(root, new THREE.SphereGeometry(.036, 8, 6), brass, x, 1.92, -.274);
}

function gift(root, x, y, z, w, h, d, color, ribbon, angle) {
  const parcel = new THREE.Group();
  root.add(parcel);
  parcel.position.set(x, y, z);
  parcel.rotation.y = angle;
  box(parcel, color, 0, h / 2, 0, w, h, d);
  box(parcel, color, 0, h, 0, w + .045, .08, d + .045);
  box(parcel, ribbon, 0, h / 2 + .03, 0, w * .18, h + .085, d + .055);
  box(parcel, ribbon, 0, h / 2 + .03, 0, w + .055, h + .085, d * .18);
  for (const side of [-1, 1]) tube(parcel, ribbon, .021, [
    [0, h + .045, 0], [side * w * .25, h + .17, .035], [side * w * .29, h + .1, -.065], [0, h + .045, 0],
  ]);
}

function cargo(root) {
  box(root, woodEnd, 0, 1.18, -1.33, 1.88, .11, 1.32);
  for (const x of [-.91, .91]) box(root, brass, x, 1.26, -1.33, .095, .16, 1.34);
  for (const z of [-1.97, -.69]) box(root, brass, 0, 1.26, z, 1.83, .16, .1);
  gift(root, -.4, 1.24, -1.35, .78, .74, .91, teal, highlight, -.09);
  gift(root, .43, 1.24, -1.34, .71, .56, .82, ivory, red, .13);
  gift(root, -.18, 2.02, -1.33, .61, .38, .55, darkRed, highlight, -.26);
}

// All meshes share the same final coordinate system so they snap together.
export function createSleighParts() {
  return [
    ['Left runner', root => runner(root, -1), [-1, .4, 0]],
    ['Right runner', root => runner(root, 1), [1, .4, 0]],
    ['Wooden chassis', chassis, [1, .26, -.14]],
    ['Lacquered body', body, [0, 1, .45]],
    ['Driver’s seat', seat, [.4, 1, .15]],
    ['Gift rack', cargo, [0, 1, -.6]],
  ].map(([name, build, approach]) => {
    const model = new THREE.Group();
    model.name = name;
    build(model);
    return { name, model, approach: new THREE.Vector3(...approach).normalize() };
  });
}

export function createSleighPartDisplay(part, span) {
  const model = part.model.clone();
  const bounds = new THREE.Box3().setFromObject(model);
  const size = bounds.getSize(new THREE.Vector3());
  const pivot = new THREE.Group();
  model.position.sub(bounds.getCenter(new THREE.Vector3()));
  pivot.add(model);
  pivot.scale.setScalar(span / Math.max(size.x, size.y, size.z));
  return pivot;
}
