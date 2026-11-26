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
    <g fill="#26221d" font-size="88">
      <text x="44" y="251">Help Joulupukki</text>
      <text x="44" y="338">fix his sleigh!</text>
    </g>
    <path stroke="#26221d" stroke-width="2" d="M48 414H523"/>
    <text x="40" y="580" font-size="174" fill="#b03225">6</text>
    <text x="148" y="488" font-size="30" fill="#714735">MISSING PARTS</text>
    <text x="145" y="548" font-size="51" fill="#26221d">Find them all.</text>
    <path fill="#26221d" d="M723 542H1160L1155 605H718Z"/>
    <text x="740" y="582" fill="#ffce75" font-size="26">PLAY AS</text>
    <text x="838" y="589" fill="#fff0cb" font-size="46">BAD BAD BOY</text>
  </g></svg>`;
const renderer = new Resvg(poster, {font:{fontBuffers:[font]}});
await writeFile('public/share-card.png', renderer.render().asPng());
