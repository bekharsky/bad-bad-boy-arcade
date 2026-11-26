import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import { MeshoptDecoder } from 'meshoptimizer/decoder';

// Input is the canonical, single-mesh hero produced by prepare-model.mjs.
// Simplify the mesh, then store its GPU-ready buffers in meshopt streams.
export async function optimizeHero(bytes) {
  const jsonLength = bytes.readUInt32LE(12);
  const gltf = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString());
  if (gltf.extensionsRequired?.includes('EXT_meshopt_compression')) throw new Error('Hero asset is already meshopt-compressed');
  const binStart = 28 + jsonLength;
  const primitive = gltf.meshes[0].primitives[0];
  function read(id) {
    const accessor = gltf.accessors[id], view = gltf.bufferViews[accessor.bufferView];
    const size = { SCALAR: 1, VEC2: 2, VEC3: 3 }[accessor.type];
    const Type = { 5126: Float32Array, 5125: Uint32Array, 5123: Uint16Array }[accessor.componentType];
    const start = binStart + (view.byteOffset || 0) + (accessor.byteOffset || 0);
    if (view.byteStride || !size || !Type) throw new Error('Unsupported canonical hero attribute');
    return new Type(bytes.buffer.slice(bytes.byteOffset + start, bytes.byteOffset + start + accessor.count * size * Type.BYTES_PER_ELEMENT));
  }
  const positions = read(primitive.attributes.POSITION);
  const normals = read(primitive.attributes.NORMAL);
  const uvs = read(primitive.attributes.TEXCOORD_0);
  const indices = new Uint32Array(read(primitive.indices));
  const vertexCount = positions.length / 3;
  const attributes = new Float32Array(vertexCount * 8);
  const smoothstep = (value, low, high) => {
    const t = Math.max(0, Math.min(1, (value - low) / (high - low)));
    return t * t * (3 - 2 * t);
  };
  for (let i = 0; i < vertexCount; i++) {
    attributes.set(normals.subarray(i * 3, i * 3 + 3), i * 8);
    attributes.set(uvs.subarray(i * 2, i * 2 + 2), i * 8 + 3);
    // Preserve the same hip/knee/ankle transitions used by the runtime rig.
    const y = positions[i * 3 + 1];
    attributes[i * 8 + 5] = smoothstep(y, .43, .515);
    attributes[i * 8 + 6] = smoothstep(y, .22, .305);
    attributes[i * 8 + 7] = smoothstep(y, .03, .09);
  }
  await Promise.all([MeshoptSimplifier.ready, MeshoptEncoder.ready]);
  const [simplified, error] = MeshoptSimplifier.simplifyWithAttributes(
    indices, positions, 3, attributes, 8,
    [.25, .25, .25, 2, 2, .5, .5, .5], null,
    30000 * 3, .008, ['RegularizeLight']
  );
  // Optimise vertex-cache locality and remove unused vertices in every stream.
  const [remap, count] = MeshoptEncoder.reorderMesh(simplified, true, false);
  function compact(source, size) {
    const output = new Float32Array(count * size);
    for (let i = 0; i < remap.length; i++) if (remap[i] !== 0xffffffff) {
      output.set(source.subarray(i * size, i * size + size), remap[i] * size);
    }
    return output;
  }
  const imageView = gltf.bufferViews[gltf.images[0].bufferView];
  const imageStart = binStart + (imageView.byteOffset || 0);
  const jpeg = await sharp(bytes.subarray(imageStart, imageStart + imageView.byteLength))
    .resize({ width: 1024, withoutEnlargement: true }).jpeg({ quality: 85, mozjpeg: true }).toBuffer();

  gltf.asset.generator = 'Piss Deal: meshoptimizer + Sharp';
  gltf.bufferViews = []; gltf.accessors = [];
  const chunks = []; let byteOffset = 0;
  function addBuffer(data, target) {
    const index = gltf.bufferViews.length;
    const padded = Buffer.alloc(Math.ceil(data.length / 4) * 4); data.copy(padded);
    gltf.bufferViews.push({ buffer: 0, byteOffset, byteLength: data.length, ...(target ? { target } : {}) });
    chunks.push(padded); byteOffset += padded.length;
    return index;
  }
  function addAccessor(typed, size, componentType, target) {
    const bufferView = addBuffer(Buffer.from(typed.buffer, typed.byteOffset, typed.byteLength), target);
    const min = Array(size).fill(Infinity), max = Array(size).fill(-Infinity);
    for (let i = 0; i < typed.length; i++) {
      const axis = i % size;
      min[axis] = Math.min(min[axis], typed[i]); max[axis] = Math.max(max[axis], typed[i]);
    }
    const index = gltf.accessors.length;
    gltf.accessors.push({ bufferView, componentType, count: typed.length / size, type: { 1: 'SCALAR', 2: 'VEC2', 3: 'VEC3' }[size], min, max });
    return index;
  }
  primitive.attributes = {
    POSITION: addAccessor(compact(positions, 3), 3, 5126, 34962),
    NORMAL: addAccessor(compact(normals, 3), 3, 5126, 34962),
    TEXCOORD_0: addAccessor(compact(uvs, 2), 2, 5126, 34962)
  };
  primitive.indices = addAccessor(count < 65536 ? new Uint16Array(simplified) : simplified, 1, count < 65536 ? 5123 : 5125, 34963);
  gltf.images = [{ bufferView: addBuffer(jpeg), mimeType: 'image/jpeg' }];
  gltf.buffers = [{ byteLength: byteOffset }];
  const jsonBytes = Buffer.from(JSON.stringify(gltf));
  const json = Buffer.alloc(Math.ceil(jsonBytes.length / 4) * 4, 0x20); jsonBytes.copy(json);
  const bin = Buffer.concat(chunks), header = Buffer.alloc(20), binHeader = Buffer.alloc(8);
  header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + json.length + bin.length, 8);
  header.writeUInt32LE(json.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
  binHeader.writeUInt32LE(bin.length, 0); binHeader.writeUInt32LE(0x004e4942, 4);
  const optimized = Buffer.concat([header, json, binHeader, bin]);
  return {
    bytes: await compressHeroAsset(optimized),
    stats: { verticesBefore: vertexCount, vertices: count, trianglesBefore: indices.length / 3, triangles: simplified.length / 3, relativeError: error, textureBytes: jpeg.length }
  };
}

// Preserve an uncompressed metadata buffer for glTF conformance while storing
// only compressed data in the GLB. The fallback buffer has no binary payload;
// the asset requires a meshopt-capable GLTFLoader.
export async function compressHeroAsset(bytes) {
  await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready]);
  const jsonLength = bytes.readUInt32LE(12);
  const gltf = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString());
  if (gltf.extensionsRequired?.includes('EXT_meshopt_compression')) throw new Error('Hero asset is already meshopt-compressed');
  const binStart = 28 + jsonLength;
  const sourceViews = gltf.bufferViews;
  const primitive = gltf.meshes[0].primitives[0];
  const imageData = gltf.images.map(image => {
    if (image.uri || image.bufferView === undefined) throw new Error('Hero images must be embedded in the GLB');
    const view = sourceViews[image.bufferView];
    const start = binStart + (view.byteOffset || 0);
    return { image, bytes: bytes.subarray(start, start + view.byteLength) };
  });
  const compressedChunks = [];
  let compressedOffset = 0, fallbackOffset = 0;
  const alignedLength = length => Math.ceil(length / 4) * 4;

  function appendCompressed(source, count, stride, mode) {
    const encoded = Buffer.from(MeshoptEncoder.encodeGltfBuffer(source, count, stride, mode));
    const decoded = new Uint8Array(source.byteLength);
    MeshoptDecoder.decodeGltfBuffer(decoded, count, stride, encoded, mode);
    if (mode === 'TRIANGLES') {
      const IndexArray = stride === 2 ? Uint16Array : Uint32Array;
      const original = new IndexArray(source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength));
      const restored = new IndexArray(decoded.buffer, decoded.byteOffset, decoded.length / stride);
      for (let i = 0; i < count; i += 3) {
        const a = original[i], b = original[i + 1], c = original[i + 2];
        const x = restored[i], y = restored[i + 1], z = restored[i + 2];
        if (!((x === a && y === b && z === c) || (x === b && y === c && z === a) || (x === c && y === a && z === b))) {
          throw new Error(`Meshopt triangle round-trip changed face ${i / 3}`);
        }
      }
    } else {
      for (let i = 0; i < decoded.length; i++) {
        if (decoded[i] !== source[i]) throw new Error(`Meshopt ${mode} round-trip changed byte ${i}`);
      }
    }
    const offset = compressedOffset;
    const padded = Buffer.alloc(alignedLength(encoded.length));
    encoded.copy(padded);
    compressedChunks.push(padded);
    compressedOffset += padded.length;
    return { offset, length: encoded.length };
  }

  gltf.bufferViews = [];
  function addCompressedAccessor(accessorIndex, mode) {
    const accessor = gltf.accessors[accessorIndex];
    const sourceView = sourceViews[accessor.bufferView];
    const componentBytes = { 5121: 1, 5123: 2, 5125: 4, 5126: 4 }[accessor.componentType];
    const components = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[accessor.type];
    if (!componentBytes || !components) throw new Error(`Unsupported hero accessor: ${accessor.type}/${accessor.componentType}`);
    const stride = componentBytes * components;
    if (sourceView.byteStride && sourceView.byteStride !== stride) throw new Error('Interleaved hero attributes are not supported');
    const start = binStart + (sourceView.byteOffset || 0) + (accessor.byteOffset || 0);
    const source = bytes.subarray(start, start + accessor.count * stride);
    if (source.byteLength !== accessor.count * stride) throw new Error('Incomplete hero accessor data');
    const packed = appendCompressed(source, accessor.count, stride, mode);
    const decodedLength = accessor.count * stride;
    const bufferView = gltf.bufferViews.length;
    gltf.bufferViews.push({
      buffer: 1,
      byteOffset: fallbackOffset,
      byteLength: decodedLength,
      ...(sourceView.target ? { target: sourceView.target } : {}),
      ...(mode === 'ATTRIBUTES' ? { byteStride: stride } : {}),
      extensions: {
        EXT_meshopt_compression: {
          buffer: 0,
          byteOffset: packed.offset,
          byteLength: packed.length,
          byteStride: stride,
          count: accessor.count,
          mode,
        },
      },
    });
    fallbackOffset += alignedLength(decodedLength);
    accessor.bufferView = bufferView;
    delete accessor.byteOffset;
  }

  for (const accessorIndex of Object.values(primitive.attributes)) addCompressedAccessor(accessorIndex, 'ATTRIBUTES');
  addCompressedAccessor(primitive.indices, 'TRIANGLES');
  for (const { image, bytes: imageBytes } of imageData) {
    const offset = compressedOffset;
    const padded = Buffer.alloc(alignedLength(imageBytes.length));
    imageBytes.copy(padded);
    compressedChunks.push(padded);
    compressedOffset += padded.length;
    image.bufferView = gltf.bufferViews.length;
    gltf.bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: imageBytes.length });
  }

  const extension = 'EXT_meshopt_compression';
  gltf.extensionsUsed = [...new Set([...(gltf.extensionsUsed || []), extension])];
  gltf.extensionsRequired = [...new Set([...(gltf.extensionsRequired || []), extension])];
  gltf.buffers = [
    { byteLength: compressedOffset },
    { byteLength: fallbackOffset, extensions: { [extension]: { fallback: true } } },
  ];

  const jsonBytes = Buffer.from(JSON.stringify(gltf));
  const json = Buffer.alloc(alignedLength(jsonBytes.length), 0x20); jsonBytes.copy(json);
  const bin = Buffer.concat(compressedChunks), header = Buffer.alloc(20), binHeader = Buffer.alloc(8);
  header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + json.length + bin.length, 8);
  header.writeUInt32LE(json.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
  binHeader.writeUInt32LE(bin.length, 0); binHeader.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([header, json, binHeader, bin]);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [, , input, output, mode] = process.argv;
  if (!input || !output || input === output) throw new Error('Usage: node scripts/optimize-model.mjs input.glb output.glb [--compress-only]');
  const source = await fs.readFile(input);
  const result = mode === '--compress-only' ? { bytes: await compressHeroAsset(source), stats: {} } : await optimizeHero(source);
  await fs.writeFile(output, result.bytes);
  console.log({ ...result.stats, bytesBefore: source.length, bytes: result.bytes.length, output });
}
