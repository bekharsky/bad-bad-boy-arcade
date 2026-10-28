import * as THREE from 'three';
import { createSceneryModel } from '../maps/scenery-model.js';

export const TRAFFIC_PALETTE = { green: '#64c94c', blue: '#51bde0', red: '#e45c5c' };

export function createTrafficModel(kind, color) {
  const model = createSceneryModel(`${color} ${kind}`), { box } = model;
  const paint = TRAFFIC_PALETTE[color];
  function rod(shade, a, b, radius = .055) {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), delta = end.sub(start);
    const geometry = new THREE.CylinderGeometry(radius, radius, delta.length(), 7);
    geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.clone().normalize()));
    model.geometry(shade, geometry.translate(...start.addScaledVector(delta, .5).toArray()));
  }
  const wheelRadius = kind === 'bike' ? .4 : .22, wheelZ = kind === 'bike' ? .92 : .72;
  for (const z of [-wheelZ, wheelZ]) {
    const wheel = createSceneryModel('Traffic wheel');
    wheel.geometry('#283436', new THREE.TorusGeometry(wheelRadius, .065, 7, 20).rotateY(Math.PI / 2));
    wheel.geometry('#b8c6bd', new THREE.TorusGeometry(wheelRadius - .07, .017, 5, 20).rotateY(Math.PI / 2));
    for (let n = 0; n < 6; n++) wheel.geometry('#aebdb6', new THREE.BoxGeometry(.025, wheelRadius * 1.8, .025).rotateX(n * Math.PI / 6));
    const group = wheel.finish({ vertexColors: true }); group.position.set(0, wheelRadius, z); model.group.add(group);
  }
  if (kind === 'bike') {
    const seat = [0, 1.15, -.4], crank = [0, .54, -.05], front = [0, 1.2, .55], rear = [0, .4, -.92];
    for (const [a, b] of [[seat, crank], [seat, front], [crank, front], [seat, rear], [crank, rear], [front, [0, .4, .92]]]) rod(paint, a, b);
    box('#283b3b', 0, 1.22, -.45, .48, .11, .4);
    rod('#536e6b', front, [0, 1.7, .62]);
    rod('#384f4d', [-.48, 1.7, .62], [.48, 1.7, .62], .045);
    box('#b9bca2', 0, 1.04, -.9, .65, .13, .48);
    rod('#394b4d', [-.18, 1.5, -.4], [-.24, 1, .18], .13);
    rod('#394b4d', [-.24, 1, .18], [-.22, .55, -.12], .11);
    rod('#394b4d', [.18, 1.5, -.4], [.24, .88, -.5], .13);
    rod('#394b4d', [.24, .88, -.5], [.22, .55, .12], .11);
  } else {
    box('#343f40', 0, .23, -.12, .4, .14, 1.45);
    box(paint, 0, .32, -.12, .43, .07, 1.2);
    rod(paint, [0, .22, .72], [0, 1.87, .57], .085);
    rod('#2d4140', [-.48, 1.88, .57], [.48, 1.88, .57], .055);
    box(paint, 0, .7, .65, .18, .48, .2);
    for (const side of [-1, 1]) {
      rod('#3c5053', [side * .17, 1.5, -.18], [side * .2, .38, side * .3 - .12], .13);
      box('#ddd2bd', side * .2, .35, side * .3 - .1, .22, .12, .48);
    }
  }
  // Helmet, jacket and hands distinguish live riders from parked vehicles.
  const lean = kind === 'bike' ? .25 : 0;
  model.geometry(paint, new THREE.BoxGeometry(.64, .85, .4).rotateX(lean).translate(0, 1.95, -.26));
  model.geometry('#c8a387', new THREE.SphereGeometry(.25, 12, 8).translate(0, 2.64, -.1));
  model.geometry('#e6dfc4', new THREE.SphereGeometry(.28, 12, 6, 0, Math.PI * 2, 0, Math.PI * .55).translate(0, 2.7, -.1));
  for (const side of [-1, 1]) {
    rod(paint, [side * .3, 2.2, -.2], [side * .39, 1.88, .25], .09);
    rod('#c8a387', [side * .39, 1.88, .25], [side * .43, kind === 'bike' ? 1.7 : 1.88, .6], .07);
  }
  box('#f0df9b', 0, .87, wheelZ + .08, .15, .15, .06);
  return model.finish({ vertexColors: true });
}

export function animateTraffic(root, time, speed) {
  for (const wheel of root.children) if (wheel.name === 'Traffic wheel') wheel.rotation.x = time * speed / (root.name.endsWith('bike') ? .4 : .22);
}
