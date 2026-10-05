import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarizeActivity } from '../src/application/activity.js';
import { equipTitle, evaluateAchievements } from '../src/application/achievements.js';
import { awakenClass } from '../src/application/classes.js';
import { buildStat, levelFor, overallRank, rankForPercentile } from '../src/application/ranks.js';
import { normalCdf, normalInv, percentileOf, valueAt, type Population } from '../src/application/population.js';
import { STAT_CODES } from '../src/domain/types.js';
import { resolveConfig } from '../src/config/config.js';
import { calendar, rawProfile } from './fixture.js';

// A fixed population so these tests do not move when the sample is refreshed.
const POP: Population = {
  sampledAt: '2026-01-01', size: 1000,
  stats: {
    STR: { zero: 0.05, mu: 4, sigma: 1.5 }, AGI: { zero: 0.6, mu: 2, sigma: 1.2 }, INT: { zero: 0.8, mu: 2, sigma: 1.2 },
    VIT: { zero: 0.1, mu: 1.5, sigma: 0.65 }, LUK: { zero: 0.8, mu: 1.8, sigma: 1.25 }, CHA: { zero: 0.6, mu: 1.6, sigma: 0.95 },
  },
  // Composite scores of a population whose mean z is itself standard normal.
  composite: Array.from({ length: 201 }, (_, i) => normalInv(Math.min(0.9999, Math.max(0.0001, i / 200)))),
};

test('percentiles follow the fitted distribution and invert back to values', () => {
  const d = POP.stats.STR;
  assert.equal(percentileOf(0, d), 0);
  const median = Math.expm1(d.mu);
  assert.ok(Math.abs(percentileOf(median, d) - (d.zero + (1 - d.zero) * 0.5)) < 1e-6);
  for (const p of [0.5, 0.9, 0.99, 0.9995]) {
    const v = valueAt(p, d);
    assert.ok(percentileOf(v, d) >= p - 1e-9 && percentileOf(v - 1, d) < p, `valueAt(${p}) is the smallest value reaching it`);
  }
  assert.ok(Math.abs(normalInv(normalCdf(1.3)) - 1.3) < 1e-4);
});

test('stat ranks come from the percentile ladder, with the value needed for the next rank', () => {
  assert.equal(buildStat('STR', 0, POP).rank, 'E');
  const b = buildStat('STR', valueAt(0.8, POP.stats.STR), POP);
  assert.equal(b.rank, 'B');
  assert.equal(b.next?.rank, 'A');
  assert.ok(percentileOf(b.next!.at, POP.stats.STR) >= 0.87);
  assert.ok(b.next!.at > b.value);
  const ex = buildStat('STR', 10_000_000, POP);
  assert.equal(ex.rank, 'EX');
  assert.equal(ex.next, null);
  assert.equal(rankForPercentile(0.399).rank, 'E');
  assert.equal(rankForPercentile(0.4).rank, 'D');
  assert.equal(rankForPercentile(0.9995).rank, 'EX');
  assert.ok(Math.abs(rankForPercentile(0.675).progress - 0.5) < 1e-9);
});

test('the overall rank places the weighted mean percentile among the sampled players', () => {
  const zeros = STAT_CODES.map((code) => buildStat(code, 0, POP));
  assert.equal(overallRank(zeros, POP).rank, 'E');
  const strong = STAT_CODES.map((code) => buildStat(code, valueAt(0.97, POP.stats[code]), POP));
  const overall = overallRank(strong, POP);
  assert.equal(overall.rank, 'S');
  assert.ok(overall.percentile > 0.94 && overall.percentile < 0.98);
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
