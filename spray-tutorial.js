const MIN_VISIBLE_TIME = 3;
const HINTS = {
  ground: {
    mouse: 'Move the mouse to aim. Left-click or press Space to spray. Hold for more range.',
    desktop: 'Press Space to spray forward. Hold for more range.',
    touch: 'Tap the spray button. Hold for more range.',
  },
  gull: {
    desktop: 'Hold E + fire',
    touch: 'Drag spray up',
  },
};

export function createSprayTutorial(ground, gull) {
  let stage = null, elapsed = 0, used = false;

  function show(message) {
    const groundMessage = stage === 'ground' ? message : '';
    const gullMessage = stage === 'gull' ? message : '';
    if (ground.textContent !== groundMessage) ground.textContent = groundMessage;
    if (gull.textContent !== gullMessage) gull.textContent = gullMessage;
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
