import assert from 'node:assert/strict';
import test from 'node:test';
import { createCampaign, createWaveDirector, enemyHealth } from '../waves.js';

test('campaign rotates completed maps in three-wave blocks while difficulty keeps increasing', () => {
  const campaign = createCampaign(['harbor', 'senate-square', 'kamppi']);
  for (const [wave, mapId, count, slug, snail] of [
    [1, 'harbor', 8, 1, 2], [2, 'harbor', 11, 1, 2], [3, 'harbor', 14, 1, 2],
    [4, 'senate-square', 17, 2, 3], [5, 'senate-square', 20, 2, 3], [6, 'senate-square', 23, 2, 3],
    [7, 'kamppi', 26, 3, 4], [8, 'kamppi', 29, 3, 4], [9, 'kamppi', 30, 3, 4], [10, 'harbor', 30, 4, 5],
  ]) {
    const plan = campaign.plan(wave);
    assert.equal(plan.mapId, mapId);
    assert.equal(plan.enemyCount, count);
    assert.equal(enemyHealth('slug', wave), slug);
    assert.equal(enemyHealth('snail', wave), snail);
  }
  assert.equal(createCampaign(['harbor', 'kamppi'], { wavesPerMap: 5 }).plan(6).mapId, 'kamppi');
  assert.equal(createCampaign(['harbor']).plan(100).mapId, 'harbor');
  assert.equal(createCampaign(['harbor', 'kamppi'], { wavesPerMap: 1 }).plan(2).mapId, 'kamppi');
});

test('invalid campaign configuration and wave numbers fail before gameplay', () => {
  assert.throws(() => createCampaign([]));
  assert.throws(() => createCampaign(['']));
  assert.throws(() => createCampaign(['harbor'], { wavesPerMap: 0 }));
  for (const number of [0, -1, 1.5, NaN, Infinity]) assert.throws(() => createCampaign(['harbor']).plan(number));
});

test('choosing a starting district begins at wave one and preserves campaign rotation', () => {
  const campaign = createCampaign(['harbor', 'senate-square', 'kamppi']);
  campaign.setStartingMap('senate-square');
  assert.deepEqual(campaign.plan(1), { number: 1, enemyCount: 8, healthBonus: 0, mapId: 'senate-square' });
  assert.equal(campaign.plan(4).mapId, 'kamppi');
  assert.equal(campaign.plan(7).mapId, 'harbor');
  assert.throws(() => campaign.setStartingMap('missing'), /Unknown map/);
  assert.equal(campaign.plan(1).mapId, 'senate-square');
  campaign.setStartingMap('harbor');
  assert.equal(campaign.plan(1).mapId, 'harbor');
});

test('finishing a runner district advances once to the next map and resets reinforcement pressure', () => {
  const campaign = createCampaign(['baana', 'harbor', 'senate-square']);
  const plans = [], reinforcements = [];
  const director = createWaveDirector({ campaign, onWave: plan => plans.push(plan), onReinforcements: count => reinforcements.push(count) });
  director.start(); director.completeMap();
  assert.deepEqual(plans.map(plan => [plan.number, plan.mapId]), [[1, 'baana'], [4, 'harbor']]);
  director.update(17, 5); assert.equal(reinforcements.length, 0);
  assert.equal(campaign.nextMapWave(3), 4);
  assert.equal(campaign.nextMapWave(4), 7);
  assert.equal(campaign.nextMapWave(6), 7);
  assert.equal(campaign.nextMapWave(7), 10);
  assert.throws(() => campaign.nextMapWave(0));
});

function setup() {
  const started = [], reinforcements = [];
  const director = createWaveDirector({
    campaign: createCampaign(['harbor', 'kamppi'], { wavesPerMap: 1 }),
    onWave: plan => started.push(plan),
    onReinforcements: (count, plan) => reinforcements.push({ count, wave: plan.number }),
  });
  return { director, started, reinforcements };
}

test('wave transitions run once after the clear delay, without wall-clock timers', () => {
  for (const fps of [30, 60, 120]) {
    const { director, started } = setup();
    director.update(10, 0);
    assert.equal(started.length, 0, 'A run must be started explicitly');
    director.start();
    for (let i = 0; i < fps; i++) director.update(1 / fps, 0);
    assert.equal(started.length, 1);
    // A returning enemy cancels the pending transition.
    director.update(1 / fps, 1);
    for (let i = 0; i < fps; i++) director.update(1 / fps, 0);
    assert.equal(started.length, 1);
    for (let i = 0; i < Math.round(fps * .4); i++) director.update(1 / fps, 0);
    assert.equal(started.length, 2);
    assert.equal(director.current.mapId, 'kamppi');
    director.update(1 / fps, 8);
    assert.equal(started.length, 2);
  }
});

test('restart clears pending transitions and reinforcement pressure, and kills grant relief', () => {
  const { director, started, reinforcements } = setup();
  director.start();
  director.update(18, 5);
  assert.deepEqual(reinforcements, [{ count: 2, wave: 1 }]);
  director.onKill();
  director.update(17, 5);
  assert.equal(reinforcements.length, 1);
  director.update(1, 5);
  assert.equal(reinforcements.length, 2);
  director.update(1, 0);
  director.start();
  director.update(.4, 0);
  assert.equal(started.length, 2, 'The previous run cannot advance the new run');
  assert.equal(director.current.number, 1);
  director.update(17, 5);
  assert.equal(reinforcements.length, 2);
  director.update(1, 5);
  assert.deepEqual(reinforcements.at(-1), { count: 2, wave: 1 });
});
