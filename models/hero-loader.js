import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const MODEL_URL = new URL('../assets/bad-bad-boy.glb', import.meta.url);

export async function loadHero(onStatus) {
  const url = MODEL_URL;
  const [response, { MeshoptDecoder }] = await Promise.all([
    fetch(url),
    import('meshoptimizer/decoder'),
  ]);
  if (!response.ok) throw new Error(`Hero download failed: HTTP ${response.status}`);
  let bytes;
  if (response.body) {
    const reader = response.body.getReader();
    const pending = [], header = new Uint8Array(12);
    let loaded = 0, headerLength = 0, total = 0, offset = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (total && loaded + value.byteLength > total) throw new Error('Hero GLB exceeds its declared length');
        if (bytes) {
          bytes.set(value, offset);
          offset += value.byteLength;
        } else pending.push(value);
        loaded += value.byteLength;
        if (headerLength < header.length) {
          const part = value.subarray(0, header.length - headerLength);
          header.set(part, headerLength); headerLength += part.length;
          if (headerLength === header.length) {
            const view = new DataView(header.buffer);
            if (view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2) throw new Error('Invalid hero GLB header');
            // GLB stores the decoded size. HTTP Content-Length can describe
            // compressed bytes, while fetch streams already decoded bytes.
            total = view.getUint32(8, true);
            if (total < 20) throw new Error('Invalid hero GLB length');
            if (loaded > total) throw new Error('Hero GLB exceeds its declared length');
            bytes = new Uint8Array(total);
            for (const chunk of pending) {
              bytes.set(chunk, offset);
              offset += chunk.byteLength;
            }
            pending.length = 0;
          }
        }
        if (total) {
          if (loaded > total) throw new Error('Hero GLB exceeds its declared length');
          const percent = Math.max(0, Math.min(99, Math.floor(loaded / total * 100)));
          onStatus(`Loading the hero… ${percent}%`);
        }
      }
    } finally {
      reader.releaseLock();
    }
    if (!total || loaded !== total || offset !== total) throw new Error('Hero GLB download is incomplete');
  } else {
    bytes = new Uint8Array(await response.arrayBuffer());
  }
  onStatus('Preparing the models…');
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  return loader.parseAsync(bytes.buffer, new URL('.', url).href);
}
