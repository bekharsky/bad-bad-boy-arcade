import assert from 'node:assert/strict';
import test from 'node:test';
import { createSprayTutorial } from '../spray-tutorial.js';

function setup() {
  const label = { textContent: '' };
  const encounter = { hidden: true, dataset: {}, querySelector: () => label };
  return { encounter, label, tutorial: createSprayTutorial(encounter) };
}

test('click controls show target instructions instead of keyboard spray hints', () => {
  const { encounter, label, tutorial } = setup();
  tutorial.reset(true);
  tutorial.update(0.1, {
    touch: false, mouse: true, click: true, firing: false, airborne: false,
    gooseVisible: () => true, gullVisible: () => false,
  });
  assert.match(label.textContent, /Click a goose/);
  assert.equal(encounter.dataset.button, 'left');

  tutorial.reset(true);
  tutorial.update(0.1, {
    touch: false, mouse: true, click: true, firing: false, airborne: false,
    gooseVisible: () => false, gullVisible: () => true,
  });
  assert.match(label.textContent, /Click a gull/);
  assert.doesNotMatch(label.textContent, /E \+ Fire/);
});
