const ENCOUNTER_HINT_TIME = 4;

export function createSprayTutorial(encounter) {
  const label = encounter.querySelector('.encounter-hint-label');
  let stage = null, elapsed = 0;

  function show(message = '', button, touchAction) {
    encounter.hidden = !(message || button || touchAction);
    if (button) encounter.dataset.button = button;
    else delete encounter.dataset.button;
    if (touchAction) encounter.dataset.touchAction = touchAction;
    else delete encounter.dataset.touchAction;
    if (label.textContent !== message) label.textContent = message;
  }

  return {
    reset(active = false) {
      stage = active ? 'waiting' : null;
      elapsed = 0;
      show();
    },
    update(dt, { touch, mouse, firing, airborne, gooseVisible, gullVisible }) {
      if (!stage) return;
      const mouseControls = mouse && !touch;
      const hintControls = mouseControls || touch;
      elapsed += dt;
      if (stage === 'waiting' && hintControls && gooseVisible()) {
        stage = 'goose';
        elapsed = 0;
      }
      if (stage === 'goose' && (!hintControls || elapsed >= ENCOUNTER_HINT_TIME || (firing && !airborne))) {
        stage = 'waiting-for-gull';
      }
      if (stage !== 'goose' && stage !== 'gull' && gullVisible()) {
        stage = 'gull';
        elapsed = 0;
      }

      if (stage === 'gull') {
        if (elapsed >= ENCOUNTER_HINT_TIME || (firing && airborne)) {
          stage = null;
          show();
        } else if (mouseControls) show('Right click to spray up', 'right');
        else if (touch) show('Swipe up to spray at birds', undefined, 'swipe');
        else show('E + Fire');
      } else if (stage === 'goose') {
        if (touch) show('Tap to spray', undefined, 'tap');
        else show('Left click to spray', 'left');
      } else show();
    },
  };
}
