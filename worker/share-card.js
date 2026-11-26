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
    <defs><linearGradient id="shade" x2="0" y2="1"><stop stop-color="#101b25" stop-opacity="0"/><stop offset="1" stop-color="#101b25"/></linearGradient></defs>
    <image x="-170" y="-64" width="1540" height="810" xlink:href="${background}"/>
    <rect y="180" width="1200" height="450" fill="url(#shade)"/>
    <g font-family="Barlow Condensed" font-weight="700">
    <text x="56" y="388" font-size="24" fill="#ffcf69">PISS DEAL<tspan dx="22" font-size="36" fill="white">${name}</tspan></text>
    <text x="52" y="477" font-size="98" fill="#fff5de">${points} POINTS</text>
    <text x="56" y="548" font-size="52" fill="white">Help Joulupukki fix his sleigh!</text>
    <text x="56" y="598" font-size="38" fill="white">Find all 6 missing parts.</text></g></svg>`;
  const renderer = new Resvg(svg, {font:{fontBuffers:[new Uint8Array(font)]}});
  try {
    const image = renderer.render();
    try { return new Response(image.asPng(), {headers:{'Content-Type':'image/png'}}); }
    finally { image.free(); }
  } finally { renderer.free(); }
}
