import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Merge small details by colour: the vehicles need only a few draw calls.
export function createSceneryModel(name) {
  const group = new THREE.Group();
  group.name = name;
  const batches = new Map();
  function geometry(color, piece) {
    // Extruded silhouettes and indexed primitives can share a colour batch.
    if (!piece.index) piece.setIndex(Array.from({ length: piece.attributes.position.count }, (_, i) => i));
    if (!batches.has(color)) batches.set(color, []);
    batches.get(color).push(piece);
  }
  function box(color, x, y, z, w, h, d, rotation = 0) {
    geometry(color, new THREE.BoxGeometry(w, h, d).rotateZ(rotation).translate(x, y, z));
  }
  function finish() {
    for (const [color, pieces] of batches) {
      const merged = mergeGeometries(pieces);
      const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ color, roughness: .65 }));
      mesh.castShadow = mesh.receiveShadow = true;
      group.add(mesh);
      for (const piece of pieces) piece.dispose();
    }
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

