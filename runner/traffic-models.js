import * as THREE from 'three';
import { createSceneryModel } from '../maps/scenery-model.js';
import { TRAM_CAR_OFFSET } from './tram-route.js';
import { createCameoModel, animateCameo } from './cameo-models.js';
import { isCameo } from './cameo-roster.js';
import { paintFigure } from '../world/painted-material.js';

export const TRAFFIC_PALETTE = { green: '#358966', blue: '#36899b', red: '#cf5847' };

// This bounded set of procedural templates stays in CPU memory.
// They never enter a scene or allocate GPU buffers. Each map receives owned
// copies, so unloading one district cannot dispose another district's model.
const templateCache = new Map();

export function createTrafficModel(kind, color) {
  const key = `${kind}:${color}`;
  if (!templateCache.has(key)) templateCache.set(key, buildTrafficModel(kind, color));
  const model = templateCache.get(key).clone(true);
  const geometries = new Map(), materials = new Map(), textures = new Map();
  model.traverse(node => {
    if (!node.isMesh) return;
    if (!geometries.has(node.geometry)) geometries.set(node.geometry, node.geometry.clone());
    node.geometry = geometries.get(node.geometry);
    const ownMaterial = original => {
      if (!materials.has(original)) {
        const material = original.clone();
        paintFigure(material);
        if (original.map) {
          if (!textures.has(original.map)) textures.set(original.map, original.map.clone());
          material.map = textures.get(original.map);
        }
        materials.set(original, material);
      }
      return materials.get(original);
    };
    node.material = Array.isArray(node.material) ? node.material.map(ownMaterial) : ownMaterial(node.material);
  });
  return model;
}

function buildTrafficModel(kind, color) {
  if (kind === 'tram') return createRunnerTram();
  if (isCameo(kind)) return createCameoModel(kind);
  const model = createSceneryModel(`${color} ${kind}`), { box } = model;
  const paint = TRAFFIC_PALETTE[color];
  function rod(shade, a, b, radius = .055) {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), delta = end.sub(start);
    const geometry = new THREE.CylinderGeometry(radius, radius, delta.length(), 7);
    geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.clone().normalize()));
    model.geometry(shade, geometry.translate(...start.addScaledVector(delta, .5).toArray()));
  }
  if (kind === 'cone') {
    box('#303e41', 0, .08, 0, 1.15, .16, 1.15);
    for (const [y, radius, height, shade] of [[.37, .42, .5, '#f58632'], [.73, .27, .22, '#f4ebd3'], [.98, .18, .28, '#f58632']]) {
      model.geometry(shade, new THREE.CylinderGeometry(radius * .55, radius, height, 12).translate(0, y, 0));
    }
    return model.finish({ vertexColors: true });
  }
  if (kind === 'barrier') {
    // Concrete feet and a broad red/white construction fence across one lane.
    for (const x of [-.9, .9]) {
      box('#65716d', x, .12, 0, .65, .24, 1.05);
      box('#d8d6bc', x, .75, 0, .1, 1.3, .1);
      model.geometry('#f6ad35', new THREE.SphereGeometry(.14, 10, 6).translate(x, 1.48, 0));
    }
    for (const y of [.65, 1.12]) {
      box('#eee9d4', 0, y, 0, 2.5, .28, .15);
      for (const x of [-.9, -.3, .3, .9]) box('#c85c43', x, y, .085, .27, .28, .025);
    }
    return model.finish({ vertexColors: true });
  }
  if (kind === 'trench') {
    // A dark excavated bed masks the asphalt, with exposed pipe and spoil piles.
    box('#826947', 0, .065, 0, 2.7, .08, 5.4);
    box('#302f29', 0, .12, 0, 2.3, .08, 4.8);
    for (const x of [-1.1, 1.1]) box('#b2976b', x, .22, 0, .15, .25, 4.8);
    model.geometry('#626d68', new THREE.CylinderGeometry(.16, .16, 4.3, 10).rotateX(Math.PI / 2).translate(.3, .3, 0));
    for (const z of [-2.25, 2.25]) box('#9e8261', 0, .22, z, 2.3, .25, .16);
    for (let i = 0; i < 9; i++) {
      const side = i % 2 ? -1 : 1, z = -2.3 + (i % 5) * 1.1;
      model.geometry(i % 3 ? '#98754b' : '#6e6953', new THREE.DodecahedronGeometry(.3, 0).scale(.65, .7 + i % 3 * .2, 1.25).translate(side * 1.25, .3, z));
    }
    return model.finish({ vertexColors: true });
  }
  if (kind === 'tractor') {
    for (const x of [-.87, .87]) for (const z of [-.85, .9]) {
      const radius = z < 0 ? .68 : .48;
      model.geometry('#2d3537', new THREE.CylinderGeometry(radius, radius, .4, 14).rotateZ(Math.PI / 2).translate(x, radius, z));
      model.geometry('#b7a67b', new THREE.CylinderGeometry(radius * .45, radius * .45, .42, 12).rotateZ(Math.PI / 2).translate(x, radius, z));
    }
    box('#d5a044', 0, .95, .15, 1.45, .65, 2.35);
    box('#e5b853', 0, 1.4, .65, 1.2, .5, 1.4);
    box('#547b83', 0, 1.9, -.6, 1.25, 1.2, 1.15);
    for (const x of [-.66, .66]) for (const z of [-1.2, 0]) box('#e6ba66', x, 1.95, z, .1, 1.35, .1);
    box('#e4b65b', 0, 2.62, -.6, 1.7, .18, 1.65);
    box('#31494b', 0, 1.3, 1.39, .98, .45, .06);
    for (const x of [-.44, .44]) box('#f2e9bd', x, 1.58, 1.4, .25, .2, .08);
    box('#434c49', .45, 2.08, .65, .12, .9, .12);
    box('#b0a185', 0, .35, 1.67, 2.2, .58, .4);
    model.geometry('#f38d38', new THREE.SphereGeometry(.13, 10, 6).translate(.5, 2.83, -.6));
    return model.finish({ vertexColors: true });
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
  const coat = new THREE.LatheGeometry([
    new THREE.Vector2(.28,-.43), new THREE.Vector2(.29,-.34),
    new THREE.Vector2(.34,.23), new THREE.Vector2(.31,.34), new THREE.Vector2(.13,.42),
  ], 10);
  model.geometry(paint, coat.scale(1,.99,.77).rotateX(lean).translate(0, 1.95, -.26));
  // Cream yoke, stand collar and a helmet peak make riders readable head-on.
  model.geometry('#efd7a1', new THREE.CylinderGeometry(.295,.33,.095,10).scale(1,1,.79).rotateX(lean).translate(0,2.22,-.26+lean*.27));
  model.geometry('#324f52', new THREE.CylinderGeometry(.15,.17,.19,10).translate(0,2.38,-.18));
  model.geometry('#c8a387', new THREE.SphereGeometry(.25, 12, 8).translate(0, 2.64, -.1));
  model.geometry('#e6dfc4', new THREE.SphereGeometry(.28, 12, 6, 0, Math.PI * 2, 0, Math.PI * .55).translate(0, 2.7, -.1));
  model.geometry(paint, new THREE.SphereGeometry(1,10,6).scale(.245,.034,.17).translate(0,2.69,.068));
  model.geometry('#bd886d', new THREE.SphereGeometry(1,8,5).scale(.056,.063,.069).translate(0,2.60,.145));
  for (const side of [-1,1]) box('#403d37', side*.095,2.65,.129,.04,.026,.027);
  if (kind === 'bike') {
    box('#ad683b', .25,.88,-.81,.26,.43,.54);
    box('#e7c88a', .25,1.09,-.81,.28,.08,.57);
  } else {
    rod('#dfb66c', [-.21,2.21,-.025], [.20,1.66,-.02], .035);
    box('#263f48', .25,1.63,-.19,.24,.29,.40);
  }
  for (const side of [-1, 1]) {
    rod(paint, [side * .3, 2.2, -.2], [side * .39, 1.88, .25], .09);
    rod('#c8a387', [side * .39, 1.88, .25], [side * .43, kind === 'bike' ? 1.7 : 1.88, .6], .07);
  }
  box('#f0df9b', 0, .87, wheelZ + .08, .15, .15, .06);
  return model.finish({ vertexColors: true });
}


// Separate rigid cars share the original runner tram's dimensions and colours,
// but can articulate along a curve. Pool clones still share all geometry.
function createRunnerTram() {
  const root = new THREE.Group(); root.name = 'tram tram';
  const green = '#347758', cream = '#e2d09a', glass = '#294a52';
  for (const end of [-1, 1]) {
    const car = createSceneryModel(end > 0 ? 'Tram front car' : 'Tram rear car'), { box } = car;
    box(green, 0, 1.05, 0, 2.45, 1.45, 7.2);
    box(cream, 0, 2.35, 0, 2.48, 1.15, 7.2);
    box('#d2d6bd', 0, 3.04, 0, 2.5, .22, 7.25);
    box('#e4b94e', 0, 1.73, 0, 2.49, .17, 7.22);
    for (const side of [-1, 1]) {
      for (let n = -2; n <= 2; n++) box(glass, side * 1.252, 2.38, n * 1.28, .03, .85, 1.06);
      for (const offset of [-2.6, 2.6]) {
        box('#3e4e43', side * 1.26, 1.3, offset, .035, 2.15, .065);
        box('#c5c9ad', side * 1.28, .42, offset, .12, .14, 1.05);
      }
      for (const offset of [-1.9, 1.9]) box('#253338', side * .96, .38, offset, .3, .65, .8);
    }
    box(glass, 0, 2.36, end * 3.63, 2.03, .9, .04);
    box('#223e35', 0, 3, end * 3.66, 1.65, .3, .04);
    for (const x of [-.75, .75]) box('#f4e6a9', x, 1, end * 3.67, .27, .22, .04);
    box('#d7b65f', 0, .66, end * 3.65, 2.4, .15, .07);
    if (end < 0) {
      for (const side of [-1, 1]) {
        box('#344e46', side * .38, 3.63, 1.85, .07, 1.2, .08, side * -.7);
        box('#344e46', side * .38, 4.47, 1.85, .07, 1.2, .08, side * .7);
      }
      box('#344e46', 0, 4.96, 1.85, 1.65, .08, .12);
    }
    const part = car.finish({ vertexColors: true });
    part.userData.tramOffset = end * TRAM_CAR_OFFSET; part.position.z = part.userData.tramOffset;
    root.add(part);
  }
  const joint = createSceneryModel('Tram articulation');
  joint.box('#515d53', 0, 1.72, 0, 2.2, 2.25, .6);
  for (const z of [-.22, 0, .22]) joint.box('#293a35', 0, 1.72, z, 2.29, 2.28, .055);
  root.add(joint.finish({ vertexColors: true }));
  return root;
}

export function animateTraffic(root, time, speed, viewerYaw = 0) {
  if (isCameo(root.userData.character)) { animateCameo(root, time, true, viewerYaw); return; }
  for (const wheel of root.children) if (wheel.name === 'Traffic wheel') wheel.rotation.x = time * speed / (root.name.endsWith('bike') ? .4 : .22);
}
