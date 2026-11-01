// Route progress continues along the tram line after the runner's street ends.
// A decreasing progress value brings an oncoming tram from the side street.
export function createTramTurn({ start, radius }) {
  if (!Number.isFinite(start) || !Number.isFinite(radius) || radius <= 3) throw new Error('Invalid tram turn');
  return function sample(progress, lane, out = {}) {
    const r = radius + lane;
    if (r <= 0) throw new Error('Tram lane is outside the turn');
    const distance = Math.max(0, progress - start), arc = r * Math.PI / 2;
    const angle = Math.min(distance / r, Math.PI / 2);
    out.x = progress <= start ? lane : -radius + r * Math.cos(angle) - Math.max(0, distance - arc);
    out.z = progress <= start ? -progress : -start - r * Math.sin(angle);
    out.heading = angle;
    return out;
  };
}

export const TRAM_CAR_OFFSET = 3.85;
export const TRAM_CAR_HALF_LENGTH = 3.75;
export const TRAM_CAR_HALF_WIDTH = 1.34;
