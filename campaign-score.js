const ARENA_PACE_SECONDS = { harbor: 30, kamppi: 42, 'central-station': 35, 'senate-square': 35 };

export function districtPaceSeconds(district) {
  const run = district.runner;
  return run ? run.length / ((run.startSpeed ?? 9) * 1.2) : (ARENA_PACE_SECONDS[district.id] ?? 35);
}

export function calculateDistrictScore({ paceSeconds, seconds, defeated, healthLost, trafficPassed = 0, progress = 0, completed = false }) {
  const part = completed ? 500 : 0;
  const distance = completed ? 0 : Math.floor(250 * progress);
  // Award time only when a part is secured. The bonus drops as the clear takes longer.
  const speed = completed ? Math.round(720 * paceSeconds / (paceSeconds + seconds)) : 0;
  // A few fights can pay for a detour. Clearing the entire district has diminishing returns.
  const combat = Math.min(600, Math.min(6, defeated) * 70 + Math.max(0, defeated - 6) * 25);
  const dodges = Math.min(100, trafficPassed * 5);
  const damage = healthLost * 105;
  const total = Math.max(0, part + distance + speed + combat + dodges - damage);
  return { part, distance, speed, combat, dodges, damage, total };
}
