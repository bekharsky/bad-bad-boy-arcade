// Fixed simulation steps keep movement and wave time consistent across displays.
// Drop excess debt after a stall; a resumed tab must never replay its absence.
export function createFrameClock({ step = 1 / 60, maxSteps = 12 } = {}) {
  if (!(step > 0) || !Number.isFinite(step) || !Number.isInteger(maxSteps) || maxSteps < 1) throw new Error('Invalid frame clock limits');
  let previous = null, accumulator = 0;
  return {
    reset() { previous = null; accumulator = 0; },
    advance(now, update) {
      if (previous === null) { previous = now; return 0; }
      const elapsed = Math.max(0, (now - previous) / 1000);
      previous = now;
      accumulator = Math.min(accumulator + elapsed, step * maxSteps);
      let steps = 0;
      while (accumulator + 1e-10 >= step && steps < maxSteps) {
        accumulator = Math.max(0, accumulator - step);
        steps++;
        // A mode switch or pause can stop the remaining steps in this frame.
        if (update(step) === false) { accumulator = 0; break; }
      }
      return steps * step;
    },
  };
}
