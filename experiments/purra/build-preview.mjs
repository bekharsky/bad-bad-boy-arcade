import { readFile, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const output = process.argv[2];
if (!output) throw new Error('Usage: node experiments/purra/build-preview.mjs <output.html>');
const folder = new URL('./', import.meta.url);
const { outputFiles } = await build({
  absWorkingDir: fileURLToPath(folder),
  entryPoints: ['preview.js'],
  bundle: true,
  external: ['three'],
  format: 'esm',
  loader: { '.webp': 'dataurl' },
  write: false,
});
const script = outputFiles[0].text.replaceAll(
  'from "three"',
  'from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js"'
);
const template = await readFile(new URL('preview.fragment.html', folder), 'utf8');
const marker = '<script type="module" id="purra-study-script"></script>';
if (!template.includes(marker)) throw new Error('Preview script marker is missing');
const fragment = template.replace(marker, () => `<script type="module">\n${script}</script>`);
if (Buffer.byteLength(fragment) > 1_000_000) throw new Error('Preview exceeds 1 MB');
await writeFile(output, fragment);
