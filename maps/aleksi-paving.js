import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// One repeatable colour/height pair for the whole district. World-aligned UVs
// keep the joints continuous across patches, without geometry for every stone.
function stoneTextures() {
  const size = 512, colour = new Uint8Array(size * size * 4), height = new Uint8Array(colour.length);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const row = y >> 6, u = (x + (row % 2) * 32) % size, column = u >> 6;
    const hash = ((row + 1) * 73856093 ^ (column + 7) * 19349663) >>> 0;
    const edge = Math.min(u % 64, 63 - u % 64, y % 64, 63 - y % 64);
    const joint = edge < 2, bevel = Math.min(1, Math.max(0, (edge - 2) / 4));
    const grain = ((x * 17 ^ y * 29 ^ hash) & 7) - 3;
    const shade = joint ? 100 + grain : 179 + hash % 37 + grain - (1 - bevel) * 18;
    const pink = hash % 6 === 0, i = (y * size + x) * 4;
    colour[i] = shade + (pink ? 10 : 2); colour[i + 1] = shade; colour[i + 2] = shade - (pink ? 8 : 1); colour[i + 3] = 255;
    const relief = joint ? 38 : 150 + bevel * 80 + grain;
    height[i] = height[i + 1] = height[i + 2] = relief; height[i + 3] = 255;
  }
  const map = new THREE.DataTexture(colour, size, size), bumpMap = new THREE.DataTexture(height, size, size);
  map.colorSpace = THREE.SRGBColorSpace;
  for (const texture of [map, bumpMap]) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.magFilter = THREE.LinearFilter; texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps = true; texture.anisotropy = 4; texture.needsUpdate = true;
  }
  return { map, bumpMap };
}

export function createAleksiPaving() {
  const root = new THREE.Group(); root.name = 'Aleksi granite paving';
  const textures = stoneTextures(), batches = new Map();
  const styles = { road: { colour: '#b7b5ad', scale: 1 }, square: { colour: '#d5c8b4', scale: 1 }, walk: { colour: '#d2d0c6', scale: 1.65 } };
  return {
    root,
    rectangle(style, width, depth, x, z, y) {
      const geometry = new THREE.PlaneGeometry(width, depth).rotateX(-Math.PI / 2).translate(x, y, z);
      const { position, uv } = geometry.attributes, scale = styles[style].scale;
      for (let i = 0; i < position.count; i++) uv.setXY(i, position.getX(i) / (2.72 * scale), -position.getZ(i) / (2.08 * scale));
      if (!batches.has(style)) batches.set(style, []);
      batches.get(style).push(geometry);
    },
    finish() {
      for (const [style, pieces] of batches) {
        const material = new THREE.MeshStandardMaterial({ color: styles[style].colour, ...textures, bumpScale: .025, roughness: .95 });
        const mesh = new THREE.Mesh(mergeGeometries(pieces), material);
        mesh.name = `Aleksi ${style} setts`; mesh.receiveShadow = true; root.add(mesh);
        for (const piece of pieces) piece.dispose();
      }
      batches.clear(); return root;
    },
  };
}
