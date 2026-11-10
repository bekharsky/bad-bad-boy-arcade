import { readFile, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { CAMEO_PHOTO_FILES } from '../../runner/cameo-photos.js';

const output = process.argv[2];
if (!output) throw new Error('Usage: node experiments/cameos/build-preview.mjs <output.html>');
const directory = new URL('./', import.meta.url);
const { outputFiles } = await build({
  absWorkingDir: fileURLToPath(directory),
  entryPoints: ['lineup.js'],
  bundle: true,
  format: 'esm',
  write: false,
  plugins: [{
    name: 'three-cdn',
    setup(builder) {
      builder.onResolve({ filter: /^three$/ }, () => ({
        path: 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js', external: true,
      }));
    },
  }],
});
const photos = Object.fromEntries(await Promise.all(CAMEO_PHOTO_FILES.map(async file => {
  const bytes = await readFile(new URL(`../../assets/cameos/${file}`, directory));
  return [file, `data:image/webp;base64,${bytes.toString('base64')}`];
})));
const template = await readFile(new URL('lineup.fragment.html', directory), 'utf8');
const fragment = template
  .replace('<script type="application/json" id="lineup-photos"></script>', () => `<script type="application/json" id="lineup-photos">${JSON.stringify(photos)}</script>`)
  .replace('<script type="module" id="lineup-script"></script>', () => `<script type="module">\n${outputFiles[0].text}</script>`);
if (Buffer.byteLength(fragment) > 1_000_000) throw new Error('Preview exceeds 1 MB');
await writeFile(output, fragment);
