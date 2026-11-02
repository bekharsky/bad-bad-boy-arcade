import * as THREE from 'three';
import { createSceneryModel as model } from './scenery-model.js';

function sphere(m, colour, x, y, z, r, scale = [1, 1, 1]) {
  m.geometry(colour, new THREE.SphereGeometry(r, 8, 6).scale(...scale).translate(x, y, z));
}
function rod(m, colour, a, b, radius = .055) {
  const start = new THREE.Vector3(...a), delta = new THREE.Vector3(...b).sub(start);
  const geometry = new THREE.CylinderGeometry(radius, radius, delta.length(), 6);
  geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.clone().normalize()));
  m.geometry(colour, geometry.translate(...start.addScaledVector(delta, .5).toArray()));
}
function arch(m, colour, x, y, z, w, h, turn = 0) {
  const s = new THREE.Shape(), r = w / 2;
  s.moveTo(-r, 0); s.lineTo(r, 0); s.lineTo(r, h - r); s.absarc(0, h - r, r, 0, Math.PI, false); s.closePath();
  m.geometry(colour, new THREE.ExtrudeGeometry(s, { depth: .08, bevelEnabled: false, curveSegments: 6 }).rotateY(turn).translate(x, y, z));
}
function tree(m) {
  m.box('#a2a294', 0, .38, 0, 2.3, .76, 2.3);
  m.box('#647257', 0, .78, 0, 2.05, .06, 2.05);
  rod(m, '#766e50', [0, .8, 0], [0, 4, 0], .14);
  m.geometry('#7b9466', new THREE.IcosahedronGeometry(1.6, 1).scale(1, 1.2, 1).translate(0, 4.1, 0));
  m.geometry('#8ba16e', new THREE.IcosahedronGeometry(1.1, 0).translate(-.35, 5, .25));
}
function stall(m, colour, flowers = false) {
  for (const x of [-2.4, 2.4]) for (const z of [-1.25, 1.25]) m.box('#75664c', x, 1.6, z, .1, 3.2, .1);
  for (const side of [-1, 1]) m.geometry(colour, new THREE.BoxGeometry(5.6, .09, 1.85).rotateX(side * .23).translate(0, 3.3, side * .84));
  m.box(colour, 0, 2.95, 1.6, 5.55, .36, .06);
  m.box('#b29a69', 0, .74, .3, 4.9, 1.4, 1.65);
  m.box('#ddc49a', 0, 1.48, .35, 5.15, .12, 1.9);
  for (let col = 0; col < 5; col++) {
    const x = (col - 2) * .93;
    m.box('#81694a', x, 1.64, .35, .8, .24, 1.2);
    for (let n = 0; n < 6; n++) {
      const z = -.08 + n % 3 * .35, xx = x + (Math.floor(n / 3) - .5) * .3;
      if (flowers) {
        rod(m, '#728e5b', [xx, 1.7, z], [xx, 2 + n % 2 * .16, z], .025);
        sphere(m, ['#e3b259', '#b86a79', '#ddd4ab'][col % 3], xx, 2.07 + n % 2 * .16, z, .13);
      } else m.geometry(['#a5ad59', '#c98a46', '#a94f5c', '#c5b467', '#8c9f62'][col], new THREE.SphereGeometry(.14, 6, 4).translate(xx, 1.82, z));
    }
  }
  for (const x of [-2, 1.8]) m.box('#8c7857', x, .28, -1.45, .75, .55, .7);
}
function cafe(m, colour) {
  m.geometry(colour, new THREE.ConeGeometry(2.15, .72, 8).translate(0, 3.15, 0));
  rod(m, '#7c735a', [0, .05, 0], [0, 3.48, 0], .055);
  m.geometry('#d6cab1', new THREE.CylinderGeometry(.78, .78, .1, 16).translate(0, 1.03, 0));
  for (const angle of [0, 2.1, 4.2]) {
    const x = Math.cos(angle) * 1.4, z = Math.sin(angle) * 1.4;
    m.box('#8b7656', x, .52, z, .63, .12, .62);
    m.box('#8b7656', x, .88, z + .28, .63, .6, .08);
    for (const dx of [-.24, .24]) for (const dz of [-.24, .24]) m.box('#54645b', x + dx, .26, z + dz, .045, .5, .045);
  }
  for (const x of [-.3, .3]) m.geometry('#ece7d6', new THREE.CylinderGeometry(.08, .065, .16, 8).translate(x, 1.17, .15));
}
function person(m, colour, turn) {
  const c = Math.cos(turn), s = Math.sin(turn);
  const part = (shade, x, y, z, w, h, d) => m.geometry(shade, new THREE.BoxGeometry(w, h, d).rotateY(turn).translate(x * c + z * s, y, z * c - x * s));
  for (const x of [-.12, .12]) part('#55646a', x, .44, 0, .15, .75, .18);
  part(colour, 0, 1.07, 0, .5, .62, .28);
  for (const x of [-.31, .31]) part(colour, x, 1.02, 0, .13, .56, .15);
  sphere(m, '#c9aa8c', 0, 1.62, 0, .2);
  sphere(m, '#756d59', 0, 1.73, -.025, .21, [1, .5, 1]);
}
function bikes(m) {
  for (let n = 0; n < 3; n++) {
    const x = (n - 1) * .78;
    for (const z of [-.65, .65]) m.geometry('#354448', new THREE.TorusGeometry(.33, .045, 5, 12).rotateY(Math.PI / 2).translate(x, .37, z));
    for (const [a, b] of [[[x, .37, -.65], [x, 1.04, -.3]], [[x, 1.04, -.3], [x, .42, 0]], [[x, .42, 0], [x, .37, -.65]], [[x, 1.04, -.3], [x, 1.1, .4]], [[x, 1.1, .4], [x, .42, 0]], [[x, 1.1, .4], [x, .37, .65]]]) rod(m, '#829b8e', a, b, .035);
    m.box('#43524c', x, 1.1, -.32, .3, .07, .25);
    rod(m, '#3f5351', [x - .2, 1.17, .4], [x + .2, 1.17, .4], .03);
  }
  for (const x of [-1.3, 1.3]) rod(m, '#8f9b8f', [x, 0, -.5], [x, .7, -.5], .055);
  rod(m, '#8f9b8f', [-1.3, .7, -.5], [1.3, .7, -.5], .055);
}
function marketHall(m) {
  const brick = '#a2664e', pale = '#d0bea0', glass = '#405c5c';
  m.box(brick, 0, 2.95, 0, 18, 5.9, 26);
  m.box('#a5a292', 0, .35, 0, 18.4, .7, 26.4);
  for (const y of [1.05, 4.3, 5.8]) m.box(pale, 0, y, 0, 18.35, .15, 26.25);
  const roof = new THREE.Shape(); roof.moveTo(-9.6, 5.95); roof.lineTo(0, 8.9); roof.lineTo(9.6, 5.95); roof.closePath();
  m.geometry('#59776b', new THREE.ExtrudeGeometry(roof, { depth: 27, bevelEnabled: false }).translate(0, 0, -13.5));
  for (const side of [-1, 1]) {
    for (const x of [-6, -3, 0, 3, 6]) {
      arch(m, pale, x, .8, side * 13.08, 2.35, 3.55, side < 0 ? Math.PI : 0);
      arch(m, glass, x, .96, side * 13.19, 1.95, 3.15, side < 0 ? Math.PI : 0);
      m.box(pale, x, 2.12, side * 13.3, .07, 2.4, .045);
    }
    for (let z = -10.5; z < 12; z += 3.5) {
      arch(m, pale, side * 9.07, .8, z, 2.6, 3.5, side * Math.PI / 2);
      arch(m, glass, side * 9.2, .98, z, 2.18, 3.1, side * Math.PI / 2);
      m.box(pale, side * 9.29, 2.1, z, .05, 2.2, .065);
      m.box('#b27d5e', side * 9.2, 2.8, z + 1.6, .38, 5.2, .32);
    }
  }
  for (const x of [-8.5, 8.5]) for (const z of [-12.5, 12.5]) m.box(pale, x, 3.2, z, .5, 6.4, .5);
  for (let z = -10; z < 13; z += 5) m.box('#789183', 0, 8.7, z, 2.7, .45, 2.1);
}

function amandaFountain() {
  const m = model('Amanda fountain'), bronze = '#577d69', pink = '#bfa794';
  m.geometry('#9c9d8a', new THREE.CylinderGeometry(3.45, 3.6, .18, 40).translate(0, .14, 0));
  m.geometry(pink, new THREE.TorusGeometry(3.04, .25, 7, 40).rotateX(Math.PI / 2).translate(0, .48, 0));
  m.geometry('#6b9c9d', new THREE.CylinderGeometry(2.95, 2.95, .07, 40).translate(0, .35, 0));
  m.geometry(pink, new THREE.CylinderGeometry(.65, 1, 1.3, 12).translate(0, 1.02, 0));
  m.geometry(bronze, new THREE.CylinderGeometry(.35, .65, .6, 10).translate(0, 1.93, 0));
  // A small stylised bronze maiden, with fish and four sea lions around her.
  for (const [a, b] of [[[.16, 2.2, 0], [.08, 3.35, 0]], [[-.17, 2.26, .04], [-.28, 3.33, 0]], [[-.25, 3.85, 0], [-.46, 3.37, .14]], [[.25, 3.86, 0], [.37, 3.3, .13]]]) rod(m, bronze, a, b, .11);
  sphere(m, bronze, -.04, 3.43, 0, .27, [1.15, 1.5, .75]);
  sphere(m, bronze, 0, 3.84, 0, .25, [1.12, 1.25, .7]);
  sphere(m, bronze, .02, 4.32, .02, .21, [.86, 1.15, .85]);
  sphere(m, '#466b59', .01, 4.42, -.09, .22, [1, .8, .85]);
  const water = model('Amanda fountain water');
  for (let n = 0; n < 4; n++) {
    const a = n * Math.PI / 2 + Math.PI / 4, x = Math.cos(a) * 2.7, z = Math.sin(a) * 2.7;
    sphere(m, bronze, x, .65, z, .55, [1, .65, .75]);
    sphere(m, bronze, x * .93, 1.11, z * .93, .33, [.75, 1.2, .75]);
    sphere(m, bronze, x * .89, 1.4, z * .89, .23);
    sphere(m, bronze, x * 1.16, .47, z * 1.16, .32, [1.4, .25, .7]);
    sphere(m, bronze, Math.cos(a) * .8, 1.56, Math.sin(a) * .8, .28, [.6, .8, 1.4]);
    const points = [];
    for (let t = 0; t <= 1.001; t += .125) points.push(new THREE.Vector3(x * (.89 - .55 * t), 1.35 + .7 * Math.sin(t * Math.PI) - t, z * (.89 - .55 * t)));
    water.geometry('#a2c1bc', new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 12, .026, 5, false));
  }
  const root = m.finish({ vertexColors: true }), spray = water.finish({ vertexColors: true }); root.add(spray);
  return { root, update(time) { spray.scale.y = 1 + Math.sin(time * 2.5) * .025; } };
}
function boat(m) {
  const s = new THREE.Shape(); s.moveTo(-3.7, -1.2); s.lineTo(2.7, -1.2); s.lineTo(4.3, 0); s.lineTo(2.7, 1.2); s.lineTo(-3.7, 1.2); s.closePath();
  m.geometry('#42606a', new THREE.ExtrudeGeometry(s, { depth: .75, bevelEnabled: false }).rotateX(-Math.PI / 2));
  m.box('#e5dfc9', -.4, .82, 0, 5.7, .2, 2.1);
  m.box('#e1dfcf', -.5, 1.55, 0, 2.7, 1.4, 1.8);
  m.box('#4d7680', -.5, 1.72, 0, 2.74, .7, 1.84);
  m.box('#dedbca', -.5, 2.34, 0, 3.2, .2, 2.2);
  rod(m, '#d4cdb2', [1, .9, 0], [1, 4.5, 0], .045);
  m.geometry('#bc8b57', new THREE.TorusGeometry(.36, .095, 6, 12).translate(-2.2, 1.1, 1.15));
}

export function createAleksiMarket() {
  const root = new THREE.Group(); root.name = 'Aleksi market quarter';
  function add(name, kind, x, progress, build) {
    const m = model(name); build(m); const item = m.finish({ vertexColors: true });
    item.position.set(x, 0, -progress); item.userData.waterfrontKind = kind; root.add(item); return item;
  }
  add('Waterfront market hall', 'hall', -43, 611, marketHall);
  for (const [x, p] of [[-10.5, 590], [-10.5, 610], [-29, 628], [-29, 588], [-32, 638], [17, 646]]) add('Market planter tree', 'tree', x, p, tree);
  for (const [i, [x, p]] of [[-17.5, 599], [-25, 599], [-17.5, 617], [-25, 617], [-12, 647], [-20, 647], [-28, 647], [21, 651], [29, 651]].entries()) add('Market produce stall', 'stall', x, p, m => stall(m, ['#c3a35d', '#d1b776', '#bd865c'][i % 3], i % 3 === 1));
  for (const [i, [x, p]] of [[-16, 640], [-23, 640], [-16, 626], [20, 644]].entries()) add('Market cafe terrace', 'cafe', x, p, m => cafe(m, i % 2 ? '#d7c9a4' : '#9aab8d'));
  add('Parked market bicycles', 'bikes', -12.5, 638, bikes);
  for (const [i, [x, p]] of [[-12, 599], [-14, 600], [-21, 603], [-30, 600], [-13, 619], [-21, 621], [-26, 631], [-20, 633], [-29, 636], [14.5, 645], [24, 646], [14, 657], [-8, 644], [-16, 649], [-24, 649], [-31, 645]].entries()) add('Market visitor', 'visitor', x, p, m => person(m, ['#a67f64', '#6e929b', '#969c76', '#b89a75'][i % 4], i * 1.9));
  const fountain = amandaFountain(); fountain.root.position.set(9.7, 0, -655); fountain.root.userData.waterfrontKind = 'fountain'; root.add(fountain.root);
  const boats = [[-29, 679], [35, 683]].map(([x, p]) => add('Moored harbor launch', 'boat', x, p, boat));
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .65 }), replaced = new Set();
  root.traverse(node => { if (node.isMesh) { replaced.add(node.material); node.material = material; } });
  for (const old of replaced) old.dispose();
  return { root, update(time) { fountain.update(time); for (let i = 0; i < boats.length; i++) boats[i].position.y = -.38 + Math.sin(time * .7 + i) * .025; } };
}
