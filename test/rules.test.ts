import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarizeActivity } from '../src/application/activity.js';
import { equipTitle, evaluateAchievements } from '../src/application/achievements.js';
import { awakenClass } from '../src/application/classes.js';
import { buildStat, levelFor, overallRank } from '../src/application/ranks.js';
import { resolveConfig } from '../src/config/config.js';
import { calendar, rawProfile } from './fixture.js';

test('stat ranks follow the thresholds, including the edges', () => {
  assert.equal(buildStat('STR', 0).rank, 'E');
  assert.equal(buildStat('STR', 49).rank, 'E');
  assert.equal(buildStat('STR', 50).rank, 'D');
  assert.equal(buildStat('STR', 1169).rank, 'A');
  assert.deepEqual(buildStat('STR', 1169).next, { rank: 'S', at: 2500 });
  assert.equal(buildStat('STR', 25000).rank, 'EX');
  assert.equal(buildStat('STR', 25000).next, null);
  assert.ok(Math.abs(buildStat('STR', 1750).progress - 0.5) < 1e-9);
});

test('overall rank is the weighted mean of the six tiers, rounded down', () => {
  const stats = (['STR', 'AGI', 'INT', 'VIT', 'LUK', 'CHA'] as const).map((code) => buildStat(code, 0));
  assert.equal(overallRank(stats), 'E');
  const mixed = [buildStat('STR', 1169), buildStat('AGI', 15), buildStat('INT', 1), buildStat('VIT', 41), buildStat('LUK', 93), buildStat('CHA', 16)];
  assert.equal(overallRank(mixed), 'C');
});

test('levels follow the square-root curve', () => {
  assert.deepEqual(levelFor(0), { level: 1, exp: 0, nextExp: 100 });
  assert.deepEqual(levelFor(100), { level: 2, exp: 0, nextExp: 300 });
});

test('classes match whole language names, so CSS is no longer a Necromancer', () => {
  assert.equal(awakenClass('CSS').name, 'Illusionist');
  assert.equal(awakenClass('SCSS').name, 'Illusionist');
  assert.equal(awakenClass('C').name, 'Necromancer');
  assert.equal(awakenClass('C#').name, 'Holy Knight');
  assert.equal(awakenClass('Kotlin').name, 'Holy Knight');
  assert.equal(awakenClass('ShaderLab').name, 'Runesmith');
  assert.equal(awakenClass('Lean').name, 'Oracle');
  assert.equal(awakenClass('Brainfuck').name, 'Novice');
  assert.equal(awakenClass(undefined).name, 'Novice');
});

test('today without a contribution does not break the streak', () => {
  const days = calendar((i) => (i >= 360 && i < 365 ? 2 : 0));
  assert.equal(summarizeActivity(days).currentStreak, 5);
  days[365]!.count = 1;
  assert.equal(summarizeActivity(days).currentStreak, 6);
  days[364]!.count = 0;
  assert.equal(summarizeActivity(days).currentStreak, 1);
});

test('activity groups days into Sunday-first weeks and finds the busiest week', () => {
  const summary = summarizeActivity(calendar());
  assert.ok(summary.weeks.every((w, i) => i === 0 || w[0]!.weekday === 0));
  const totals = summary.weeks.map((w) => w.reduce((s, d) => s + d.count, 0));
  assert.equal(summary.bestWeek.count, Math.max(...totals));
  assert.equal(summary.weekdayTotals.reduce((a, b) => a + b, 0), summary.total);
});

test('achievement tiers count the goals reached; hour-based ones need commit hours', () => {
  const raw = rawProfile();
  const list = evaluateAchievements(raw, summarizeActivity(raw.year.calendar));
  const byId = Object.fromEntries(list.map((a) => [a.id, a]));
  assert.equal(byId.relentless!.tier, 2);
  assert.equal(byId['gate-opener']!.tier, 3);
  assert.equal(byId['night-owl']!.value, 29);
  assert.equal(byId['night-owl']!.tier, 1);
  assert.equal(byId.healer!.tier, 0);

  const noHours = evaluateAchievements(rawProfile({ commitHours: null }), summarizeActivity(raw.year.calendar));
  assert.equal(noHours.find((a) => a.id === 'night-owl')!.available, false);
  assert.equal(noHours.find((a) => a.id === 'night-owl')!.tier, 0);
});

test('an unearned title falls back to the best earned one', () => {
  const raw = rawProfile();
  const list = evaluateAchievements(raw, summarizeActivity(raw.year.calendar));
  assert.equal(equipTitle(list, 'night-owl')?.id, 'night-owl');
  const fallback = equipTitle(list, 'healer');
  assert.ok(fallback && fallback.tier === 3);
  assert.equal(equipTitle(list.map((a) => ({ ...a, tier: 0 })), 'auto'), null);
});

test('config reports every invalid field', () => {
  const { problems } = resolveConfig({ username: 'bad name', theme: 'nope', motion: 'loud' as 'full', timezone: 'Mars/Base', widgets: ['status', 'radar'] });
  assert.equal(problems.length, 5);
  const ok = resolveConfig({ username: 'billtruong003', timezone: 'Asia/Ho_Chi_Minh' });
  assert.deepEqual(ok.problems, []);
  assert.equal(ok.config.activity, 'arise');
});

test('v1 widget URLs map onto the new widgets', async () => {
  const { legacyWidget } = await import('../src/presentation/http/router.js');
  assert.equal(legacyWidget('stat', 'AGI'), 'rune-agi');
  assert.equal(legacyWidget('stat', null), 'rune-str');
  assert.equal(legacyWidget('skill', null), 'skills');
  assert.equal(legacyWidget('quest', null), 'quest');
});

test('short numbers fit tight columns', async () => {
  const { fmtShort } = await import('../src/presentation/svg/kit.js');
  assert.equal(fmtShort(9999), '9,999');
  assert.equal(fmtShort(38714), '38.7k');
  assert.equal(fmtShort(263249), '263.2k');
  assert.equal(fmtShort(1046211), '1.0M');
});
