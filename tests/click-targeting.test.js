import assert from 'node:assert/strict';
import test from 'node:test';
import { pickClickTarget } from '../click-targeting.js';

const candidate = (target, x, y, radius = 44, depth = 10) => ({ target, x, y, radius, depth });

test('click selection uses a forgiving screen-space radius for small targets', () => {
  const goose = { alive: true };
  assert.equal(pickClickTarget([candidate(goose, 100, 100, 44)], 138, 100), goose);
  assert.equal(pickClickTarget([candidate(goose, 100, 100, 44)], 146, 100), null);
});

test('when selection areas overlap, the click nearest a target center wins', () => {
  const goose = { alive: true }, gull = { alive: true };
  assert.equal(pickClickTarget([
    candidate(goose, 100, 100, 44, 12),
    candidate(gull, 145, 100, 54, 8),
  ], 140, 100), gull);
  assert.equal(pickClickTarget([
    candidate(goose, 100, 100, 44, 12),
    candidate(gull, 145, 100, 54, 8),
  ], 102, 100), goose);
});

test('repeated clicks cycle through overlapping targets without cycling duplicate body samples', () => {
  const goose = { alive: true }, gull = { alive: true };
  const candidates = [
    candidate(goose, 100, 100, 44, 12),
    candidate(goose, 108, 100, 44, 11),
    candidate(gull, 104, 100, 54, 8),
  ];
  assert.equal(pickClickTarget(candidates, 100, 100), goose);
  assert.equal(pickClickTarget(candidates, 100, 100, goose), gull);
  assert.equal(pickClickTarget(candidates, 100, 100, gull), goose);
});

test('screen target selection ignores dead or invalid candidates', () => {
  const dead = { alive: false }, live = { alive: true };
  assert.equal(pickClickTarget([
    candidate(dead, 100, 100),
    candidate(live, Infinity, 100),
    candidate(live, 100, 100, 0),
  ], 100, 100), null);
});
