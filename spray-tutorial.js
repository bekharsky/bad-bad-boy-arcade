const GROUND_HINT_MIN_TIME = 3;
const ENCOUNTER_HINT_TIME = 4;
const GROUND_HINTS = {
  mouse: 'Hold fire for more range.',
  desktop: 'Press Space to spray forward. Hold for more range.',
  touch: 'Drag the right stick to aim and spray.',
};

export function createSprayTutorial(ground, encounter) {
  const label = encounter.querySelector('.encounter-hint-label');
  let stage = null, elapsed = 0;
  let groundElapsed = 0, groundUsed = false;

  function show(message = '', button) {
    encounter.hidden = !message;
    if (button) encounter.dataset.button = button;
    else delete encounter.dataset.button;
    if (label.textContent !== message) label.textContent = message;
  }

  return {
    reset(active = false) {
      stage = active ? 'waiting' : null;
      elapsed = groundElapsed = 0;
      groundUsed = false;
      ground.textContent = '';
      show();
    },
    update(dt, { touch, mouse, firing, airborne, gooseVisible, gullVisible }) {
      if (!stage) return;
      const mouseControls = mouse && !touch;
      groundElapsed += dt;
      groundUsed ||= firing;
      elapsed += dt;
      if (stage === 'waiting' && mouseControls && gooseVisible()) {
        stage = 'goose';
        elapsed = 0;
      }
      if (stage === 'goose' && (!mouseControls || elapsed >= ENCOUNTER_HINT_TIME || (firing && !airborne))) {
        stage = 'waiting-for-gull';
      }
      if (stage !== 'goose' && stage !== 'gull' && groundElapsed >= GROUND_HINT_MIN_TIME && gullVisible()) {
        stage = 'gull';
        elapsed = 0;
      }

      const groundVisible = stage !== 'gull' && groundElapsed < 9 && (!groundUsed || groundElapsed < GROUND_HINT_MIN_TIME);
      const groundMessage = groundVisible ? GROUND_HINTS[touch ? 'touch' : mouseControls ? 'mouse' : 'desktop'] : '';
      if (ground.textContent !== groundMessage) ground.textContent = groundMessage;
      if (stage === 'gull') {
        if (elapsed >= ENCOUNTER_HINT_TIME || (firing && airborne)) {
          stage = null;
          show();
        } else if (mouseControls) show('Right click to spray up', 'right');
        else show(touch ? 'Flick the right stick up' : 'E + Fire');
      } else if (stage === 'goose') {
        show('Left click to spray', 'left');
      } else show();
    },
  };
}
