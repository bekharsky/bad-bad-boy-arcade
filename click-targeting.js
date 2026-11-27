export function pickClickTarget(candidates, pointerX, pointerY, cycleAfter = null) {
  const byTarget = new Map();
  for (const candidate of candidates) {
    const { target, x, y, radius, depth = Infinity } = candidate;
    if (!target?.alive || !Number.isFinite(x) || !Number.isFinite(y) || !(radius > 0)) continue;
    const dx = x - pointerX, dy = y - pointerY;
    const score = (dx * dx + dy * dy) / (radius * radius);
    if (score > 1) continue;
    const previous = byTarget.get(target);
    if (!previous || score < previous.score || (score === previous.score && depth < previous.depth)) {
      byTarget.set(target, { target, score, depth });
    }
  }
  const eligible = [...byTarget.values()].sort((a, b) => a.score - b.score || a.depth - b.depth);
  if (!eligible.length) return null;
  const previousIndex = eligible.findIndex(candidate => candidate.target === cycleAfter);
  if (previousIndex >= 0) return eligible[(previousIndex + 1) % eligible.length].target;
  return eligible[0].target;
}
