import * as THREE from 'three';
import { createSceneryModel } from './scenery-model.js';

const WHITE = '#eee9da', TRIM = '#fff9e8', STONE = '#b7b5aa';
const COPPER = '#487d70', SEAM = '#356359', GOLD = '#c6aa63';

function cylinder(model, color, x, y, z, radius, height, segments = 16) {
  model.geometry(color, new THREE.CylinderGeometry(radius, radius, height, segments).translate(x, y, z));
}

function pediment(model, x, y, z, width, rise, depth) {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0); shape.lineTo(width / 2, 0); shape.lineTo(0, rise); shape.closePath();
  model.geometry(WHITE, new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false }).translate(x, y, z - depth));
  model.box(TRIM, x, y, z - depth / 2, width + .3, .18, depth + .2);
  // A recessed triangular tympanum reads clearly even from the game camera.
  const inset = new THREE.Shape();
  inset.moveTo(-width * .37, .17); inset.lineTo(width * .37, .17); inset.lineTo(0, rise * .8); inset.closePath();
  model.geometry('#d5d4c8', new THREE.ShapeGeometry(inset).translate(x, y, z + .015));
}

function dome(model, x, base, z, radius, height) {
  cylinder(model, WHITE, x, base - .63, z, radius * .86, 1.26, 12);
  cylinder(model, TRIM, x, base - .03, z, radius * 1.03, .18, 24);
  for (let i = 0; i < 12; i++) {
    const angle = i * Math.PI / 6;
    const window = new THREE.BoxGeometry(radius * .17, .65, .045)
      .translate(0, base - .65, radius * .866).rotateY(angle).translate(x, 0, z);
    model.geometry('#52696b', window);
  }
  model.geometry(COPPER, new THREE.SphereGeometry(radius, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2)
    .scale(1, height / radius, 1).translate(x, base, z));
  for (let i = 0; i < 12; i++) {
    const angle = i * Math.PI / 6;
    const points = Array.from({ length: 9 }, (_, j) => {
      const a = j / 8 * Math.PI / 2;
      return new THREE.Vector3(x + Math.sin(a) * Math.cos(angle) * (radius + .018), base + Math.cos(a) * height, z + Math.sin(a) * Math.sin(angle) * (radius + .018));
    });
    model.geometry(SEAM, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 12, .025, 4, false));
  }
  const top = base + height;
  cylinder(model, WHITE, x, top + .28, z, radius * .13, .58, 10);
  model.geometry(COPPER, new THREE.SphereGeometry(radius * .2, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2).translate(x, top + .57, z));
  const crossY = top + .7 + radius * .2;
  model.geometry(GOLD, new THREE.SphereGeometry(.12, 8, 6).translate(x, crossY, z));
  model.box(GOLD, x, crossY + .4, z, .075, .78, .075);
  model.box(GOLD, x, crossY + .48, z, .43, .07, .075);
}

export function createCathedral() {
  const church = createSceneryModel('Helsinki Cathedral');
  const { box } = church;
  const base = 3.96, z = -35;
  // Greek-cross plan, six-column portico and five oxidised copper domes.
  box(STONE, 0, base - .16, z, 22.8, .32, 16.3);
  box(WHITE, 0, base + 2.7, z, 11.2, 5.4, 14.2);
  box(WHITE, 0, base + 2.7, z, 22, 5.4, 7.1);
  for (const [w, d] of [[11.6, 14.6], [22.4, 7.5]]) {
    box(TRIM, 0, base + 5.25, z, w, .34, d);
    box('#677572', 0, base + 5.55, z, w, .25, d);
  }
  box(WHITE, 0, 10.6, z, 6.8, 2.5, 6.8);
  box(TRIM, 0, 11.85, z, 7.1, .22, 7.1);
  dome(church, 0, 13.15, z, 3.1, 2.6);
  for (const x of [-8.1, 8.1]) for (const dz of [-4.3, 4.3]) {
    box(WHITE, x, 9.45, z + dz, 2.9, 1.5, 2.9);
    box(TRIM, x, 10.2, z + dz, 3.1, .18, 3.1);
    dome(church, x, 11.3, z + dz, 1.42, 1.35);
  }
  box(TRIM, 0, base + .08, -27.4, 10.6, .2, 3.7);
  for (const x of [-3.7, -2.22, -.74, .74, 2.22, 3.7]) {
    cylinder(church, STONE, x, base + .27, -26.35, .41, .24);
    cylinder(church, WHITE, x, base + 2.6, -26.35, .29, 4.5);
    cylinder(church, TRIM, x, base + 4.91, -26.35, .43, .23);
  }
  box(TRIM, 0, base + 5.08, -27.2, 9.4, .3, 3.8);
  pediment(church, 0, base + 5.25, -25.3, 9.8, 1.8, 3.8);
  for (const x of [-3.4, 0, 3.4]) {
    box(STONE, x, base + 1.4, -27.86, 1.45, 2.8, .13);
    box('#33554e', x, base + 1.35, -27.76, 1.12, 2.6, .08);
    box(GOLD, x + .28, base + 1.3, -27.7, .045, .22, .04);
  }
  for (const side of [-1, 1]) {
    for (let n = -2; n <= 2; n++) {
      box(STONE, side * 5.65, base + 2.5, z + n * 2.4, .13, 2.8, 1.02);
      box('#546a68', side * 5.73, base + 2.5, z + n * 2.4, .06, 2.5, .75);
    }
    // Matching terrace pavilions frame the stair, rather than a flat white wall.
    box(WHITE, side * 19.2, base + 1.65, -28.4, 5.2, 3.3, 5.2);
    box(TRIM, side * 19.2, base + 3.35, -28.4, 5.5, .22, 5.5);
    church.geometry('#647d72', new THREE.ConeGeometry(4.05, 1.4, 4).rotateY(Math.PI / 4).translate(side * 19.2, base + 4.1, -28.4));
    box('#3d5c57', side * 19.2, base + 1.2, -25.77, 1.1, 2.4, .08);
  }
  // A few rooftop apostle silhouettes give the roof its recognisable outline.
  for (const x of [-5.25, 5.25]) for (const dz of [-6.6, 6.6]) {
    cylinder(church, '#bfc2ba', x, 10.0, z + dz, .13, .66, 8);
    church.geometry('#bfc2ba', new THREE.SphereGeometry(.17, 8, 6).translate(x, 10.48, z + dz));
  }
  return church.finish();
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
