// Encounter choices are made by the simulation, never by the render loop.
// A seeded RNG therefore reproduces the same run and pause consumes no rolls.
export function createEncounters({ random, variety, tramChance, roadworks }) {
  const roll = (a, b) => a + Math.max(0, Math.min(1, random())) * (b - a);
  const pick = values => values[Math.min(values.length - 1, Math.floor(roll(0, values.length)))];
  let pattern = 'flow', until = 45, pack = 0;
  return {
    reset() { pattern = 'flow'; until = 45; pack = 0; },
    update(distance) {
      if (!variety || distance < until) return;
      const choices = ['flow', 'rush', 'slalom', ...(roadworks ? ['worksite'] : []), ...(tramChance ? ['trams'] : [])];
      pattern = pick(choices.filter(value => value !== pattern)); until = distance + roll(65, 105); pack = 0;
    },
    row() {
      if (!variety) return { pattern: 'flow', lead: 3.2, riderSpeed: 5.2, roadworkChance: .25, tramChance };
      const rush = pattern === 'rush';
      return {
        pattern,
        lead: rush ? roll(2.2, 2.7) : roll(2.45, 3.6),
        riderSpeed: rush ? roll(8.2, 10.5) : roll(4.3, 7.6),
        roadworkChance: pattern === 'worksite' ? .65 : rush ? 0 : .22,
        tramChance: pattern === 'trams' ? Math.max(.7, tramChance) : rush ? tramChance * .5 : tramChance,
      };
    },
    delay(distance) {
      if (!variety) return Math.max(.85, 1.05 - distance / 6000);
      if (pattern === 'rush') {
        pack++;
        if (pack >= 3) { pack = 0; return roll(1.5, 2); }
        return roll(.6, .82);
      }
      return roll(.72, 1.25);
    },
    crossing(progress, side, lanes) {
      const near = side < 0 ? 0 : lanes.length - 1, far = side < 0 ? lanes.length - 1 : 0;
      const reverse = variety && random() < .5;
      return [0, 1].map(index => {
        const targetLane = (index === 0) !== reverse ? near : far;
        return {
          progress: progress + (index === 0 ? variety ? roll(-6.5, -5.5) : -6 : variety ? roll(7, 8.5) : 7),
          speed: variety ? roll(17, 22) : index === 0 ? 18 : 20,
          targetLane, bias: targetLane === near ? .8 : -.8, launchAt: Infinity,
        };
      });
    },
    side(index, previous) {
      if (!variety) return index % 2 ? 1 : -1;
      if (previous.length >= 2 && previous.at(-1) === previous.at(-2)) return -previous.at(-1);
      return random() < .5 ? -1 : 1;
    },
  };
}
