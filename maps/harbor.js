import * as THREE from 'three';
import { createTram, createHarbor } from './harbor-scenery.js';
import { createMap } from '../world/map.js';
import { overlaps } from '../world/navigation.js';

const STOREY_HEIGHT = 1.15;
const BOULEVARD_Z = -5;
const courtyards = [[-20, 7.5], [-7.5, 26], [-19, -24.2], [17.5, -24.5], [-3.5, -24.4], [23, 5.8], [-26, 17], [23, 20]];
const hiddenPoint = ([x, z]) => ({ x, z, jitter: .65 });

export const harborMap = {
  id: 'harbor',
  name: 'West Harbor',
  spawn: { x: -5, z: 7, heading: Math.PI },
  bounds: { minX: -27.8, maxX: 27.8, minZ: -27.8, maxZ: 27.8 },
  pickups: {
    medkit: [{ x: 3.5, z: 9.5 }, ...courtyards.slice(0, 4).map(hiddenPoint)],
    battery: courtyards.slice(4).map(hiddenPoint),
  },
  create() { return createMap(harborMap, buildHarbor); },
};

// Only harbor scenery and behavior live here; navigation and lifecycle are shared.
function buildHarbor(scene) {
  const colliders = [];
  const batches = new Map();
  const buildings = [];
  let activeBuilding = null;
  const geometries = {
    box: new THREE.BoxGeometry(1, 1, 1),
    cylinder: new THREE.CylinderGeometry(0.5, 0.5, 1, 10),
    sphere: new THREE.IcosahedronGeometry(0.5, 1),
  };
  for (const geometry of Object.values(geometries)) {
    if (!geometry.index) geometry.setIndex(Array.from({ length: geometry.attributes.position.count }, (_, i) => i));
  }
  const dummy = new THREE.Object3D();
  let seed = 37;
  const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  function part(shape, color, x, y, z, sx, sy, sz, ry = 0, glow = false) {
    const target = activeBuilding?.batches ?? batches;
    if (activeBuilding) { x -= activeBuilding.x; z -= activeBuilding.z; }
    const key = `${shape}:${color}:${glow}`;
    if (!target.has(key)) target.set(key, { shape, color, glow, transforms: [] });
    target.get(key).transforms.push([x, y, z, sx, sy, sz, ry]);
  }
  function obstacle(x, z, w, d, height) {
    colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, height });
  }
  function surface(w, d, x, z, color, y = -0.035, texture = null) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ color, map: texture, roughness: 0.94 }));
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    scene.add(mesh);
  }
  const paving = document.createElement('canvas');
  paving.width = paving.height = 256;
  const ctx = paving.getContext('2d');
  ctx.fillStyle = '#6f7779'; ctx.fillRect(0, 0, 256, 256);
  for (let row = 0; row < 16; row++) for (let col = -1; col < 17; col++) {
    const shade = 135 + Math.floor(random() * 29);
    ctx.fillStyle = `rgb(${shade},${shade + 3},${shade + 2})`;
    ctx.fillRect(col * 16 + (row % 2) * 8 + 1, row * 16 + 1, 14, 14);
  }
  const texture = new THREE.CanvasTexture(paving);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(12, 12);
  texture.anisotropy = 4;
  surface(92, 70, -4, 6, '#b5b2a6', -0.045, texture);
  // The boulevard, rails and shoreline all run east–west. The square sits
  // beside the street, so asphalt never disappears underneath plaza paving.
  surface(76, 9.4, 0, BOULEVARD_Z, '#414b53', -.018);
  const trackTexture = texture.clone();
  trackTexture.repeat.set(16, .65);
  surface(76, 2.25, 0, BOULEVARD_Z, '#a39e88', -.006, trackTexture);
  surface(76, 3.6, 0, -11.6, '#b6b6a8', -.022);
  surface(76, 5.4, 0, -25.5, '#c3c3b3', -.02);
  const plazaTexture = texture.clone();
  plazaTexture.repeat.set(5.5, 3.75);
  surface(22, 15, 0, 8.5, '#d0c4af', .002, plazaTexture);
  for (const x of [-11.12, 11.12]) {
    for (const z of [4, 13]) part('box', '#c4c7c1', x, .035, z, .22, .07, 5.8);
  }
  for (const x of [-7.2, 7.2]) part('box', '#c4c7c1', x, .035, 16.1, 7, .07, .22);
  // Crossings connect the shop square, port alleys and waterfront promenade.
  for (const x of [-10, 10]) for (let n = -4; n <= 4; n++) {
    part('box', '#e6dfc8', x, .008, BOULEVARD_Z + n, 1.9, .012, .52);
  }
  for (const z of [BOULEVARD_Z - .65, BOULEVARD_Z + .65]) part('box', '#869998', 0, .025, z, 76, .025, .065);
  for (const z of [BOULEVARD_Z - 4.5, BOULEVARD_Z + 4.5]) part('box', '#d7d3bd', 0, .006, z, 76, .012, .1);
  for (let x = -34; x <= 34; x += 3.5) for (const side of [-1, 1]) {
    if (Math.abs(Math.abs(x) - 10) < 2.4) continue;
    part('box', '#e2ddc7', x, .009, BOULEVARD_Z + side * 1.65, 1.6, .012, .07);
  }
  function sign(text, x, y, z, width, color = '#254e50') {
    const c = document.createElement('canvas'); c.width = 512; c.height = 96;
    const g = c.getContext('2d');
    g.fillStyle = color; g.fillRect(0, 0, 512, 96);
    g.strokeStyle = '#dcd2ac'; g.lineWidth = 4; g.strokeRect(7, 7, 498, 82);
    g.fillStyle = '#fff0c2'; g.font = 'bold 43px sans-serif';
    const textWidth = g.measureText(text).width;
    const maxTextWidth = c.width - 48;
    if (textWidth > maxTextWidth) g.font = `bold ${Math.floor(43 * maxTextWidth / textWidth)}px sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 256, 50);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, width * 96 / 512), new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 }));
    mesh.position.set(x, y, z);
    scene.add(mesh);
    return mesh;
  }
  const colors = ['#cd9a7f', '#d5c590', '#8fa9a4', '#ceb7a4', '#b38b84', '#a6b2be'];
  let buildingIndex = 0;
  function building(x, z, w, d, h, options = {}) {
    const group = new THREE.Group();
    group.name = options.name ?? 'Residential building';
    group.position.set(x, 0, z);
    group.rotation.y = options.turn ?? 0;
    activeBuilding = {
      group, x, z, batches: new Map(), materials: [], meshes: [], opacity: 1, hiddenUntil: 0,
      bounds: new THREE.Box3(),
    };
    const kind = options.kind ?? 'residential';
    const color = options.color ?? colors[buildingIndex % colors.length];
    buildingIndex++;
    const turned = Math.abs(Math.sin(group.rotation.y)) > .5;
    obstacle(x, z, (turned ? d : w) + .12, (turned ? w : d) + .12, h + 1);
    part('box', color, x, h / 2, z, w, h, d);
    part('box', '#87877e', x, .16, z, w + .08, .32, d + .08);
    part('box', '#e0d6c0', x, h - .14, z, w + .23, .22, d + .23);
    part('box', '#48565d', x, h + .17, z, w + .1, .35, d + .1);
    const front = z + d / 2;
    if (kind === 'warehouse') {
      // Brick courses, pilasters, arched windows and large loading doors.
      for (const side of [-1, 1]) {
        for (let row = .55; row < h - .35; row += .48) {
          part('box', '#a16e59', x, row, z + side * (d / 2 + .014), w, .018, .024);
          for (let col = -w / 2 + .6; col < w / 2; col += 1.2) {
            part('box', '#a16e59', x + col + (Math.round(row / .48) % 2) * .35, row + .23, z + side * (d / 2 + .015), .018, .44, .026);
          }
        }
        for (let col = -w / 2 + 1; col <= w / 2 - .8; col += 1.8) {
          part('box', '#b68161', x + col, h / 2, z + side * (d / 2 + .08), .18, h, .18);
          for (const y of [1.1, 2.9]) {
            part('box', '#dfc89e', x + col + .7, y, z + side * (d / 2 + .05), .7, .95, .08);
            part('box', '#36515a', x + col + .7, y + .02, z + side * (d / 2 + .1), .51, .72, .05);
            part('sphere', '#36515a', x + col + .7, y + .36, z + side * (d / 2 + .1), .51, .36, .06);
          }
        }
      }
      for (const offset of [-w * .27, w * .27]) {
        part('box', '#d0ba91', x + offset, 1, front + .17, 1.65, 2.05, .17);
        part('box', '#405458', x + offset, .97, front + .27, 1.36, 1.85, .05);
      }
      part('box', '#6e7370', x, h + .42, z, w + .1, .2, d + .1);
    } else if (kind === 'terminal') {
      for (const side of [-1, 1]) {
        part('box', '#345967', x, h * .5, z + side * (d / 2 + .04), w - .45, h * .66, .1);
        for (let col = -w / 2 + .65; col < w / 2; col += 1.15) {
          part('box', '#c5cfcb', x + col, h * .5, z + side * (d / 2 + .11), .075, h * .68, .08);
        }
        part('box', '#526d71', x, h * .48, z + side * (d / 2 + .12), w, .13, .12);
      }
      part('box', '#d2d8cc', x, h + .25, z, w + 1.2, .22, d + 1.3);
      part('box', '#394c50', x, 2.3, front + .9, w + .4, .22, 2.3);
      part('box', '#d7d2b7', x, .06, front + .85, w + .8, .12, 2.1);
      for (const offset of [-w * .4, w * .4]) part('box', '#c3c7b6', x + offset, 1.15, front + 1.55, .12, 2.3, .12);
      obstacle(x, front + .7, w + .5, 2.3, 2.5);
    } else if (kind === 'shop') {
      // A larger silver department store, with a red tower and glass frontage.
      for (let y = 1.4; y < h; y += 1.3) {
        for (const side of [-1, 1]) {
          part('box', '#405c66', x, y, z + side * (d / 2 + .025), w - .35, .25, .07);
          part('box', '#d8dacf', x + side * (w / 2 + .04), y, z, .08, .12, d);
        }
      }
      for (const side of [-1, 1]) {
        part('box', '#638c92', x + side * (w / 2 + .05), 1, z, .1, 1.65, d - .5);
        part('box', '#638c92', x, 1, z + side * (d / 2 + .05), w - .5, 1.65, .1);
      }
      part('box', '#bb2635', x - w * .38, h * .54, front + .16, .65, h * .94, .3);
      part('box', '#405058', x, h + .4, z, w * .7, .45, d * .7);
    } else {
      part('box', '#6e7370', x + w * .23, h + .6, z + d * .2, .45, .8, .5);
      const floors = Math.floor(h / 1.18), columns = Math.floor(w / 1.2);
      for (const side of [-1, 1]) {
        for (let row = 0; row < floors; row++) for (let col = 0; col < columns; col++) {
          const wx = x + (col - (columns - 1) / 2) * 1.15, wy = .85 + row * STOREY_HEIGHT;
          part('box', '#e2d7bd', wx, wy, z + side * (d / 2 + .025), .67, .85, .07);
          part('box', random() > .42 ? '#edce87' : '#536f79', wx, wy, z + side * (d / 2 + .07), .49, .66, .05, 0, true);
          part('box', '#c8bfa8', wx, wy, z + side * (d / 2 + .11), .04, .67, .035);
        }
        for (let row = 0; row < floors; row++) for (let col = 0; col < Math.floor(d / 1.3); col++) {
          part('box', '#dfcda3', x + side * (w / 2 + .03), .85 + row * STOREY_HEIGHT, z + (col - (Math.floor(d / 1.3) - 1) / 2) * 1.2, .07, .78, .55);
        }
      }
      part('box', '#31434a', x, .6, front + .1, .8, 1.2, .15);
      if (options.cafe) {
        part('box', '#385f5a', x, 1.8, front + .45, w * .85, .18, 1.1);
        part('box', '#395b60', x, .9, front + .1, w * .72, 1.45, .12);
      }
    }
    buildings.push(activeBuilding);
    scene.add(group);
    activeBuilding = null;
  }
  // The industrial waterfront is opposite the colourful homes and cafés.
  building(-19, -18.5, 10, 7, 4.5, { kind: 'warehouse', color: '#985442', name: 'West brick warehouse' });
  building(-3.5, -19.2, 12, 6.5, 4.8, { kind: 'warehouse', color: '#a15e49', name: 'East brick warehouse' });
  building(17.5, -18, 12, 8.5, 4.1, { kind: 'terminal', color: '#77888a', name: 'West harbor terminal' });
  building(-14, 7.5, 7.2, 8, 6.8, { kind: 'shop', color: '#c3c8c4', name: 'Verkkopaukka' });
  building(17, 5.8, 7, 7, 5.8, { cafe: 'KAHVILA SATAMA', turn: -Math.PI / 2, color: '#d2b791' });
  building(-22.5, 17, 5, 6, 5.4, { cafe: 'LEIPOMO', color: '#a9bbb2' });
  building(17.8, 17.5, 6, 5.5, 6.2, { cafe: 'CAFE HELMI', color: '#bd8c77' });
  building(4.5, 22, 7.5, 5.2, 5.6, { cafe: 'KIOSKI', turn: Math.PI, color: '#a6b2be' });
  building(-7.5, 22, 6, 5, 5.8, { color: '#d5c590' });
  for (const x of [-22, -8, 8, 23]) building(x, 34, 6.5, 6, 6 + random() * 2);
  building(35, 8, 7, 8, 7.4, { color: '#b2aaa1' });
  function lamp(x, z) {
    part('cylinder', '#33454b', x, 1.25, z, 0.09, 2.5, 0.09);
    part('cylinder', '#33454b', x, 0.1, z, 0.3, 0.2, 0.3);
    part('box', '#33454b', x, 2.52, z, 0.4, 0.08, 0.4);
    part('box', '#ffe5a2', x, 2.7, z, 0.24, 0.3, 0.24, 0, true);
    part('box', '#33454b', x, 2.9, z, 0.4, 0.09, 0.4);
    obstacle(x, z, 0.28, 0.28, 2.95);
  }
  function planter(x, z) {
    part('box', '#727a77', x, 0.22, z, 1.3, 0.44, 1.3);
    part('box', '#433e33', x, 0.45, z, 1.15, 0.05, 1.15);
    part('cylinder', '#75513b', x, 1.1, z, 0.16, 1.4, 0.16);
    part('sphere', '#67845b', x, 2.15, z, 1.7, 2.1, 1.7);
    part('sphere', '#7d985f', x - 0.3, 2.65, z, 1.25, 1.2, 1.25);
    obstacle(x, z, 1.3, 1.3, 3.25);
  }
  for (const x of [-24, -8, 8, 25]) {
    lamp(x, 1.1);
    lamp(x, -24.7);
  }
  for (const [x, z] of [[-9, 13.7], [9.2, 13.7], [9.2, 3.3], [-10, -25.6], [7, -25.6]]) planter(x, z);
  // Café terraces face the open square, leaving broad paths around the tables.
  for (const [x, z] of [[12.2, 4.5], [12.2, 8], [16, 21.7]]) {
    part('cylinder', '#c8b592', x, .75, z, .95, .12, .95);
    part('cylinder', '#3b4849', x, .38, z, .09, .7, .09);
    for (const side of [-1, 1]) {
      part('box', '#a57c4d', x, .43, z + side * .8, .5, .12, .5);
      part('box', '#40514d', x, .2, z + side * .8, .08, .4, .45);
    }
    obstacle(x, z, 1.1, 2.2, 1);
  }
  for (const x of [-7, 6]) {
    part('box', '#a57c4d', x, .44, 16.9, 1.9, .12, .55);
    part('box', '#a57c4d', x, .74, 17.17, 1.9, .65, .08);
    obstacle(x, 16.95, 2, .7, 1.1);
  }
  for (const [x, z, color] of [[-25, -11.5, '#6593a0'], [25, -11.5, '#cc8058'], [-23, 5, '#9e5045']]) {
    part('box', color, x, .46, z, 1.8, .52, .85);
    part('box', '#384e59', x - .08, .86, z, .95, .42, .7);
    for (const wheel of [-.6, .6]) for (const side of [-1, 1]) part('sphere', '#30393e', x + wheel, .23, z + side * .43, .4, .4, .18);
    obstacle(x, z, 1.9, 1, 1.1);
  }
  // Overhead contact wire and cross spans make the tracks part of the street.
  part('box', '#455854', 0, 4.08, BOULEVARD_Z, 76, .025, .025);
  for (const x of [-26, -13, 0, 13, 26]) {
    for (const z of [-10.6, .9]) {
      part('cylinder', '#52625e', x, 2.2, z, .1, 4.4, .1);
      obstacle(x, z, .2, .2, 4.4);
    }
    part('box', '#52625e', x, 4.25, -4.85, .025, .025, 11.5);
  }
  const squareSign = sign('BAD BAD BOY / HELSINKI', 0, .025, 14.5, 5.5, '#4b6267');
  squareSign.rotation.x = -Math.PI / 2;
  // Physical bollards and painted edges communicate the playable boundary.
  for (let n = -26; n <= 26; n += 2) for (const s of [-1, 1]) {
    part('cylinder', '#697c7d', n, 0.28, s * 28.2, 0.13, 0.56, 0.13);
    part('cylinder', '#697c7d', s * 28.2, 0.28, n, 0.13, 0.56, 0.13);
  }
  // Granite seawall and mooring posts mark the northern edge of the city.
  part('box', '#697e80', 0, -.1, -28.75, 76, .55, .5);
  for (let x = -26; x <= 26; x += 4) {
    part('cylinder', '#334b52', x, .15, -28.45, .24, .3, .24);
    part('box', '#334b52', x, .31, -28.45, .4, .08, .15);
  }
  const tram = createTram(scene, { z: BOULEVARD_Z });
  const harbor = createHarbor(scene);
  for (const x of [-26, 9, 26]) obstacle(x, -26.6, 1.7, .85, 5.4);

  for (const batch of batches.values()) {
    const material = new THREE.MeshStandardMaterial({ color: batch.color, roughness: 0.85, emissive: batch.glow ? batch.color : '#000000', emissiveIntensity: batch.glow ? 0.22 : 0 });
    const mesh = new THREE.InstancedMesh(geometries[batch.shape], material, batch.transforms.length);
    batch.transforms.forEach(([x, y, z, sx, sy, sz, ry], i) => {
      dummy.position.set(x, y, z); dummy.scale.set(sx, sy, sz); dummy.rotation.set(0, ry, 0); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.computeBoundingSphere(); scene.add(mesh);
  }

  // Merge each house into a few coloured meshes, so it can fade independently
  // without adding a draw call for every window or affecting other houses.
  const position = new THREE.Vector3(), vertexNormal = new THREE.Vector3();
  const normalMatrix = new THREE.Matrix3();
  for (const house of buildings) {
    for (const glow of [false, true]) {
      const parts = [...house.batches.values()].filter(batch => batch.glow === glow);
      const vertexCount = parts.reduce((count, batch) => count + geometries[batch.shape].attributes.position.count * batch.transforms.length, 0);
      const indexCount = parts.reduce((count, batch) => count + geometries[batch.shape].index.count * batch.transforms.length, 0);
      if (!vertexCount) continue;
      const positions = new Float32Array(vertexCount * 3), normals = new Float32Array(vertexCount * 3), colors = new Float32Array(vertexCount * 3);
      const indices = new Uint32Array(indexCount);
      let vertexOffset = 0, indexOffset = 0;
      for (const batch of parts) {
        const source = geometries[batch.shape], color = new THREE.Color(batch.color);
        for (const [x, y, z, sx, sy, sz, ry] of batch.transforms) {
          dummy.position.set(x, y, z); dummy.scale.set(sx, sy, sz); dummy.rotation.set(0, ry, 0); dummy.updateMatrix();
          normalMatrix.getNormalMatrix(dummy.matrix);
          for (let i = 0; i < source.attributes.position.count; i++) {
            position.fromBufferAttribute(source.attributes.position, i).applyMatrix4(dummy.matrix);
            vertexNormal.fromBufferAttribute(source.attributes.normal, i).applyNormalMatrix(normalMatrix);
            const offset = (vertexOffset + i) * 3;
            position.toArray(positions, offset); vertexNormal.toArray(normals, offset); color.toArray(colors, offset);
          }
          for (let i = 0; i < source.index.count; i++) indices[indexOffset++] = vertexOffset + source.index.getX(i);
          vertexOffset += source.attributes.position.count;
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geometry.setIndex(new THREE.BufferAttribute(indices, 1));
      geometry.computeBoundingSphere();
      const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, emissive: glow ? '#ebce96' : '#000000', emissiveIntensity: glow ? 0.16 : 0 });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = mesh.receiveShadow = true;
      house.group.add(mesh); house.meshes.push(mesh); house.materials.push(material);
    }
    house.batches.clear();
    house.bounds.setFromObject(house.group).expandByScalar(0.06);
  }

  let sceneryTime = 0, tramCell = null;
  return {
    colliders,
    buildings,
    dynamicColliders: () => tram.root.visible ? [tram.collider] : [],
    reset() {
      tram.reset();
      sceneryTime = 0;
      tramCell = null;
    },
    update(dt, entities, navigation) {
      sceneryTime += dt;
      harbor.update(sceneryTime);
      const departed = tram.update(dt);
      if (tram.root.visible) {
        for (const entity of entities) {
          if (entity.alive === false) continue;
          const radius = entity.radius ?? entity.size;
          if (!overlaps(tram.collider, entity.x, entity.z, radius)) continue;
          // Push onto a clear side of the boulevard without crossing a building.
          const side = entity.z >= BOULEVARD_Z ? 1 : -1;
          for (const direction of [side, -side]) {
            const z = direction > 0 ? tram.collider.maxZ + radius + .08 : tram.collider.minZ - radius - .08;
            if (navigation.canStandAt(entity.x, z, radius)) {
              entity.z = z;
              entity.root.position.set(entity.x, 0, entity.z);
              break;
            }
          }
        }
      }
      const occupiedCell = tram.root.visible ? Math.floor(tram.root.position.x) : null;
      if (occupiedCell !== tramCell) { tramCell = occupiedCell; navigation.refresh(); }
      return departed ? 'TRAM 9 · JÄTKÄSAARI' : null;
    },
  };
}
