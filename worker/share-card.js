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
    <image width="1200" height="630" xlink:href="${background}"/>
    <path fill="#26221d" d="M645 0H1200V630H596Z"/>
    <g font-family="Barlow Condensed" font-weight="700">
      <path fill="#b03225" d="M40 36H247L242 96H35Z"/>
      <text x="54" y="82" font-size="46" fill="#fff0cb">PISS DEAL</text>
      <text x="681" y="93" font-size="40" fill="#fff0cb">${name}</text>
      <path d="M681 121H1153" stroke="#ffce75" stroke-width="2"/>
      <text x="675" y="286" font-size="${Math.min(148, Math.floor(880 / points.length))}" fill="#ffce75">${points}</text>
      <text x="682" y="337" font-size="38" letter-spacing="4" fill="#ffce75">POINTS</text>
      <path d="M681 384H1153" stroke="#8f8068" stroke-width="2"/>
      <text x="679" y="456" font-size="51" fill="#fff0cb">Bad Bad Boy needs you.</text>
      <text x="679" y="511" font-size="51" fill="#fff0cb">Find all 6 sleigh parts.</text>
      </g></svg>`;
  const renderer = new Resvg(svg, {font:{fontBuffers:[new Uint8Array(font)]}});
  try {
    const image = renderer.render();
    try { return new Response(image.asPng(), {headers:{'Content-Type':'image/png'}}); }
    finally { image.free(); }
  } finally { renderer.free(); }
}
