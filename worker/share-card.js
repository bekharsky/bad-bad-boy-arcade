import { ImageResponse } from 'cf-workers-og/workerd/html';
import scene from '../art/senate-square.jpg';

const background = 'data:image/jpeg;base64,' + btoa(Array.from(new Uint8Array(scene), byte => String.fromCharCode(byte)).join(''));

export function renderScoreCard({ nickname, score, wave }) {
  const name = nickname.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const points = Number(score).toLocaleString('en');
  return ImageResponse.create(`<div style="display:flex;position:relative;width:1200px;height:630px;background:#172437;color:white">
    <img src="${background}" width="1540" height="810" style="position:absolute;top:-64px;left:-170px"/>
    <div style="display:flex;position:absolute;left:0;bottom:0;width:1200px;height:390px;background:linear-gradient(0deg,#101b25 0%,rgba(16,27,37,0.92) 46%,rgba(16,27,37,0) 100%)"></div>
    <div style="display:flex;position:absolute;bottom:48px;left:56px;flex-direction:column">
      <div style="display:flex;font-size:26px;color:#ffcf69;letter-spacing:2px">PISS DEAL · ${name} · DISTRICT ${wave}</div>
      <div style="display:flex;font-size:${points.length > 9 ? 88 : 108}px;color:#fff5de">${points} points</div>
      <div style="display:flex;font-size:36px">Your turn, Helsinki. Beat that run.</div>
    </div></div>`, {width:1200,height:630});
}
