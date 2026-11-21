import * as THREE from 'three';
import { createSceneryModel } from './scenery-model.js';

export const STATION_TRAM_Z = 14;

export function buildStationStreet(root, bounds, obstacle, place) {
  const street = createSceneryModel('Kaivokatu tramway'), { box } = street;
  const track = STATION_TRAM_Z, length = 152;
  box('#636b69', 0, -.029, track, length, .028, 5.8);
  box('#a09d90', 0, -.013, track, length, .022, 3.72);
  for (const side of [-1, 1]) {
    const z = track + side * .72;
    box('#434e4e', 0, .006, z, length, .022, .17);
    box('#c2cbc4', 0, .022, z + side * .045, length, .016, .067);
    box('#d2ccb8', 0, .005, track + side * 2.96, length, .06, .22);
  }
  for (let x = -72; x < 73; x += 2.25) {
    box('#8e8d82', x, .001, track, .033, .009, 1.23);
  }
  // Cross both sidewalks on the same axis as the station doors and the
  // passage to Oodi. The paint stops at the steel wheel grooves.
  for (const x of [-6, 12]) for (let j = -3; j <= 3; j++) {
    for (const dz of [-1.83, 0, 1.83]) box('#dfddc8', x + j * .59, .014, track + dz, .34, .01, dz === 0 ? 1.22 : 1.94);
    for (const side of [-1, 1]) box('#c6a258', x + j * .59, .019, track + side * 3.43, .48, .016, .41);
  }
  box('#4d5d58', 0, 3.99, track, length, .04, .044);
  for (const x of [-54, -32, -10, 16, 38, 60]) {
    const z = track + 3.8;
    street.geometry('#56716b', new THREE.CylinderGeometry(.082, .115, 5.15, 8).translate(x, 2.575, z));
    box('#71827a', x, 4.24, z - 2.02, .075, .092, 4.13);
    const brace = new THREE.BoxGeometry(.053, .053, Math.hypot(3.8, .85));
    street.geometry('#586d67', brace.rotateX(-Math.atan2(.85, 3.8)).translate(x, 4.66, z - 1.9));
    box('#aa9679', x, 4.12, track, .14, .21, .14);
    obstacle(x, z, .23, .23, 5.15);
  }
  const stop = createSceneryModel('Station tram shelter');
  const stopX = -16.8, stopZ = track + 4.9;
  stop.box('#465c58', 0, 2.89, 0, 7.7, .19, 2.05);
  stop.box('#e6cd93', 0, 2.75, -.78, 7.45, .075, .18);
  for (const x of [-3.35, 0, 3.35]) stop.box('#526c66', x, 1.42, .72, .11, 2.85, .12);
  stop.box('#789797', 0, .84, .72, 6.78, 1.58, .09);
  stop.box('#d4d7b7', 0, 1.35, .78, 6.7, .09, .035);
  for (const x of [-1.8, 1.8]) stop.box('#58605a', x, .29, .11, .16, .58, .68);
  for (const z of [-.19, .02, .23]) stop.box('#b5895a', 0, .59, z, 4.65, .13, .18);
  place(stop.finish({ vertexColors: true }), stopX, stopZ);
  obstacle(stopX, stopZ + .72, 6.82, .15, 1.64);
  for (const dx of [-3.35, 0, 3.35]) obstacle(stopX + dx, stopZ + .72, .12, .14, 2.85);
  obstacle(stopX, stopZ + .025, 4.65, .66, .66);

  // A route flag carries a tram pictogram, visible from the approach.
  const signX = stopX + 4.45, signZ = stopZ - .48;
  box('#586963', signX, 1.6, signZ, .12, 3.2, .12);
  box('#38677b', signX, 2.86, signZ, .85, .84, .11);
  for (const face of [-1, 1]) {
    box('#ece9ce', signX, 2.86, signZ + face * .065, .43, .43, .025);
    box('#38677b', signX, 2.92, signZ + face * .087, .31, .15, .025);
    for (const side of [-1, 1]) box('#ece9ce', signX + side * .15, 2.57, signZ + face * .066, .05, .14, .026, -side * .44);
  }
  obstacle(signX, signZ, .14, .14, 3.22);
  root.add(street.finish({ vertexColors: true }));

  const edge = createSceneryModel('Station district perimeter');
  const { minX, maxX, minZ, maxZ } = bounds;
  // Railings sit on the limit of movement itself. The low kerb and the
  // breaks at either end of the tram street keep the track unobstructed.
  function railing(x, z, span, alongX) {
    const w = alongX ? span : .34, d = alongX ? .34 : span;
    edge.box('#959a8b', x, .16, z, w, .32, d);
    for (const y of [.54, .96]) edge.box('#526960', x, y, z, alongX ? span : .075, .075, alongX ? .075 : span);
    const count = Math.ceil(span / 2.6);
    for (let i = 0; i <= count; i++) {
      const offset = span * (i / count - .5);
      edge.box('#576c62', x + (alongX ? offset : 0), .64, z + (alongX ? 0 : offset), .105, .86, .105);
    }
    obstacle(x, z, w, d, 1);
  }
  railing((minX + maxX) / 2, maxZ, maxX - minX, true);
  railing((minX + maxX) / 2, minZ, maxX - minX, true);
  for (const x of [minX, maxX]) {
    const from = x === maxX ? -4.9 : minZ; // The railway platform already closes the eastern edge.
    for (const [a, b] of [[from, track - 3.15], [track + 3.15, maxZ]]) railing(x, (a + b) / 2, b - a, false);
    for (let z = track - 2.55; z <= track + 2.6; z += .5) {
      if (Math.abs(Math.abs(z - track) - .72) > .2) edge.box('#d7bd75', x, .017, z, .19, .014, .28);
    }
  }
  root.add(edge.finish({ vertexColors: true }));

  // The rails continue between the corner blocks beyond the playable area.
  // Set the upper floors back so the street stays open in the side view.
  const blocks = createSceneryModel('Kaivokatu street fronts');
  for (const [x, z, width, floors, render] of [
    [minX - 11, 1, 16, 5, '#bfae96'], [maxX + 13, 2, 18, 4, '#bdab97'],
    [minX - 12, 27, 18, 4, '#b3a99b'], [maxX + 12, 27, 17, 5, '#b7ae92'],
  ]) {
    const front = Math.sign(track - z), h = 2.9 + floors * 1.55;
    blocks.box(render, x, h / 2, z, width, h, 9);
    blocks.box('#78817a', x, h + .13, z, width + .4, .26, 9.25);
    blocks.box('#adb1a1', x, h + .72, z - front * .8, width - 2, 1.25, 6.6);
    for (let dx = -width / 2 + 1; dx < width / 2; dx += 1.8) {
      blocks.box('#536b68', x + dx, 1.22, z + front * 4.54, 1.5, 2.36, .1);
      for (let row = 0; row < floors; row++) {
        blocks.box('#698184', x + dx, 3.46 + row * 1.55, z + front * 4.54, .98, .96, .1);
      }
    }
    blocks.box('#ddd1ae', x, 2.62, z + front * 4.77, width + .1, .17, .73);
    for (const side of [-1, 1]) for (let dz = -3; dz <= 3; dz += 2) {
      for (let row = 0; row < floors; row++) {
        blocks.box('#6f8581', x + side * (width / 2 + .03), 3.46 + row * 1.55, z + dz, .1, .96, 1.15);
      }
    }
  }
  root.add(blocks.finish({ vertexColors: true }));
}
