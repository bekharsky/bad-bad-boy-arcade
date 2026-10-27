import * as THREE from 'three';
import { createSceneryModel as model, destination } from './scenery-model.js';

export function createTram(scene, { z: routeZ = 0, display: destinationText = '9  JÄTKÄSAARI', extent = 37, initialWait = 8 } = {}) {
  const tram = model('Helsinki tram');
  const { box } = tram;
  const green = '#26734a', yellow = '#edc74f', glass = '#294b50';
  for (const z of [-2.45, 2.45]) {
    box(green, 0, 1.04, z, 1.8, 1.36, 4.45);
    box(yellow, 0, 1.65, z, 1.84, .23, 4.46);
    box('#ddd9ba', 0, 2.69, z, 1.85, .18, 4.5);
    box(yellow, 0, 2.15, z, 1.78, .88, 4.43);
    for (const side of [-1, 1]) {
      for (let n = -1; n <= 1; n++) box(glass, side * .906, 2.16, z + n * 1.25, .025, .69, .98);
      box('#183a32', side * .91, .83, z, .025, .055, 4.2);
      for (const wheel of [-1.5, 1.5]) box('#283238', side * .72, .35, z + wheel, .26, .54, .65);
      // Door frames at each end of the articulated car.
      box('#d4c98a', side * .925, 1.43, z + 1.75, .04, 2.1, .06);
    }
  }
  box('#4b5149', 0, 1.62, 0, 1.65, 2.1, .5);
  for (const z of [-.18, 0, .18]) box('#242f2b', 0, 1.62, z, 1.71, 2.12, .045);
  for (const end of [-1, 1]) {
    box(glass, 0, 2.12, end * 4.69, 1.48, .7, .035);
    box(yellow, 0, .77, end * 4.71, 1.8, .12, .05);
    for (const x of [-.62, .62]) box('#fff0bc', x, 1.05, end * 4.72, .2, .2, .04);
    const display = destination(destinationText, 1.45, .25);
    display.position.set(0, 2.56, end * 4.73);
    display.rotation.y = end < 0 ? Math.PI : 0;
    tram.group.add(display);
  }
  // Diamond pantograph and its contact shoe.
  for (const side of [-1, 1]) {
    box('#38443f', side * .28, 3.05, -1.3, .06, .85, .06, side * -.75);
    box('#38443f', side * .28, 3.64, -1.3, .06, .85, .06, side * .75);
  }
  box('#38443f', 0, 3.94, -1.3, 1.25, .07, .12);
  const root = tram.finish();
  root.rotation.y = Math.PI / 2;
  scene.add(root);
  let wait = initialWait, direction = 1;
  const collider = { minX: 0, maxX: 0, minZ: routeZ - .94, maxZ: routeZ + .94, height: 2.8 };

  function reset() {
    wait = initialWait; direction = 1;
    root.position.set(-extent, 0, routeZ);
    root.visible = false;
  }
  function update(dt) {
    let departed = false;
    if (!root.visible) {
      wait -= dt;
      if (wait > 0) return false;
      root.visible = true;
      root.position.x = -direction * extent;
      departed = true;
    }
    root.position.x += direction * 5.2 * dt;
    if (Math.abs(root.position.x) > extent) {
      root.visible = false;
      direction *= -1;
      wait = 22 + Math.random() * 12;
    }
    collider.minX = root.position.x - 4.75;
    collider.maxX = root.position.x + 4.75;
    return departed;
  }
  reset();
  return { root, collider, update, reset };
}

