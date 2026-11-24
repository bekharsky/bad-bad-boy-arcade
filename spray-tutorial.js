const MIN_VISIBLE_TIME = 3;
const HINTS = {
  ground: {
    mouse: 'Left-click to spray at the crosshair. Space sprays forward. Hold for more range.',
    desktop: 'Press Space to spray forward. Hold for more range.',
    touch: 'Tap the spray button. Hold for more range.',
  },
  gull: {
    desktop: 'Seagull! Hold E while spraying to aim up.',
    touch: 'Seagull! Hold the spray button and drag up.',
  },
};

export function createSprayTutorial(element) {
  let stage = null, elapsed = 0, used = false;

  function show(message) {
    if (element.textContent !== message) element.textContent = message;
  }

  return {
    reset(active = false) {
      stage = active ? 'ground' : null;
      elapsed = 0;
      used = false;
      show('');
    },
    update(dt, { touch, mouse, firing, airborne, gullVisible }) {
      if (!stage) return;
      elapsed += dt;
      // A gull can replace the ground hint even if the player hasn't sprayed yet.
      if (stage === 'ground' && elapsed >= MIN_VISIBLE_TIME && gullVisible()) {
        stage = 'gull';
        elapsed = 0;
        used = false;
      }
      used ||= firing && (stage === 'ground' || airborne);
      const visible = elapsed < (stage === 'ground' ? 9 : 7) && (!used || elapsed < MIN_VISIBLE_TIME);
      const hints = HINTS[stage];
      const desktopHint = mouse ? hints.mouse ?? hints.desktop : hints.desktop;
      show(visible ? (touch ? hints.touch : desktopHint) : '');
      if (!visible && stage === 'gull') stage = null;
    },
  };
}
