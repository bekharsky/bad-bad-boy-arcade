import * as THREE from 'three';
import { createSceneryModel as model } from './scenery-model.js';

// Each caller owns the returned subtree and its merged geometry/materials.
export function createFerry() {
  const boat = model('Cruise ferry');
  const { box } = boat;
  // Tapered bow and stern, extruded vertically from the waterline.
  const outline = new THREE.Shape();
  outline.moveTo(-14, -1.7); outline.lineTo(-11.5, -3.1);
  outline.lineTo(10.5, -3.1); outline.quadraticCurveTo(15, -1.5, 16, 0);
  outline.quadraticCurveTo(15, 1.5, 10.5, 3.1); outline.lineTo(-11.5, 3.1);
  outline.lineTo(-14, 1.7); outline.closePath();
  const hull = new THREE.ExtrudeGeometry(outline, { depth: 1.8, bevelEnabled: false, curveSegments: 5 });
  hull.rotateX(-Math.PI / 2).translate(0, -.25, 0);
  boat.geometry('#243e59', hull);
  box('#b75748', 0, .09, 0, 24, .24, 6.2);
  box('#e7e6d9', -1, 2.05, 0, 24, 1.15, 6);
  box('#f6f1df', -1.8, 3.7, 0, 21.5, 2.25, 5.4);
  box('#d3d8d0', -2.5, 5.03, 0, 18.8, .4, 5);
  box('#f4f1df', 5.8, 5.5, 0, 4, .65, 5.7);
  for (const side of [-1, 1]) {
    for (const y of [2.05, 3.12, 4.12]) {
      for (let x = -11; x <= 8.5; x += .95) box('#315367', x, y, side * (y < 2.5 ? 3.02 : 2.72), .57, .37, .04);
    }
    box('#36596a', 5.8, 5.5, side * 2.87, 3.7, .4, .04);
    // Orange lifeboats and white davits below the promenade deck.
    for (const x of [-8, -4, 0]) {
      box('#d2d8cf', x, 4.75, side * 3, 2.5, .12, .7);
      box('#e28d35', x, 4.37, side * 3, 2.2, .48, .65);
      box('#f3e6c9', x, 4.65, side * 3, 1.3, .25, .48);
    }
    box('#eeeee1', -2, 5.43, side * 2.42, 17.5, .07, .06);
    for (let x = -10; x <= 6; x += 1.4) box('#eeeee1', x, 5.27, side * 2.42, .05, .35, .05);
  }
  for (const x of [-6, -3.3]) {
    box('#bf5342', x, 6, 0, 1.6, 1.7, 1.75);
    box('#293d43', x, 6.74, 0, 1.7, .33, 1.85);
  }
  box('#f4edda', 7.1, 6.55, 0, .09, 1.6, .09);
  box('#dce7df', 7.1, 7.3, 0, 1.8, .08, .09);
  box('#628ba2', 7.1, 6.9, 0, .5, .3, .5);
  const ferry = boat.finish();
  return ferry;
}
