import * as THREE from 'three';
import { createSceneryModel as model, destination } from './scenery-model.js';
import { createFerry } from './ferry.js';

const finish = scenery => scenery.finish({ vertexColors: true });
const sphere = (scenery, color, x, y, z, sx, sy, sz) => scenery.geometry(color,
  new THREE.SphereGeometry(1, 12, 8).scale(sx, sy, sz).translate(x, y, z));
const cylinder = (scenery, color, x, y, z, top, bottom, height, sides = 16) => scenery.geometry(color,
  new THREE.CylinderGeometry(top, bottom, height, sides).translate(x, y, z));

// The modern white theatre's curved east end overlooks the start of the run.
export function createSwedishTheatre() {
  const m = model('Svenska Teatern'), white = '#eee9d9', trim = '#d0cebf';
  m.box(white, -4, 4.5, 3, 18, 9, 23);
  cylinder(m, white, 1, 4.5, -5, 8.5, 8.5, 9, 32);
  cylinder(m, trim, 1, 9.05, -5, 8.7, 8.7, .25, 32);
  cylinder(m, '#69796e', 1, 9.3, -5, 8.2, 8.2, .25, 32);
  m.box(trim, -4, 9.1, 3, 18.3, .25, 23.3);
  // Tall window bands curve with the facade rather than a square block.
  for (let i = 0; i < 12; i++) {
    const angle = -Math.PI / 2 + i / 11 * Math.PI;
    const x = 1 + Math.cos(angle) * 8.53, z = -5 + Math.sin(angle) * 8.53;
    m.geometry('#45616a', new THREE.BoxGeometry(.12, 2.3, .66).rotateY(-angle).translate(x, 5.9, z));
    m.geometry(trim, new THREE.BoxGeometry(.17, .14, .8).rotateY(-angle).translate(x, 7.13, z));
  }
  for (let z = -2; z <= 12; z += 2.5) {
    m.box('#365360', 5.05, 1.6, z, .07, 2.8, 1.6);
    m.box(white, 5.2, 3.2, z, .4, .2, 2);
  }
  m.box('#818b7b', 7.5, 3.3, -2, 5.8, .22, 8);
  for (const z of [-5.4, 1.4]) cylinder(m, '#c6cbb9', 9.6, 1.6, z, .1, .1, 3.2, 8);
  const root = finish(m);
  const sign = destination('SVENSKA TEATERN', 8, .7);
  sign.rotation.y = Math.PI / 2; sign.position.set(9.58, 3.85, -5);
  root.add(sign);
  return root;
}

export function createKappeli() {
  const m = model('Kappeli restaurant'), cream = '#ded9ba', green = '#546f5b', glass = '#769f9c';
  m.box('#afa78f', 0, .2, 0, 18, .4, 10);
  m.box(cream, 0, 2.25, 0, 15.5, 4.1, 8.7);
  // Glass veranda and a low copper roof, with glazed octagonal end pavilions.
  for (const side of [-1, 1]) {
    cylinder(m, green, side * 7.7, 4.65, 0, 0, 4.3, 2, 8);
    cylinder(m, glass, side * 7.7, 2.3, 0, 3.6, 3.6, 4.1, 8);
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      m.box(cream, side * 7.7 + Math.cos(a) * 3.6, 2.4, Math.sin(a) * 3.6, .16, 4.4, .16);
    }
    for (let x = -5.8; x < 6; x += 1.45) {
      m.box(glass, x, 2.3, side * 4.4, 1.25, 3.1, .06);
      m.box(cream, x + .7, 2.4, side * 4.48, .11, 3.8, .14);
    }
    m.box(green, 0, 4.5, side * 1.9, 15.8, .3, 5.3);
    for (let x = -7; x <= 7; x += 2.8) {
      cylinder(m, '#e6debd', x, .9, side * 7, .8, .8, .12, 12);
      cylinder(m, '#65745d', x, .5, side * 7, .06, .18, .8, 8);
      for (const offset of [-1.1, 1.1]) m.box('#566955', x + offset, .5, side * 7, .5, .9, .55);
    }
  }
  cylinder(m, green, 0, 5.25, 0, .9, 1.25, 1.1, 8);
  cylinder(m, '#d8cda2', 0, 6, 0, .04, .04, .6, 6);
  return finish(m);
}

export function createRuneberg() {
  const m = model('Runeberg monument');
  m.box('#a99c89', 0, .3, 0, 3.2, .6, 3.2);
  m.box('#ae9d8c', 0, 1.55, 0, 1.65, 2, 1.65);
  m.box('#5d7764', 0, 3.5, 0, .65, 1.8, .48);
  sphere(m, '#698773', 0, 4.65, 0, .29, .36, .3);
  for (const x of [-.2, .2]) cylinder(m, '#57705f', x, 2.6, 0, .12, .13, .8, 8);
  return finish(m);
}

export function createHavisAmanda() {
  const m = model('Havis Amanda fountain'), granite = '#b99b90', bronze = '#528575';
  cylinder(m, '#9c8279', 0, .12, 0, 4.2, 4.35, .24, 48);
  cylinder(m, granite, 0, .38, 0, 3.9, 4.1, .4, 48);
  cylinder(m, '#649ba0', 0, .61, 0, 3.65, 3.65, .08, 48);
  m.geometry('#cfafa1', new THREE.TorusGeometry(3.85, .22, 8, 48).rotateX(Math.PI / 2).translate(0, .65, 0));
  cylinder(m, granite, 0, 1.1, 0, 1.05, 1.5, .95);
  cylinder(m, '#6e9682', 0, 1.7, 0, .72, 1.15, .45);
  // A small, free-standing bronze figure with a contrapposto silhouette.
  for (const [x, lean] of [[-.21, -.1], [.2, .12]]) {
    m.geometry(bronze, new THREE.CylinderGeometry(.13, .09, 1.1, 10).rotateZ(lean).translate(x, 2.35, 0));
    sphere(m, bronze, x, 1.82, .12, .14, .09, .25);
  }
  sphere(m, bronze, -.04, 2.98, 0, .38, .34, .25);
  sphere(m, bronze, -.08, 3.43, 0, .3, .47, .23);
  sphere(m, '#618e7a', -.07, 3.67, .09, .34, .25, .2);
  cylinder(m, bronze, -.12, 3.98, 0, .12, .14, .23, 10);
  sphere(m, bronze, -.18, 4.25, .03, .23, .3, .23);
  sphere(m, '#477568', -.16, 4.4, -.07, .25, .2, .23);
  for (const side of [-1, 1]) {
    m.geometry(bronze, new THREE.CylinderGeometry(.1, .075, .9, 10).rotateZ(side * .2).translate(side * .4 - .08, 3.34, 0));
    sphere(m, bronze, side * .49 - .08, 2.91, .06, .09, .14, .1);
  }
  // Four sea lions and their arcing jets surround the pink granite basin.
  const jets = model('Amanda water jets');
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2, x = Math.cos(a) * 2.95, z = Math.sin(a) * 2.95;
    sphere(m, '#548675', x, .95, z, .45, .35, .72);
    sphere(m, bronze, x * .86, 1.32, z * .86, .26, .38, .28);
    for (const side of [-1, 1]) sphere(m, bronze, x + side * .38, .72, z, .28, .06, .35);
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(x * .81, 1.52, z * .81),
      new THREE.Vector3(x * .5, 2.5, z * .5),
      new THREE.Vector3(x * .15, .65, z * .15),
    );
    jets.geometry('#b7e0d9', new THREE.TubeGeometry(curve, 16, .035, 5, false));
  }
  const root = finish(m), waterJets = finish(jets);
  root.add(waterJets);
  const water = new THREE.Mesh(new THREE.RingGeometry(1.1, 3.6, 48),
    new THREE.MeshStandardMaterial({ color: '#89c2bf', roughness: .2, metalness: .3, transparent: true, opacity: .7, side: THREE.DoubleSide }));
  water.rotation.x = -Math.PI / 2; water.position.y = .66; root.add(water);
  return { root, update(time) { waterJets.scale.y = 1 + Math.sin(time * 4) * .025; water.rotation.z = time * .08; } };
}

export function createMarketWaterfront() {
  const m = model('Kauppatori waterfront'), stone = '#aaa99a';
  m.box('#b4ac98', 0, -.15, 0, 130, .3, 150);
  for (let z = -73; z < 75; z += 3) m.box('#a69f90', 0, .012, z, 130, .018, .035);
  // The far edge of this plaza is the quay, with open sea beyond it.
  m.box(stone, 0, -.15, -75, 140, .7, 1.1);
  for (let x = -62; x <= 64; x += 4) {
    cylinder(m, '#445d5b', x, .45, -74.4, .2, .27, .9, 8);
    m.box('#677c70', x, .52, -73.9, .5, .17, .6);
  }
  for (const side of [-1, 1]) for (let row = 0; row < 2; row++) for (let i = 0; i < 5; i++) {
    const x = side * (16 + i * 6), z = -25 - row * 12;
    for (const dx of [-1.8, 1.8]) for (const dz of [-1.5, 1.5]) cylinder(m, '#d7d5b7', x + dx, 1.3, z + dz, .045, .045, 2.6, 6);
    m.geometry((i + row) % 2 ? '#d27635' : '#e3b356', new THREE.ConeGeometry(3.15, 1.3, 4).rotateY(Math.PI / 4).translate(x, 3, z));
    m.box('#8a7355', x, .75, z, 3.8, 1.4, 2.8);
    m.box('#b19b6b', x, 1.5, z, 4, .12, 3);
    for (let n = 0; n < 5; n++) sphere(m, ['#c47039', '#c8af49', '#9eae64'][n % 3], x - 1.5 + n * .7, 1.68, z + .9, .24, .18, .25);
  }
  // Low merchants' facades and the pale blue City Hall on the north side.
  for (let i = 0; i < 4; i++) {
    const z = -42 + i * 25, color = ['#b6cfca', '#d4c18c', '#decfba', '#c4b2a0'][i];
    m.box(color, -49, 6.5, z, 12, 13, 24);
    m.box('#626e68', -49, 13.2, z, 12.5, .4, 24.5);
    for (let y = 2; y < 13; y += 2.5) for (let zz = -9; zz <= 9; zz += 3) m.box('#496b75', -42.95, y, z + zz, .08, 1.5, 1.1);
  }
  const root = finish(m);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(700, 420), new THREE.MeshStandardMaterial({ color: '#4d8595', roughness: .3, metalness: .3 }));
  water.name = 'Esplanadi Baltic Sea'; water.rotation.x = -Math.PI / 2; water.position.set(0, -.36, -285); root.add(water);
  const ripples = model('Kauppatori sea ripples');
  for (let i = 0; i < 160; i++) ripples.box(i % 3 ? '#6395a0' : '#8eafb2', Math.sin(i * 3.7) * 150, -.34, -85 - i % 110, 1 + i % 5, .012, .07);
  root.add(finish(ripples));
  const ferry = createFerry(); ferry.name = 'Kauppatori ferry'; ferry.scale.setScalar(1.6); ferry.position.set(16, 0, -125); root.add(ferry);
  // A small passenger launch closer to the market, beside the larger ferry.
  const launch = model('Market Square passenger boat');
  launch.box('#d9e0d5', -24, .45, -91, 14, 1.3, 3.5);
  launch.box('#f2e9d2', -25, 1.65, -91, 8, 1.2, 3.1);
  launch.box('#476d7e', -25, 1.9, -89.42, 7.2, .5, .05);
  root.add(finish(launch));
  return { root, update(time) { ferry.position.y = Math.sin(time * .7) * .045; } };
}
