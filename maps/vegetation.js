import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

// Static, deterministic parts join the map's existing colour batch. No mesh or
// material per leaf, and no random calls that change later scenery placement.
export function addTree(model, { x = 0, y = 0, z = 0, height = 4.4, radius = 1.2, variant = 0 } = {}) {
  const style = ((variant % 3) + 3) % 3;
  const palettes = [
    ['#457c70', '#799d64', '#b7c777'],
    ['#24594f', '#387565', '#599882'],
    ['#637d50', '#94a65f', '#d7bc73'],
  ];
  const palette = palettes[style], lean = Math.sin(variant * 2.17) * radius * .14;
  function branch(from, to, bottom, top, color = '#806047') {
    const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to), delta = b.clone().sub(a);
    const piece = new THREE.CylinderGeometry(top, bottom, delta.length(), 4);
    piece.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize()));
    model.geometry(color, piece.translate(...a.add(b).multiplyScalar(.5).toArray()));
  }
  if (style === 1) {
    branch([x, y, z], [x, y + height * .64, z], radius * .12, radius * .06);
    // Three overlapping skirts, with slightly different facet directions.
    for (let tier = 0; tier < 3; tier++) {
      const h = height * (.46 - tier * .055);
      const bottom = y + height * [.18, .41, .64][tier];
      const r = radius * (1 - tier * .24);
      const crown = new THREE.LatheGeometry([
        new THREE.Vector2(.02*r,-h*.45), new THREE.Vector2(r,-h*.5),
        new THREE.Vector2(.50*r,-h*.16), new THREE.Vector2(.04*r,h*.5),
      ], 7);
      model.geometry(palette[tier], crown.rotateY(tier * .43 + variant).translate(x, bottom + h / 2, z));
    }
    return;
  }
  const birch = style === 0;
  branch([x, y + radius * .01, z], [x + lean, y + height * .7, z], radius * .13, radius * .055, birch ? '#dedbc0' : '#806047');
  if (birch) for (let i = 1; i < 5; i++) {
    const t = i * .11;
    model.box('#515955', x + lean * t / .7, y + t * height, z + radius * (.106 - .07*t),
      radius * (.13 + .035 * (i % 2)), height * .013, radius * .055, .12 * (i % 3 - 1));
  }
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
    const source = new THREE.IcosahedronGeometry(radius * size, 0);
    // Foliage has no texture: welding without UV seams keeps the tree small.
    source.deleteAttribute('uv');
    source.deleteAttribute('normal');
    const piece = mergeVertices(source);
    piece.computeVertexNormals();
    source.dispose();
    piece
      .scale(1, height / radius * (birch ? .23 : .19), .92).rotateY(angle)
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
