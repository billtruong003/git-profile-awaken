import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPlayer } from '../src/application/player.js';
import { dailyBoard, EMPTY_HISTORY, QUESTS, questsFor, recordQuests } from '../src/application/quests.js';
import { summarizeActivity } from '../src/application/activity.js';
import { dayWindows } from '../src/infrastructure/githubClient.js';
import type { DayLog } from '../src/domain/types.js';
import { calendar, rawProfile } from './fixture.js';

const log = (date: string, contributions: number, extra: Partial<DayLog> = {}): DayLog => ({
  date, weekday: new Date(`${date}T00:00:00Z`).getUTCDay(), contributions, commits: contributions, repos: contributions ? 1 : 0, issues: 0, stars: 0, ...extra,
});
const week = (counts: number[], start = '2026-10-05'): DayLog[] =>
  counts.map((c, i) => log(new Date(Date.parse(`${start}T00:00:00Z`) - i * 864e5).toISOString().slice(0, 10), c));

test('every board has the fixed quest and two others, the same for a player and date everywhere', () => {
  for (let i = 0; i < 60; i++) {
    const date = new Date(Date.UTC(2026, 0, 1) + i * 864e5);
    const iso = date.toISOString().slice(0, 10);
    const quests = questsFor('player-one', iso, date.getUTCDay());
    assert.equal(quests.length, 3);
    assert.equal(quests[0]!.id, 'contribute');
    assert.equal(new Set(quests.map((q) => q.id)).size, 3);
    if (date.getUTCDay() !== 0 && date.getUTCDay() !== 6) assert.ok(!quests.some((q) => q.id === 'weekend'), `${iso}: weekend quest on a weekday`);
    assert.deepEqual(questsFor('PLAYER-ONE', iso, date.getUTCDay()).map((q) => q.id), quests.map((q) => q.id));
  }
  const spread = new Set(Array.from({ length: 60 }, (_, i) => questsFor('player-one', new Date(Date.UTC(2026, 0, 1) + i * 864e5).toISOString().slice(0, 10), 1).map((q) => q.id).join()));
  assert.ok(spread.size > 10, 'boards vary from day to day');
  assert.equal(QUESTS.length, 10);
});

test('the board judges the day that just ended and lists today', () => {
  const activity = summarizeActivity(calendar(() => 1));
  const board = dailyBoard('player-one', week([0, 3, 2, 1, 0, 4, 1, 2, 0]), activity, 366);
  assert.equal(board.today.date, '2026-10-05');
  assert.equal(board.judged.date, '2026-10-04');
  const fixed = board.judged.quests[0]!;
  assert.deepEqual([fixed.done, fixed.progress], [true, '1 / 1']);
  // 2026-10-04 is a Sunday: the week runs from Monday 09-28 and has six active days.
  assert.deepEqual(board.boss, { weekStart: '2026-09-28', active: 6, goal: 4, defeated: true });
});

test('quest history counts each judged day once, runs, escapes and bosses', () => {
  const activity = summarizeActivity(calendar(() => 1));
  const days = week([0, 5, 0, 3, 3, 3, 3, 3, 3]);
  const board = dailyBoard('player-one', days, activity, 366);
  board.judged.quests = board.judged.quests.map((q) => ({ ...q, done: true }));
  board.judged.cleared = 3;
  const first = recordQuests({ ...EMPTY_HISTORY, days: [{ date: '2026-10-03', cleared: 3, total: 3 }], run: 4, bestRun: 4 }, board, days);
  assert.equal(first.run, 5);
  assert.equal(first.bestRun, 5);
  assert.equal(first.perfectDays, 1);
  assert.equal(first.questsDone, 3);
  assert.equal(first.escapes, 1, 'active right after a day in the Penalty Zone');
  assert.deepEqual(first.bosses, ['2026-09-28']);
  assert.deepEqual(recordQuests(first, board, days), first, 'a second run the same day changes nothing');
});

test('quest titles need the Action history; the public server shows them as unavailable', () => {
  const hosted = buildPlayer(rawProfile(), 'auto');
  assert.equal(hosted.achievements.find((a) => a.id === 'daily-grinder')!.available, false);
  assert.ok(hosted.quests, 'the board itself still draws');
  const action = buildPlayer(rawProfile(), 'auto', { ...EMPTY_HISTORY, perfectDays: 30, bestRun: 7 }, true);
  assert.equal(action.achievements.find((a) => a.id === 'daily-grinder')!.tier, 2);
  assert.equal(action.achievements.find((a) => a.id === 'perfect-week')!.tier, 1);
  assert.equal(action.achievements.find((a) => a.id === 'yolo')!.tier, 2);
  assert.equal(action.achievements.find((a) => a.id === 'pull-shark')!.tier, 1);
});

test('day windows follow the player timezone', () => {
  const windows = dayWindows(new Date('2026-10-05T03:00:00Z'), 'Asia/Ho_Chi_Minh');
  assert.equal(windows.length, 9);
  assert.deepEqual(windows[0], ['2026-10-05', '2026-10-04T17:00:00.000Z', '2026-10-05T03:00:00.000Z']);
  assert.deepEqual(windows[1]!.slice(0, 2), ['2026-10-04', '2026-10-03T17:00:00.000Z']);
});
