import { initWasm, Resvg } from '@resvg/resvg-wasm';
import wasm from '@resvg/resvg-wasm/index_bg.wasm';
import scene from '../art/senate-square.png';
import font from '../art/BarlowCondensed-Bold.ttf';

const background = 'data:image/png;base64,' + btoa(Array.from(new Uint8Array(scene), byte => String.fromCharCode(byte)).join(''));
let ready;
export async function renderScoreCard({ nickname, score }) {
  await (ready ??= initWasm(wasm));
  const name = nickname.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  const points = Number(score).toLocaleString('en');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1200" height="630">
    <image y="-54" width="1200" height="630" xlink:href="${background}"/>
    <path fill="#26221d" d="M0 448L1200 463V630H0Z"/>
    <path fill="#b03225" d="M40 32H247L242 94H35Z"/>
    <g font-family="Barlow Condensed" font-weight="700">
      <text x="55" y="80" fill="#fff0cb" font-size="48">PISS DEAL</text>
      <text x="43" y="528" fill="#fff0cb" font-size="54">Bad Bad Boy needs you.</text>
      <text x="44" y="584" fill="#ffce75" font-size="38">Find Joulupukki’s 6 sleigh parts.</text>
      <text x="1156" y="511" text-anchor="end" fill="#fff0cb" font-size="36">${name}</text>
      <text x="1156" y="592" text-anchor="end" fill="#ffce75" font-size="${points.length > 9 ? 55 : 78}">${points} POINTS</text>
    </g></svg>`;
  const renderer = new Resvg(svg, {font:{fontBuffers:[new Uint8Array(font)]}});
  try {
    const image = renderer.render();
    try { return new Response(image.asPng(), {headers:{'Content-Type':'image/png'}}); }
    finally { image.free(); }
  } finally { renderer.free(); }
}
