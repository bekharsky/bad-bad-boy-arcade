import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateDistrictScore, districtPaceSeconds } from '../campaign-score.js';

const harbor = (seconds, defeated = 0, healthLost = 0) => calculateDistrictScore({
  paceSeconds: districtPaceSeconds({ id: 'harbor' }), seconds, defeated, healthLost, completed: true,
});

test('a skilled fight can beat a fast search, while extra damage can erase its advantage', () => {
  const quick = harbor(12);
  const combat = harbor(40, 5, 1);
  assert.equal(quick.total, 1014);
  assert.equal(combat.total, 1054);
  assert.ok(harbor(40, 5, 2).total < quick.total);
  assert.ok(harbor(30).total < quick.total);
  assert.equal(harbor(20, 7).combat - harbor(20, 6).combat, 25);
  assert.equal(harbor(40, 30).combat, 600);
});

test('an unfinished runner banks no part or speed bonus and losses floor the district at zero', () => {
  const paceSeconds = districtPaceSeconds({ runner: { length: 720, startSpeed: 10 } });
  assert.equal(paceSeconds, 60);
  const state = { paceSeconds, seconds: 60, defeated: 1, trafficPassed: 20, healthLost: 1, progress: 1 };
  assert.deepEqual(calculateDistrictScore(state), {
    part: 0, distance: 250, speed: 0, combat: 70, dodges: 100, damage: 105, total: 315,
  });
  assert.equal(calculateDistrictScore({ ...state, completed: true }).total, 925);
  assert.equal(calculateDistrictScore({ ...state, healthLost: 5 }).total, 0);
});
