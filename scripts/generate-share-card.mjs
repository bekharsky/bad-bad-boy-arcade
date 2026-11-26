import { readFile, writeFile } from 'node:fs/promises';
import { initWasm, Resvg } from '@resvg/resvg-wasm';

await initWasm(await readFile(new URL(import.meta.resolve('@resvg/resvg-wasm/index_bg.wasm'))));
const image = (await readFile('art/harbor.jpg')).toString('base64');
const font = await readFile('art/BarlowCondensed-Bold.ttf');
const poster = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1200" height="630">
  <image y="-54" width="1200" height="630" xlink:href="data:image/jpeg;base64,${image}"/>
  <path fill="#fff0cb" d="M0 469L1200 448V630H0Z"/>
  <path fill="#b03225" d="M40 32H247L242 94H35Z"/>
  <g font-family="Barlow Condensed" font-weight="700">
    <text x="55" y="80" fill="#fff0cb" font-size="48">PISS DEAL</text>
    <text x="43" y="565" fill="#26221d" font-size="70">Bad Bad Boy needs you.</text>
    <path stroke="#b03225" stroke-width="4" d="M654 501v84"/>
    <text x="692" y="533" fill="#26221d" font-size="45">Find Joulupukki’s</text>
    <text x="692" y="583" fill="#26221d" font-size="45">6 sleigh parts.</text>
  </g></svg>`;
const renderer = new Resvg(poster, {font:{fontBuffers:[font]}});
await writeFile('public/share-card.png', renderer.render().asPng());
