const COLORS = ['#ffd34e', '#f06959', '#64c79d', '#f8e9c8', '#85a9ed'];

export function createVictoryConfetti(canvas) {
  const context = canvas.getContext('2d');
  let pieces = [];
  let frame = 0;
  let lastFrame = 0;
  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  let active = false;

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  }

  function draw(timestamp) {
    if (!active) return;
    const dt = Math.min(.04, Math.max(0, (timestamp - lastFrame) / 1000));
    lastFrame = timestamp;
    context.clearRect(0, 0, width, height);
    const survivors = [];
    for (const piece of pieces) {
      piece.age += dt;
      piece.x += (piece.vx + Math.sin(piece.age * piece.sway) * 28) * dt;
      piece.y += piece.vy * dt;
      piece.vy += 285 * dt;
      piece.rotation += piece.spin * dt;
      if (piece.y > height + 24 || piece.age > 6) continue;
      context.save();
      context.translate(piece.x, piece.y);
      context.rotate(piece.rotation);
      context.globalAlpha = Math.min(1, Math.max(0, (height + 24 - piece.y) / 90));
      context.fillStyle = piece.color;
      context.fillRect(-piece.w / 2, -piece.h / 2, piece.w, piece.h);
      context.restore();
      survivors.push(piece);
    }
    pieces = survivors;
    if (pieces.length) frame = requestAnimationFrame(draw);
    else clear();
  }

  function start(reducedMotion = false) {
    clear();
    resize();
    const amount = reducedMotion ? 36 : 116;
    pieces = Array.from({ length: amount }, () => ({
      x: Math.random() * width,
      y: reducedMotion ? 20 + Math.random() * height * .8 : -Math.random() * height * .55,
      vx: reducedMotion ? 0 : (Math.random() - .5) * 160,
      vy: reducedMotion ? 0 : 105 + Math.random() * 210,
      rotation: Math.random() * Math.PI * 2,
      spin: reducedMotion ? 0 : (Math.random() - .5) * 8,
      sway: 1.5 + Math.random() * 4,
      w: 4 + Math.random() * 6,
      h: 7 + Math.random() * 8,
      age: 0,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }));
    active = !reducedMotion;
    if (reducedMotion) drawPieceStill();
    else {
      lastFrame = performance.now();
      frame = requestAnimationFrame(draw);
    }
  }

  function drawPieceStill() {
    context.clearRect(0, 0, width, height);
    for (const piece of pieces) {
      context.save();
      context.translate(piece.x, piece.y);
      context.rotate(piece.rotation);
      context.fillStyle = piece.color;
      context.fillRect(-piece.w / 2, -piece.h / 2, piece.w, piece.h);
      context.restore();
    }
  }

  function clear() {
    active = false;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    pieces = [];
    if (context) context.clearRect(0, 0, width, height);
  }

  window.addEventListener('resize', () => { if (active) resize(); });
  return { start, clear };
}
