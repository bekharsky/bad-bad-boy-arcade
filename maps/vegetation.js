import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

// Static, deterministic parts join the map's existing colour batch. No mesh or
// material per leaf, and no random calls that change later scenery placement.
export function addTree(model, { x = 0, y = 0, z = 0, height = 4.4, radius = 1.2, variant = 0 } = {}) {
  const style = ((variant % 3) + 3) % 3;
  const palettes = [
    ['#4f8459', '#71a35e', '#a5bf6a'],
    ['#718b4c', '#a4b75b', '#d1c775'],
    ['#528b70', '#78ab75', '#add08b'],
  ];
  const palette = palettes[style], lean = Math.sin(variant * 2.17) * radius * .14;
  function branch(from, to, bottom, top, color = '#806047') {
    const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to), delta = b.clone().sub(a);
    const piece = new THREE.CylinderGeometry(top, bottom, delta.length(), 4);
    piece.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize()));
    model.geometry(color, piece.translate(...a.add(b).multiplyScalar(.5).toArray()));
  }
  branch([x, y + radius * .01, z], [x + lean, y + height * .7, z], radius * .13, radius * .055);
  for (let i = 0; i < 3; i++) {
    const angle = i * Math.PI * 2 / 3 + variant * .7;
    const dx = Math.cos(angle), dz = Math.sin(angle);
    branch([x + lean * .5, y + height * .37, z], [x + dx * radius * .65, y + height * .72, z + dz * radius * .65], radius * .07, radius * .025, '#97714e');
  }
  for (let i = 0; i < 6; i++) {
    const angle = i * 2.39996 + variant * .8;
    const ring = i === 5 ? .12 : .5 + (i % 2) * .12;
    const cy = i === 5 ? .83 : .65 + (i % 3) * .055;
    const size = i === 5 ? .7 : .68 + (i % 3) * .045;
    const source = new THREE.IcosahedronGeometry(radius * size, 1);
    // Foliage has no texture: welding without UV seams keeps the tree small.
    source.deleteAttribute('uv');
    const piece = mergeVertices(source);
    source.dispose();
    piece
      .scale(1, height / radius * .19, .92).rotateY(angle)
      .translate(x + lean + Math.cos(angle) * radius * ring, y + height * cy, z + Math.sin(angle) * radius * ring);
    model.geometry(palette[i === 5 ? 2 : i % 3], piece);
  }
  // A few coral blossoms on every third tree, tiny golden fruit on the others.
  for (let i = 0; i < (style === 2 ? 6 : 3); i++) {
    const angle = i * 2.39996 + variant;
    const cy = y + height * (.7 + (i % 3) * .055);
    const cx = x + lean + Math.cos(angle) * radius * .88, cz = z + Math.sin(angle) * radius * .88;
    model.geometry(style === 2 ? (i % 2 ? '#f2bcac' : '#e98f89') : '#dec36e',
      new THREE.OctahedronGeometry(radius * (style === 2 ? .115 : .07), 0).translate(cx, cy, cz));
  }
}
