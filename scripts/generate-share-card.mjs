import sharp from 'sharp';

const overlay = Buffer.from(`<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
<defs><linearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#101b25" stop-opacity="0"/><stop offset="1" stop-color="#101b25" stop-opacity=".94"/></linearGradient></defs>
<rect y="220" width="1200" height="410" fill="url(#shade)"/>
<g font-family="sans-serif" font-weight="bold">
<text x="56" y="398" fill="#ffcf69" font-size="24" letter-spacing="4">WEST HARBOR  /  HELSINKI</text>
<text x="50" y="514" fill="#fff5de" font-size="118" letter-spacing="-5">PISS DEAL</text>
<text x="56" y="574" fill="white" font-size="34">Find all 6 parts. Rebuild Santa’s sleigh.</text>
</g></svg>`);
await sharp('art/harbor.jpg').extract({left:155,top:64,width:900,height:473}).resize(1200,630).composite([{input:overlay}]).png().toFile('public/share-card.png');
