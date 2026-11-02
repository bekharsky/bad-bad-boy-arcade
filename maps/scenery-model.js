import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Own all submitted pieces until finish(), then transfer the merged resources
// to the returned subtree. Maps release that subtree through disposeObject().
export function createSceneryModel(name) {
  const group = new THREE.Group();
  group.name = name;
  const batches = new Map();
  let finished = false;
  function geometry(color, piece) {
    if (finished) throw new Error(`Scenery model ${name} is already finished`);
    if (color == null && !piece.getAttribute('color')) throw new Error('Uncoloured scenery needs a colour attribute');
    // Extruded silhouettes and indexed primitives can share a colour batch.
    if (!piece.index) piece.setIndex(Array.from({ length: piece.attributes.position.count }, (_, i) => i));
    if (!piece.getAttribute('normal')) piece.computeVertexNormals();
    if (!piece.getAttribute('uv')) piece.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(piece.attributes.position.count * 2), 2));
    if (!batches.has(color)) batches.set(color, []);
    batches.get(color).push(piece);
  }
  function box(color, x, y, z, w, h, d, rotation = 0) {
    geometry(color, new THREE.BoxGeometry(w, h, d).rotateZ(rotation).translate(x, y, z));
  }
  function finish({ vertexColors = false, roughness = .65, emissive = '#000000', emissiveIntensity = 0 } = {}) {
    if (finished) return group;
    finished = true;
    if (!batches.size) return group;
    const mergedPieces = [];
    if (vertexColors) for (const [color, pieces] of batches) {
      const shade = color == null ? null : new THREE.Color(color);
      for (const piece of pieces) {
        if (!shade) { mergedPieces.push(piece); continue; }
        const colors = new Float32Array(piece.attributes.position.count * 3);
        for (let i = 0; i < colors.length; i += 3) shade.toArray(colors, i);
        piece.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        mergedPieces.push(piece);
      }
    }
    const groups = vertexColors ? [[null, mergedPieces]] : batches;
    for (const [color, pieces] of groups) {
      const merged = mergeGeometries(pieces);
      if (!merged) throw new Error(`Incompatible geometry in scenery model ${name}`);
      const material = new THREE.MeshStandardMaterial({ ...(vertexColors || color == null ? { vertexColors: true } : { color }), roughness, emissive, emissiveIntensity });
      const mesh = new THREE.Mesh(merged, material);
      mesh.castShadow = mesh.receiveShadow = true;
      group.add(mesh);
      for (const piece of pieces) piece.dispose();
    }
    batches.clear();
    return group;
  }
  return { group, box, geometry, finish };
}

export function destination(text, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#122a29'; ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = '#ffdf81'; ctx.font = 'bold 64px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 256, 68, 480);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshStandardMaterial({ map: texture, emissiveMap: texture, emissive: '#ffffff', emissiveIntensity: .3 }));
}

