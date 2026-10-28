// Simulation-time transitions: swap only under full cover and never advance
// while the game is paused. No delayed callbacks can outlive a restarted run.
export function createMapTransition({ onSwap, onFinish = () => {} }) {
  let pending = null, elapsed = 0, duration = 1.2, swapped = false;
  return {
    get active() { return pending !== null; },
    get progress() { return pending === null ? 0 : elapsed / duration; },
    start(plan, seconds = 1.2) {
      if (pending !== null) return false;
      if (!plan || !Number.isFinite(seconds) || seconds <= 0) throw new Error('Invalid map transition');
      pending = plan; elapsed = 0; duration = seconds; swapped = false;
      return true;
    },
    update(dt) {
      if (!Number.isFinite(dt) || dt < 0) throw new Error('Transition dt must be non-negative');
      if (pending === null) return;
      elapsed = Math.min(duration, elapsed + dt);
      if (!swapped && elapsed >= duration / 2) { swapped = true; onSwap(pending); }
      if (elapsed >= duration) { pending = null; elapsed = 0; onFinish(); }
    },
    cancel() { pending = null; elapsed = 0; swapped = false; },
  };
}
