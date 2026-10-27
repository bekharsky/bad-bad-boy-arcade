const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const overlaps = (c, x, z, r, y = null) => x + r > c.minX && x - r < c.maxX && z + r > c.minZ && z - r < c.maxZ && (y === null || (y + r > 0 && y - r < c.height));

// Gameplay queries use simple collision data, independently of rendered meshes.
export function createNavigation({ bounds, colliders = [], dynamicColliders = () => [] }) {
  function blocked(x, z, r = .4, y = null) {
    return x - r < bounds.minX || x + r > bounds.maxX || z - r < bounds.minZ || z + r > bounds.maxZ
      || colliders.some(c => overlaps(c, x, z, r, y)) || dynamicColliders().some(c => overlaps(c, x, z, r, y));
  }
  function move(entity, dx, dz, r) {
    const x = clamp(entity.x + dx, bounds.minX + r, bounds.maxX - r);
    if (!blocked(x, entity.z, r)) entity.x = x;
    const z = clamp(entity.z + dz, bounds.minZ + r, bounds.maxZ - r);
    if (!blocked(entity.x, z, r)) entity.z = z;
  }
  function lineClear(x, z, tx, tz, r = .5) {
    const steps = Math.ceil(Math.hypot(tx - x, tz - z) / .25);
    for (let i = 1; i <= steps; i++) if (blocked(x + (tx - x) * i / steps, z + (tz - z) * i / steps, r)) return false;
    return true;
  }
  function lineClear3D(from, to, radius = 0) {
    const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z) / .1));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      if (blocked(from.x + (to.x - from.x) * t, from.z + (to.z - from.z) * t, radius, from.y + (to.y - from.y) * t)) return false;
    }
    return true;
  }

  // One flood field serves all enemies. Rectangular maps need no special cases.
  const originX = Math.floor(bounds.minX), originZ = Math.floor(bounds.minZ);
  const width = Math.ceil(bounds.maxX) - originX, depth = Math.ceil(bounds.maxZ) - originZ;
  const cells = width * depth;
  const distances = new Int32Array(cells), queue = new Uint32Array(cells), open = new Uint8Array(cells);
  const cell = (x, z) => clamp(Math.floor(z - originZ), 0, depth - 1) * width + clamp(Math.floor(x - originX), 0, width - 1);
  const coords = i => ({ x: i % width + originX + .5, z: Math.floor(i / width) + originZ + .5 });
  const neighbours = i => [i % width > 0 ? i - 1 : -1, i % width < width - 1 ? i + 1 : -1, i >= width ? i - width : -1, i < cells - width ? i + width : -1].filter(n => n >= 0);
  let lastCell = -1;
  function refresh() {
    for (let i = 0; i < cells; i++) { const p = coords(i); open[i] = Number(!blocked(p.x, p.z, .56)); }
    lastCell = -1;
    distances.fill(-1);
  }
  function routeTo(x, z) {
    let target = cell(x, z);
    if (!open[target]) {
      let best = Infinity;
      target = -1;
      for (let i = 0; i < cells; i++) if (open[i]) {
        const p = coords(i), d = (p.x - x) ** 2 + (p.z - z) ** 2;
        if (d < best) { best = d; target = i; }
      }
    }
    if (target === lastCell) return;
    lastCell = target;
    distances.fill(-1);
    if (target < 0) return;
    let head = 0, tail = 1;
    queue[0] = target; distances[target] = 0;
    while (head < tail) {
      const i = queue[head++];
      for (const n of neighbours(i)) if (open[n] && distances[n] < 0) { distances[n] = distances[i] + 1; queue[tail++] = n; }
    }
  }
  function chase(x, z, tx, tz) {
    if (lineClear(x, z, tx, tz, .54)) return { x: tx - x, z: tz - z };
    const here = cell(x, z);
    let next = -1, best = Infinity;
    for (const i of [here, ...neighbours(here)]) if (open[i] && distances[i] >= 0) {
      const p = coords(i);
      const value = distances[i] + Math.hypot(p.x - x, p.z - z) * .2;
      if (value < best && lineClear(x, z, p.x, p.z, .5)) { best = value; next = i; }
    }
    const p = next < 0 ? { x, z } : coords(next);
    return { x: p.x - x, z: p.z - z };
  }
  function spawnPoint(player, index, count) {
    for (let tries = 0; tries < 100; tries++) {
      const angle = index / count * Math.PI * 2 + tries * .41;
      const distance = 7 + Math.random() * 4;
      const x = player.x + Math.cos(angle) * distance, z = player.z + Math.sin(angle) * distance;
      if (!blocked(x, z, .75) && distances[cell(x, z)] >= 0) return { x, z };
    }
    // A small map may not fit the usual spawn ring. Never fall back to a
    // coordinate from a different map, or to a disconnected courtyard.
    let fallback = null, best = -1;
    for (let i = 0; i < cells; i++) if (distances[i] >= 0) {
      const p = coords(i);
      if (blocked(p.x, p.z, .75)) continue;
      if (distances[i] >= 5 && distances[i] <= 12) return p;
      const distance = Math.hypot(p.x - player.x, p.z - player.z);
      if (distance > best) { best = distance; fallback = p; }
    }
    return fallback;
  }
  function pickupPoint({ x, z, jitter = 0 }, radius) {
    for (let attempt = 0; attempt < (jitter ? 12 : 0); attempt++) {
      const px = x + (Math.random() - .5) * jitter, pz = z + (Math.random() - .5) * jitter;
      if (!blocked(px, pz, radius) && distances[cell(px, pz)] >= 0) return { x: px, z: pz };
    }
    return !blocked(x, z, radius) && distances[cell(x, z)] >= 0 ? { x, z } : null;
  }
  refresh();
  return { move, lineClear, lineClear3D, routeTo, chase, spawnPoint, pickupPoint, refresh, canStandAt: (x, z, radius) => !blocked(x, z, radius) };
}
