import * as THREE from 'three';
import { createSceneryModel } from './scenery-model.js';

const WHITE = '#eee9da', TRIM = '#fff9e8', STONE = '#b7b5aa';
const COPPER = '#548576', SEAM = '#376858', GOLD = '#c6aa63';

function cylinder(model, color, x, y, z, radius, height, segments = 16) {
  model.geometry(color, new THREE.CylinderGeometry(radius, radius, height, segments).translate(x, y, z));
}

// Local facade coordinates let the four porticos share the same proportions.
function section(model, x, z, turn = 0) {
  return {
    geometry(color, geometry) { model.geometry(color, geometry.rotateY(turn).translate(x, 0, z)); },
    box(color, px, y, pz, w, h, d, rotation = 0) {
      this.geometry(color, new THREE.BoxGeometry(w, h, d).rotateZ(rotation).translate(px, y, pz));
    },
  };
}

function arch(width, height, depth) {
  const radius = width / 2, shoulder = height - radius;
  const shape = new THREE.Shape();
  shape.moveTo(-radius, 0); shape.lineTo(radius, 0); shape.lineTo(radius, shoulder);
  shape.absarc(0, shoulder, radius, 0, Math.PI, false); shape.closePath();
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 8 });
}

function windowFrame(model, x, bottom, z, width, height, turn = 0) {
  const face = section(model, x, z, turn);
  face.geometry('#c5c7bb', arch(width + .2, height + .12, .12).translate(0, bottom - .06, 0));
  face.geometry(TRIM, arch(width, height, .14).translate(0, bottom, .05));
  face.geometry('#415b5d', arch(width - .22, height - .2, .045).translate(0, bottom + .1, .18));
  face.box(TRIM, 0, bottom - .06, .17, width + .4, .13, .36);
  face.box('#e0ddca', 0, bottom + height * .43, .245, .045, height * .73, .025);
  for (const y of [.28, .52, .75]) face.box('#e0ddca', 0, bottom + height * y, .245, width - .23, .04, .025);
  const centre = new THREE.Vector3(0, bottom + height - width / 2, .25);
  for (const angle of [-Math.PI / 4, Math.PI / 4]) {
    const end = centre.clone().add(new THREE.Vector3(Math.sin(angle) * (width / 2 - .12), Math.cos(angle) * (width / 2 - .12), 0));
    face.geometry(TRIM, new THREE.TubeGeometry(new THREE.LineCurve3(centre, end), 1, .018, 4, false));
  }
}

function column(model, x, base, z, height, radius = .34) {
  model.box(STONE, x, base + .1, z, radius * 2.7, .2, radius * 2.7);
  for (const [y, r, h] of [[.25, 1.24, .12], [.35, 1.1, .1]]) cylinder(model, TRIM, x, base + y, z, radius * r, h);
  const shaft = height - .95;
  model.geometry(WHITE, new THREE.CylinderGeometry(radius * .9, radius, shaft, 20).translate(x, base + .42 + shaft / 2, z));
  // Shallow flutes and layered acanthus/volute shapes catch light at game scale.
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6;
    model.geometry('#d7d8cd', new THREE.CylinderGeometry(.015, .019, shaft - .12, 4)
      .translate(x + Math.sin(a) * radius * .965, base + .42 + shaft / 2, z + Math.cos(a) * radius * .965));
  }
  cylinder(model, TRIM, x, base + height - .5, z, radius * 1.08, .14);
  model.geometry(WHITE, new THREE.CylinderGeometry(radius * 1.45, radius, .34, 8).translate(x, base + height - .29, z));
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4;
    model.geometry(TRIM, new THREE.SphereGeometry(radius * .25, 6, 4).scale(.75, 1.4, 1)
      .translate(x + Math.sin(a) * radius * 1.1, base + height - .35, z + Math.cos(a) * radius * 1.1));
  }
  for (const dx of [-1, 1]) for (const dz of [-1, 1]) {
    model.geometry(TRIM, new THREE.TorusGeometry(radius * .23, .045, 4, 8).translate(x + dx * radius, base + height - .2, z + dz * radius));
  }
  model.box(TRIM, x, base + height - .04, z, radius * 3.05, .16, radius * 3.05);
}

function pediment(model, y, front, width, rise, depth) {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0); shape.lineTo(width / 2, 0); shape.lineTo(0, rise); shape.closePath();
  model.geometry(WHITE, new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false }).translate(0, y, front - depth));
  const inset = new THREE.Shape();
  inset.moveTo(-width * .42, .19); inset.lineTo(width * .42, .19); inset.lineTo(0, rise - .23); inset.closePath();
  model.geometry('#d9d9cd', new THREE.ShapeGeometry(inset).translate(0, y, front + .015));
  const length = Math.hypot(width / 2, rise), angle = Math.atan2(rise, width / 2);
  for (const side of [-1, 1]) {
    model.box(TRIM, side * width / 4, y + rise / 2 + .05, front + .07, length + .15, .18, .3, -side * angle);
    model.box('#c6cbbf', side * width / 4, y + rise / 2 - .14, front + .045, length - .12, .06, .18, -side * angle);
  }
  for (const [dy, expand, h] of [[-.06, .45, .2], [-.27, .18, .13], [-.45, .3, .15]]) {
    model.box(TRIM, 0, y + dy, front - depth / 2, width + expand, h, depth + .25);
  }
  for (let x = -width / 2 + .2; x < width / 2; x += .38) model.box('#e7e4d6', x, y - .18, front + .16, .16, .16, .25);
}

function portico(model, x, z, turn, base, width, count, rise) {
  const face = section(model, x, z, turn), height = 5.65;
  face.box(STONE, 0, base + .02, 1, width + .65, .22, 3.9);
  for (let i = 0; i < count; i++) {
    const px = (i / (count - 1) - .5) * (width - 3.2);
    column(face, px, base + .14, 1.65, height, count === 6 ? .34 : .29);
    face.box(TRIM, px, base + 2.9, -.03, .32, 5.7, .15);
  }
  face.box(WHITE, 0, base + height + .3, 1.05, width - .2, .65, 3.1);
  face.box('#d6d8cd', 0, base + height + .01, 2.64, width - .2, .07, .06);
  pediment(face, base + 6.21, 2.7, width, rise, 3.8);
}

function clock(model, x, y, z, radius, turn = 0) {
  const face = section(model, x, z, turn);
  face.geometry('#e7dbc0', new THREE.CircleGeometry(radius, 24).translate(0, y, .04));
  face.geometry(GOLD, new THREE.TorusGeometry(radius, .035, 4, 24).translate(0, y, .05));
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6;
    face.box('#716f58', Math.sin(a) * radius * .8, y + Math.cos(a) * radius * .8, .065, .025, .07, .02, -a);
  }
  face.box('#545e53', .04, y + radius * .22, .08, .045, radius * .6, .025, -.35);
  face.box('#545e53', -radius * .19, y + .03, .085, radius * .55, .045, .025, -.2);
}

function dome(model, x, base, z, radius, height, drumHeight = .8, main = false) {
  const drum = section(model, x, z);
  drum.geometry(WHITE, new THREE.CylinderGeometry(radius * .87, radius * .87, drumHeight, 12)
    .rotateY(Math.PI / 12).translate(0, base - drumHeight / 2, 0));
  const rings = [[-drumHeight + .08, .96, .18], [-.28, .94, .14], [-.12, 1.04, .16], [.03, 1.02, .16]];
  for (const [dy, size, h] of rings) cylinder(model, TRIM, x, base + dy, z, radius * size, h, 32);
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6, r = radius * .848;
    if (main) {
      windowFrame(model, x + Math.sin(a) * r, base - drumHeight + .38, z + Math.cos(a) * r, .7, 1.7, a);
      const pa = a + Math.PI / 12;
      const face = section(model, x + Math.sin(pa) * radius * .86, z + Math.cos(pa) * radius * .86, pa);
      face.box(TRIM, 0, base - drumHeight / 2, .035, .21, drumHeight - .25, .2);
      face.box(TRIM, 0, base - .45, .06, .36, .16, .25);
    } else {
      const face = section(model, x + Math.sin(a) * r, z + Math.cos(a) * r, a);
      face.box('#60756d', 0, base - drumHeight / 2, .03, .21, drumHeight * .57, .04);
    }
  }
  if (main) {
    for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      clock(model, x + Math.sin(a) * radius * .88, base - .87, z + Math.cos(a) * radius * .88, .27, a);
    }
    for (let i = 0; i < 36; i++) {
      const a = i * Math.PI / 18;
      const face = section(model, x + Math.sin(a) * radius * .95, z + Math.cos(a) * radius * .95, a);
      face.box('#e1e1d2', 0, base - .22, .04, .1, .17, .17);
    }
  }
  // A shallow copper crown over a tall drum, rather than an oversized hemisphere.
  const profile = [[1, 0], [.995, .12], [.94, .36], [.76, .66], [.46, .88], [.15, .99], [0, 1]];
  model.geometry(COPPER, new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r * radius, y * height)), 32).translate(x, base + .08, z));
  for (let i = 0; i < 16; i++) {
    const a = i * Math.PI / 8;
    const points = profile.slice(0, -1).map(([r, y]) => new THREE.Vector3(x + Math.sin(a) * (r * radius + .015), base + .08 + y * height, z + Math.cos(a) * (r * radius + .015)));
    model.geometry(SEAM, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 16, main ? .025 : .018, 4, false));
    if (i % 2 === 0) model.geometry(GOLD, new THREE.SphereGeometry(main ? .055 : .045, 6, 4)
      .translate(x + Math.sin(a) * radius * .91, base + height * .43, z + Math.cos(a) * radius * .91));
  }
  const top = base + height + .08;
  cylinder(model, WHITE, x, top + .16, z, radius * .105, .32, 12);
  model.geometry(COPPER, new THREE.SphereGeometry(radius * .14, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2).translate(x, top + .32, z));
  const crossY = top + .35 + radius * .14;
  model.geometry(GOLD, new THREE.SphereGeometry(.115, 8, 6).translate(x, crossY, z));
  model.box(GOLD, x, crossY + .47, z, .065, .92, .065);
  model.box(GOLD, x, crossY + .58, z, .46, .065, .065);
}

function apostle(model, x, base, z, turn = 0) {
  const figure = section(model, x, z, turn), zinc = '#abb6ae';
  figure.box('#d2d6c9', 0, base + .07, 0, .48, .14, .43);
  figure.geometry(zinc, new THREE.CylinderGeometry(.12, .22, .68, 7).translate(0, base + .49, 0));
  figure.geometry(zinc, new THREE.SphereGeometry(.13, 8, 6).scale(.9, 1.15, 1).translate(0, base + .99, 0));
  figure.box(zinc, -.2, base + .66, .04, .13, .42, .16, -.35);
  figure.box(zinc, .21, base + .79, .08, .12, .42, .14, -.55);
  figure.box('#9ba99e', -.23, base + .57, .16, .22, .26, .09, -.1);
  figure.box(zinc, .3, base + .65, -.02, .045, .88, .045);
}

export function createCathedral() {
  const church = createSceneryModel('Helsinki Cathedral');
  const { box } = church;
  const base = 3.96, z = -35, wallHeight = 6.05;
  box(STONE, 0, base - .16, z, 23, .32, 16.3);
  box(WHITE, 0, base + wallHeight / 2, z, 12.6, wallHeight, 14.2);
  box(WHITE, 0, base + wallHeight / 2, z, 22, wallHeight, 7.1);
  for (const [w, d] of [[12.6, 14.2], [22, 7.1]]) {
    for (const [dy, expand, h] of [[.22, .18, .24], [5.3, .18, .14], [5.68, .4, .18], [6, .62, .22]]) {
      box(TRIM, 0, base + dy, z, w + expand, h, d + expand);
    }
    box('#6a7e75', 0, base + 6.17, z, w + .55, .18, d + .55);
  }
  // Pilasters and tall round-headed windows articulate the cross-shaped body.
  for (const side of [-1, 1]) {
    for (const dx of [-9.5, -7.4, 7.4, 9.5]) {
      windowFrame(church, dx, base + 1.12, z + side * 3.6, .85, 2.7, side < 0 ? Math.PI : 0);
    }
    for (const dz of [-5.8, -3.7, 3.7, 5.8]) {
      windowFrame(church, side * 6.35, base + 1.12, z + dz, .85, 2.7, side * Math.PI / 2);
    }
    for (const dx of [-5.95, -1.8, 1.8, 5.95]) {
      const face = section(church, dx, z + side * 7.15, side < 0 ? Math.PI : 0);
      face.box(TRIM, 0, base + 2.95, .07, .3, 5.7, .2);
      face.box(TRIM, 0, base + 5.6, .13, .52, .22, .3);
    }
  }
  for (const [x, fz, turn, width, count, rise] of [
    [0, -27.9, 0, 14.2, 6, 1.95], [0, -42.1, Math.PI, 14.2, 6, 1.95],
    [-11, z, -Math.PI / 2, 8.2, 4, 1.5], [11, z, Math.PI / 2, 8.2, 4, 1.5],
  ]) portico(church, x, fz, turn, base, width, count, rise);
  // One central double door with a glazed transom; side panels carry reliefs.
  box(STONE, 0, base + 1.55, -27.78, 1.9, 3.1, .2);
  box('#6e5740', 0, base + 1.3, -27.63, 1.5, 2.6, .12);
  for (const side of [-1, 1]) {
    for (const y of [.62, 1.63]) box('#8c7251', side * .38, base + y, -27.54, .56, .68, .06);
    box(GOLD, side * .12, base + 1.25, -27.49, .04, .24, .04);
  }
  windowFrame(church, 0, base + 2.72, -27.78, 1.56, 1.35);
  box(TRIM, 0, base + 4.23, -27.65, 2.3, .22, .5);
  for (const x of [-4.1, 4.1]) {
    box(TRIM, x, base + 4.12, -27.75, 2.25, 1.05, .18);
    box('#d0d3c5', x, base + 4.12, -27.63, 1.95, .78, .06);
    for (let i = -1; i <= 1; i++) {
      cylinder(church, '#e5e4d6', x + i * .45, base + 4.05, -27.55, .09, .42, 6);
      church.geometry('#e5e4d6', new THREE.SphereGeometry(.1, 6, 4).translate(x + i * .45, base + 4.34, -27.55));
    }
  }
  // The tall, windowed central drum is the main difference from a generic dome.
  box(WHITE, 0, 10.5, z, 5.6, 1.3, 5.6);
  dome(church, 0, 14.35, z, 2.67, 2.0, 4.1, true);
  for (const x of [-8, 8]) for (const dz of [-4.35, 4.35]) {
    box(WHITE, x, 10.4, z + dz, 2.9, 2.2, 2.9);
    for (const y of [9.5, 11.25, 11.6]) box(TRIM, x, y, z + dz, 3.15, .16, 3.15);
    for (const side of [-1, 1]) {
      box(TRIM, x + side * 1.27, 10.45, z + dz + 1.48, .19, 1.7, .15);
      box(TRIM, x + side * 1.27, 10.45, z + dz - 1.48, .19, 1.7, .15);
    }
    dome(church, x, 12.08, z + dz, 1.43, 1.14, .55);
  }
  // Three sculptures on each of the four pediments, batched into one material.
  for (const side of [-1, 1]) {
    const frontZ = side > 0 ? -25.12 : -44.88, turn = side > 0 ? 0 : Math.PI;
    apostle(church, 0, base + 8.2, frontZ, turn);
    for (const x of [-6.95, 6.95]) apostle(church, x, base + 6.35, frontZ, turn);
    const sideX = side * 13.7;
    apostle(church, sideX, base + 7.75, z, side * Math.PI / 2);
    for (const dz of [-3.9, 3.9]) apostle(church, sideX, base + 6.35, z + dz, side * Math.PI / 2);
  }
  for (const side of [-1, 1]) {
    box(WHITE, side * 19.2, base + 1.65, -28.4, 5.2, 3.3, 5.2);
    box(TRIM, side * 19.2, base + 3.35, -28.4, 5.5, .22, 5.5);
    church.geometry('#647d72', new THREE.ConeGeometry(4.05, 1.4, 4).rotateY(Math.PI / 4).translate(side * 19.2, base + 4.1, -28.4));
    windowFrame(church, side * 19.2, base + .22, -25.77, 1.22, 2.35);
    for (const dx of [-2.2, 2.2]) box(TRIM, side * 19.2 + dx, base + 1.65, -25.75, .22, 3.1, .18);
  }
  clock(church, -19.2, base + 2.8, -25.55, .31);
  return church.finish({ vertexColors: true });
}

export function createCathedralSteps() {
  const steps = createSceneryModel('Cathedral steps');
  // Eighteen real risers; their footprint is blocked at the stair foot because
  // the combat simulation runs on the square's level ground.
  for (let i = 0; i < 18; i++) {
    const h = (i + 1) * .22, z = -17.24 - i * .48;
    steps.box(i % 2 ? '#b0b1ac' : '#bec0b8', 0, h / 2, z, 28, h, .48);
    steps.box('#d5d4c9', 0, h + .015, z + .22, 28, .03, .035);
  }
  steps.box('#a5a9a3', 0, 1.98, -34.3, 44, 3.96, 17.8);
  for (const x of [-14.5, 14.5]) {
    steps.box(STONE, x, 1.95, -21.3, .65, 3.9, 8.7);
    steps.box('#d9d8cb', x, 4, -23.2, .85, .16, 5);
  }
  return steps.finish();
}

export function createAlexanderMonument() {
  const statue = createSceneryModel('Alexander II monument');
  const granite = '#a78471', bronze = '#354f44';
  for (const [width, height, y] of [[3.6, .25, .125], [2.9, .22, .36], [2.1, .4, .67], [1.4, 2.0, 1.85], [1.8, .25, 2.95]]) {
    statue.box(granite, 0, y, 0, width, height, width);
  }
  statue.box(bronze, 0, 3.8, 0, .6, 1.15, .4);
  for (const side of [-1, 1]) {
    cylinder(statue, bronze, side * .17, 3.25, 0, .1, .5, 8);
    statue.box(bronze, side * .42, 3.9 + side * .1, 0, .5, .15, .18, side * .45);
  }
  statue.geometry(bronze, new THREE.SphereGeometry(.23, 10, 8).scale(.85, 1.15, 1).translate(0, 4.64, 0));
  cylinder(statue, bronze, 0, 4.84, 0, .24, .07, 12);
  for (const [x, z] of [[-1.25, 0], [1.25, 0], [0, -1.25], [0, 1.25]]) {
    statue.geometry(bronze, new THREE.SphereGeometry(.2, 8, 6).translate(x, 1.4, z));
    cylinder(statue, bronze, x, .98, z, .18, .62, 8);
  }
  const root = statue.finish();
  root.position.z = -4.5;
  return root;
}
