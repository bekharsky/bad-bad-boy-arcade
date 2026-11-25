import * as THREE from 'three';
import { createSceneryModel as model, destination } from './scenery-model.js';
import { overlaps } from '../world/navigation.js';

export function createTram(scene, { z: routeZ = 0, display: destinationText = '9', extent = 37, initialWait = 8, initialX } = {}) {
  const tram = model('Helsinki tram');
  const { box } = tram;
  const green = '#26734a', yellow = '#edc74f', glass = '#294b50';
  for (const z of [-2.45, 2.45]) {
    box(green, 0, 1.04, z, 1.8, 1.36, 4.45);
    box(yellow, 0, 1.65, z, 1.84, .23, 4.46);
    box('#ddd9ba', 0, 2.69, z, 1.85, .18, 4.5);
    box(yellow, 0, 2.15, z, 1.78, .88, 4.43);
    box('#93998b', 0, 2.85, z + .5, 1.12, .17, 1.26);
    for (let slat = -2; slat <= 2; slat++) box('#616e65', 0, 2.945, z + .5 + slat * .19, .87, .035, .06);
    for (const side of [-1, 1]) {
      for (const offset of [-1.45, -.43, .60]) {
        box('#c9bd90', side * .903, 2.15, z + offset, .03, .80, .99);
        box(glass, side * .925, 2.15, z + offset, .023, .68, .87);
        box('#709397', side * .941, 2.35, z + offset, .01, .15, .84);
        box('#526d64', side * .95, 2.12, z + offset - .19, .016, .64, .04);
      }
      box('#183a32', side * .91, .83, z, .025, .055, 4.2);
      for (const wheel of [-1.5, 1.5]) {
        tram.geometry('#283238', new THREE.CylinderGeometry(.31, .31, .19, 12).rotateZ(Math.PI / 2).translate(side * .74, .31, z + wheel));
        tram.geometry('#728077', new THREE.CylinderGeometry(.15, .15, .04, 12).rotateZ(Math.PI / 2).translate(side * .84, .31, z + wheel));
      }
      box('#344b43', side * .923, 1.47, z + 1.58, .044, 2.08, .92);
      for (const leaf of [-.21, .21]) {
        box('#aabb9c', side * .953, 1.50, z + 1.58 + leaf, .026, 1.87, .36);
        box('#466664', side * .972, 1.87, z + 1.58 + leaf, .02, .91, .27);
      }
      box('#e1c87b', side * .953, .46, z + 1.58, .05, .09, .88);
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
  for (const side of [-1, 1]) for (const arm of [-1, 1]) {
    for (const [y, tilt] of [[3.06, 1], [3.64, -1]]) {
      const rod = new THREE.BoxGeometry(.065, .86, .065).rotateX(arm * tilt * .81);
      tram.geometry('#38443f', rod.translate(side * .31, y, -1.3 + arm * .31));
    }
  }
  box('#38443f', 0, 3.94, -1.3, 1.25, .07, .12);
  const root = tram.finish();
  root.rotation.y = Math.PI / 2;
  scene.add(root);
  let wait = initialWait, direction = 1;
  const collider = { minX: 0, maxX: 0, minZ: routeZ - .94, maxZ: routeZ + .94, height: 2.8 };

  function reset() {
    wait = initialWait; direction = 1;
    root.position.set(initialX ?? -extent, 0, routeZ);
    root.visible = initialX !== undefined;
    collider.minX = root.position.x - 4.75;
    collider.maxX = root.position.x + 4.75;
  }
  function update(dt, actors, navigation) {
    if (!root.visible) {
      wait -= dt;
      if (wait > 0) return;
      root.visible = true;
      root.position.x = -direction * extent;
      dt = -wait;
    }
    const oldX = root.position.x;
    const nextX = oldX + direction * 5.2 * dt;
    root.position.x = THREE.MathUtils.clamp(nextX, -extent, extent);
    collider.minX = root.position.x - 4.75;
    collider.maxX = root.position.x + 4.75;
    const swept = { ...collider, minX: Math.min(collider.minX, oldX - 4.75), maxX: Math.max(collider.maxX, oldX + 4.75) };
    for (const actor of actors) {
      if (actor.alive === false) continue;
      const radius = actor.radius ?? actor.size;
      if (actor.onTramHit) {
        if (overlaps(swept, actor.x, actor.z, radius + .16)) actor.onTramHit(actor);
        continue;
      }
      if (!overlaps(collider, actor.x, actor.z, radius)) continue;
      const side = actor.z >= routeZ ? 1 : -1;
      for (const exit of [side, -side]) {
        const z = exit > 0 ? collider.maxZ + radius + .08 : collider.minZ - radius - .08;
        if (!navigation.canStandAt(actor.x, z, radius)) continue;
        actor.z = z;
        actor.root.position.set(actor.x, 0, z);
        break;
      }
    }
    if (Math.abs(nextX) > extent) {
      root.visible = false;
      direction *= -1;
      wait = 8 + Math.random() * 4;
    }
  }
  reset();
  return { root, collider, update, reset };
}

