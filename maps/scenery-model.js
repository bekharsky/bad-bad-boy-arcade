import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// CPU-only source for the repeated box details in building facades.
const unitBox = new THREE.BoxGeometry(1, 1, 1);
const boxPositions = unitBox.getAttribute('position').array;
const boxNormals = unitBox.getAttribute('normal').array;
const boxUvs = unitBox.getAttribute('uv').array;
const boxIndices = unitBox.index.array;
const boxVertexCount = unitBox.getAttribute('position').count;

function mergeBoxRun(boxes) {
  const count = boxes.length / 7;
  const positions = new Float32Array(count * boxPositions.length);
  const normals = new Float32Array(count * boxNormals.length);
  const uvs = new Float32Array(count * boxUvs.length);
  const IndexArray = count * boxVertexCount > 65535 ? Uint32Array : Uint16Array;
  const indices = new IndexArray(count * boxIndices.length);
  for (let box = 0; box < count; box++) {
    const offset = box * 7;
    const x = boxes[offset], y = boxes[offset + 1], z = boxes[offset + 2];
    const w = boxes[offset + 3], h = boxes[offset + 4], d = boxes[offset + 5];
    const rotation = boxes[offset + 6];
    const cosine = Math.cos(rotation), sine = Math.sin(rotation);
    for (let vertex = 0; vertex < boxVertexCount; vertex++) {
      const source = vertex * 3, target = (box * boxVertexCount + vertex) * 3;
      const localX = boxPositions[source] * w, localY = boxPositions[source + 1] * h;
      positions[target] = localX * cosine - localY * sine + x;
      positions[target + 1] = localX * sine + localY * cosine + y;
      positions[target + 2] = boxPositions[source + 2] * d + z;
      normals[target] = boxNormals[source] * cosine - boxNormals[source + 1] * sine;
      normals[target + 1] = boxNormals[source] * sine + boxNormals[source + 1] * cosine;
      normals[target + 2] = boxNormals[source + 2];
      const uv = (box * boxVertexCount + vertex) * 2;
      uvs[uv] = boxUvs[vertex * 2]; uvs[uv + 1] = boxUvs[vertex * 2 + 1];
    }
    for (let i = 0; i < boxIndices.length; i++) indices[box * boxIndices.length + i] = boxIndices[i] + box * boxVertexCount;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  return geometry;
}

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
    if (finished) throw new Error(`Scenery model ${name} is already finished`);
    if (color == null) throw new Error('Uncoloured scenery needs a colour attribute');
    if (!batches.has(color)) batches.set(color, []);
    const pieces = batches.get(color);
    let run = pieces[pieces.length - 1];
    if (!run?.boxes) { run = { boxes: [] }; pieces.push(run); }
    run.boxes.push(x, y, z, w, h, d, rotation);
  }
  function finish({ vertexColors = false, roughness = .65, emissive = '#000000', emissiveIntensity = 0 } = {}) {
    if (finished) return group;
    finished = true;
    if (!batches.size) return group;
    const mergedPieces = [];
    for (const [color, pieces] of batches) {
      for (let i = 0; i < pieces.length; i++) if (pieces[i].boxes) pieces[i] = mergeBoxRun(pieces[i].boxes);
    }
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

