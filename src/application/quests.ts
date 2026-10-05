import type { ActivitySummary, DailyBoard, DayLog, QuestHistory, QuestStatus } from '../domain/types.js';

interface Context {
  /** The day being judged and the days before it, newest first. */
  days: DayLog[];
  /** Contributions per day over the past year. */
  average: number;
  mp14: number;
}

interface QuestDef {
  id: string;
  /** For the one-line list of today's quests. */
  short: string;
  name: (c: Context) => string;
  /** Current value and goal on the judged day. */
  measure: (c: Context) => [number, number];
  /** Only offered on some days. */
  when?: (day: DayLog) => boolean;
}

const day = (c: Context): DayLog => c.days[0]!;
const averageGoal = (c: Context): number => Math.max(2, Math.ceil(c.average));

/**
 * Easy quests only: things most players do on an ordinary day, so the board rewards showing up rather than
 * having a pull request to merge. The first one is always on the board; it is the streak.
 */
export const QUESTS: readonly QuestDef[] = [
  { id: 'contribute', short: '1 contribution', name: () => 'Make one contribution', measure: (c) => [day(c).contributions, 1] },
  { id: 'three', short: '3 contributions', name: () => 'Land 3 contributions', measure: (c) => [day(c).contributions, 3] },
  { id: 'commit', short: 'a commit', name: () => 'Commit to any repository', measure: (c) => [day(c).commits, 1] },
  { id: 'two-repos', short: '2 repositories', name: () => 'Commit to 2 repositories', measure: (c) => [day(c).repos, 2] },
  { id: 'average', short: 'beat your average', name: (c) => `Beat your daily average (${averageGoal(c)})`, measure: (c) => [day(c).contributions, averageGoal(c)] },
  { id: 'star', short: 'star a repository', name: () => 'Star a repository you like', measure: (c) => [day(c).stars, 1] },
  { id: 'issue', short: 'open an issue', name: () => 'Open an issue: a bug, an idea, a question', measure: (c) => [day(c).issues, 1] },
  { id: 'streak', short: '3-day streak', name: () => 'Keep a 3-day streak', measure: (c) => [c.days.slice(0, 3).filter((d) => d.contributions > 0).length, 3] },
  { id: 'mp', short: 'MP 14', name: () => 'Keep MP at 14 (14 days)', measure: (c) => [c.mp14, 14] },
  { id: 'weekend', short: 'weekend raid', name: () => 'Weekend raid: 2 contributions', measure: (c) => [day(c).contributions, 2], when: (d) => d.weekday === 0 || d.weekday === 6 },
];

const BOSS_GOAL = 4;

/** FNV-1a, so the same player gets the same quests for a date on every run and every server. */
const hash = (text: string): number => {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
};

/** The fixed quest and two others drawn for this player and date. */
export const questsFor = (login: string, date: string, weekday: number): QuestDef[] => {
  const pool = QUESTS.slice(1).filter((q) => !q.when || q.when({ date, weekday, contributions: 0, commits: 0, repos: 0, issues: 0, stars: 0 }));
  const picked: QuestDef[] = [];
  let seed = hash(`${login.toLowerCase()}|${date}`);
  while (picked.length < 2 && pool.length) {
    picked.push(pool.splice(seed % pool.length, 1)[0]!);
    seed = hash(String(seed));
  }
  return [QUESTS[0]!, ...picked];
};

const judge = (defs: QuestDef[], c: Context): QuestStatus[] =>
  defs.map((q) => {
    const [value, goal] = q.measure(c);
    return { id: q.id, name: q.name(c), short: q.short, done: value >= goal, progress: `${Math.min(value, goal)} / ${goal}` };
  });

const mondayOf = (date: string, weekday: number): string =>
  new Date(Date.parse(`${date}T00:00:00Z`) - ((weekday + 6) % 7) * 864e5).toISOString().slice(0, 10);

/**
 * The nightly run happens just after midnight, so the board grades the day that just ended and lists
 * today's quests. `days` is today first, then the days before it.
 */
export const dailyBoard = (login: string, days: DayLog[], activity: ActivitySummary, yearDays: number): DailyBoard => {
  const average = activity.total / Math.max(1, yearDays);
  const [today, ...past] = days;
  const judgedCtx: Context = { days: past, average, mp14: activity.mp14 };
  const judgedDay = past[0]!;
  const judgedQuests = judge(questsFor(login, judgedDay.date, judgedDay.weekday), judgedCtx);
  const todayCtx: Context = { days, average, mp14: activity.mp14 };
  const weekStart = mondayOf(judgedDay.date, judgedDay.weekday);
  const active = past.filter((d) => d.date >= weekStart && d.contributions > 0).length;
  return {
    judged: { date: judgedDay.date, quests: judgedQuests, cleared: judgedQuests.filter((q) => q.done).length },
    today: { date: today!.date, quests: judge(questsFor(login, today!.date, today!.weekday), todayCtx) },
    boss: { weekStart, active, goal: BOSS_GOAL, defeated: active >= BOSS_GOAL },
  };
};

export const EMPTY_HISTORY: QuestHistory = { days: [], perfectDays: 0, run: 0, bestRun: 0, questsDone: 0, bosses: [], escapes: 0, kinds: [] };

const dayBefore = (date: string): string => new Date(Date.parse(`${date}T00:00:00Z`) - 864e5).toISOString().slice(0, 10);

/**
 * Adds the judged day to the history once. A perfect day (every quest cleared) extends the run; an escape
 * is a day with contributions right after a day in the Penalty Zone.
 */
export const recordQuests = (previous: QuestHistory | null, board: DailyBoard, days: DayLog[]): QuestHistory => {
  const h: QuestHistory = previous ? { ...EMPTY_HISTORY, ...previous } : { ...EMPTY_HISTORY };
  const { date, quests, cleared } = board.judged;
  if (h.days.some((d) => d.date === date)) return h;
  const perfect = cleared === quests.length;
  const followsLast = h.days[0]?.date === dayBefore(date);
  const run = perfect ? (followsLast && h.days[0]!.cleared === h.days[0]!.total ? h.run + 1 : 1) : 0;
  const judgedIndex = days.findIndex((d) => d.date === date);
  const escaped = judgedIndex >= 0 && days[judgedIndex]!.contributions > 0 && (days[judgedIndex + 1]?.contributions ?? 1) === 0;
  return {
    days: [{ date, cleared, total: quests.length }, ...h.days].slice(0, 60),
    perfectDays: h.perfectDays + (perfect ? 1 : 0),
    run,
    bestRun: Math.max(h.bestRun, run),
    questsDone: h.questsDone + cleared,
    bosses: board.boss.defeated && !h.bosses.includes(board.boss.weekStart) ? [board.boss.weekStart, ...h.bosses].slice(0, 200) : h.bosses,
    escapes: h.escapes + (escaped ? 1 : 0),
    kinds: [...new Set([...h.kinds, ...quests.filter((q) => q.done).map((q) => q.id)])],
  };
};
