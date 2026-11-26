import { readFile, writeFile } from 'node:fs/promises';
import { initWasm, Resvg } from '@resvg/resvg-wasm';

await initWasm(await readFile(new URL(import.meta.resolve('@resvg/resvg-wasm/index_bg.wasm'))));
const image = (await readFile('art/harbor.jpg')).toString('base64');
const font = await readFile('art/BarlowCondensed-Bold.ttf');
const poster = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1200" height="630">
  <image width="1200" height="630" xlink:href="data:image/jpeg;base64,${image}"/>
  <path fill="#fff0cb" d="M0 0H615L568 630H0Z"/>
  <path fill="#b03225" d="M48 46H259L254 108H43Z"/>
  <g font-family="Barlow Condensed" font-weight="700">
    <text x="62" y="93" fill="#fff0cb" font-size="48" letter-spacing="1">PISS DEAL</text>
    <g fill="#26221d" font-size="76">
      <text x="44" y="210">Bad Bad Boy</text>
      <text x="44" y="292">needs you.</text>
    </g>
    <path stroke="#b03225" stroke-width="5" d="M48 361H150"/>
    <text x="44" y="454" font-size="58" fill="#26221d">Find all 6</text>
    <text x="44" y="521" font-size="58" fill="#26221d">sleigh parts.</text>
  </g></svg>`;
const renderer = new Resvg(poster, {font:{fontBuffers:[font]}});
await writeFile('public/share-card.png', renderer.render().asPng());
