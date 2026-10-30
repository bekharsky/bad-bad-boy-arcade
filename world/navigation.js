const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const overlaps = (c, x, z, r, y = null) => x + r > c.minX && x - r < c.maxX && z + r > c.minZ && z - r < c.maxZ && (y === null || (y + r > 0 && y - r < c.height));

// Intersect the whole segment with the expanded collider, rather than sampling
// points along it. Open slabs preserve overlaps(): touching a face is allowed.
function crosses(c, x, y, z, tx, ty, tz, r) {
  let enter = 0, leave = 1;
  for (let axis = 0; axis < (y === null ? 2 : 3); axis++) {
    const from = axis === 0 ? x : axis === 1 ? z : y;
    const to = axis === 0 ? tx : axis === 1 ? tz : ty;
    const min = (axis === 0 ? c.minX : axis === 1 ? c.minZ : 0) - r;
    const max = (axis === 0 ? c.maxX : axis === 1 ? c.maxZ : c.height) + r;
    const change = to - from;
    if (change === 0) {
      if (from <= min || from >= max) return false;
    } else {
      const a = (min - from) / change, b = (max - from) / change;
      enter = Math.max(enter, Math.min(a, b));
      leave = Math.min(leave, Math.max(a, b));
      if (enter >= leave) return false;
    }
  }
  return true;
}

// Gameplay queries use simple collision data, independently of rendered meshes.
export function createNavigation({ bounds, colliders = [], dynamicColliders = () => [] }) {
  function outside(x, z, r) {
    return x - r < bounds.minX || x + r > bounds.maxX || z - r < bounds.minZ || z + r > bounds.maxZ;
  }
  function blocked(x, z, r = .4, y = null) {
    return outside(x, z, r)
      || colliders.some(c => overlaps(c, x, z, r, y)) || dynamicColliders().some(c => overlaps(c, x, z, r, y));
  }
  function move(entity, dx, dz, r) {
    const x = clamp(entity.x + dx, bounds.minX + r, bounds.maxX - r);
    // Permit escape if moving scenery has already overlapped an actor.
    const embedded = blocked(entity.x, entity.z, r);
    if (dx && (embedded ? !blocked(x, entity.z, r) : lineClear(entity.x, entity.z, x, entity.z, r))) entity.x = x;
    const z = clamp(entity.z + dz, bounds.minZ + r, bounds.maxZ - r);
    if (dz && (embedded ? !blocked(entity.x, z, r) : lineClear(entity.x, entity.z, entity.x, z, r))) entity.z = z;
  }
  function lineClear(x, z, tx, tz, r = .5) {
    return segmentClear(x, null, z, tx, null, tz, r);
  }
  function lineClear3D(from, to, radius = 0) {
    return segmentClear(from.x, from.y, from.z, to.x, to.y, to.z, radius);
  }
  function segmentClear(x, y, z, tx, ty, tz, r) {
    // The bounds are convex, so checking both ends covers the whole segment.
    if (outside(x, z, r) || outside(tx, tz, r)) return false;
    for (const c of colliders) if (crosses(c, x, y, z, tx, ty, tz, r)) return false;
    for (const c of dynamicColliders()) if (crosses(c, x, y, z, tx, ty, tz, r)) return false;
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
      // No temporary neighbour arrays per visited cell in the flood field.
      for (let side = 0; side < 4; side++) {
        const n = side === 0 ? (i % width > 0 ? i - 1 : -1)
          : side === 1 ? (i % width < width - 1 ? i + 1 : -1)
          : side === 2 ? (i >= width ? i - width : -1)
          : (i < cells - width ? i + width : -1);
        if (n >= 0 && open[n] && distances[n] < 0) { distances[n] = distances[i] + 1; queue[tail++] = n; }
      }
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
