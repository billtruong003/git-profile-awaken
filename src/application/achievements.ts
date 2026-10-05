import type { Achievement, ActivitySummary, QuestHistory, RawProfile } from '../domain/types.js';

interface Definition {
  id: string;
  name: string;
  /** The title a player can equip once tier I is reached. */
  title: string;
  icon: string;
  unit: string;
  goals: readonly [number, number, number];
  /** null when the data behind it was not fetched. */
  measure: (raw: RawProfile, activity: ActivitySummary, quests: QuestHistory | null) => number | null;
}

const share = (part: number, whole: number): number => (whole > 0 ? Math.round((part / whole) * 100) : 0);
const hoursShare = (raw: RawProfile, hours: number[]): number | null =>
  raw.commitHours ? share(hours.reduce((s, h) => s + raw.commitHours![h]!, 0), raw.commitHours.reduce((s, v) => s + v, 0)) : null;

export const ACHIEVEMENTS: readonly Definition[] = [
  // Pull request badges, judged on the last 100 merged pull requests and closed issues. First in the list so
  // they lose ties when the title is picked automatically: they are common.
  { id: 'pull-shark', name: 'Pull Shark', title: 'Pull Shark', icon: 'fin', unit: 'PRs merged', goals: [2, 16, 128], measure: (r) => r.mergedPullRequests },
  { id: 'quickdraw', name: 'Quickdraw', title: 'Quickdraw', icon: 'bolt', unit: 'closed in 5 min', goals: [1, 5, 25], measure: (r) => r.closes?.quickdraws ?? null },
  { id: 'yolo', name: 'YOLO', title: 'YOLO', icon: 'dice', unit: 'merged, no review', goals: [1, 10, 50], measure: (r) => r.closes?.unreviewedMerges ?? null },
  { id: 'relentless', name: 'Relentless', title: 'The Relentless', icon: 'sword', unit: 'commits', goals: [100, 1000, 5000], measure: (r) => r.lifetimeCommits },
  { id: 'unbroken', name: 'Unbroken', title: 'Unbroken', icon: 'flame', unit: 'day streak', goals: [7, 30, 100], measure: (_, a) => a.bestStreak },
  { id: 'night-owl', name: 'Night Owl', title: 'Night Owl', icon: 'moon', unit: '% commits 22–05h', goals: [20, 30, 45], measure: (r) => hoursShare(r, [22, 23, 0, 1, 2, 3, 4]) },
  { id: 'early-bird', name: 'Early Bird', title: 'Early Bird', icon: 'sun', unit: '% commits 05–09h', goals: [15, 25, 40], measure: (r) => hoursShare(r, [5, 6, 7, 8]) },
  { id: 'weekend-warrior', name: 'Weekend Warrior', title: 'Weekend Warrior', icon: 'shield', unit: '% on weekends', goals: [20, 30, 45], measure: (_, a) => share(a.weekdayTotals[5]! + a.weekdayTotals[6]!, a.total) },
  { id: 'gate-opener', name: 'Gate Opener', title: 'Gate Opener', icon: 'gate', unit: 'repos this year', goals: [5, 20, 50], measure: (r) => r.year.newRepos },
  { id: 'raider', name: 'Raider', title: 'Raider', icon: 'swords', unit: 'PRs merged out', goals: [1, 10, 50], measure: (r) => r.raids.reduce((s, x) => s + x.merged, 0) },
  { id: 'flawless', name: 'Flawless', title: 'Flawless', icon: 'target', unit: '% PRs merged', goals: [80, 90, 100], measure: (r) => (r.pullRequests >= 10 ? share(r.mergedPullRequests, r.pullRequests) : 0) },
  { id: 'healer', name: 'Healer', title: 'Healer', icon: 'cross', unit: 'reviews', goals: [10, 50, 200], measure: (r) => r.lifetimeReviews },
  { id: 'polyglot', name: 'Polyglot', title: 'Polyglot', icon: 'scroll', unit: 'languages ≥ 1%', goals: [3, 5, 8], measure: (r) => r.languages.filter((l) => l.percent >= 1).length },
  { id: 'star-collector', name: 'Star Collector', title: 'Star Collector', icon: 'star', unit: 'stars', goals: [10, 100, 1000], measure: (r) => r.stars },
  { id: 'beacon', name: 'Beacon', title: 'Beacon', icon: 'beacon', unit: 'followers', goals: [10, 100, 1000], measure: (r) => r.followers },
  { id: 'guild-hopper', name: 'Guild Hopper', title: 'Guild Hopper', icon: 'banner', unit: 'organizations', goals: [1, 3, 7], measure: (r) => r.organizations },
  { id: 'veteran', name: 'Veteran', title: 'Veteran', icon: 'hourglass', unit: 'years awakened', goals: [1, 3, 5], measure: (r) => Math.floor((Date.parse(r.fetchedAt) - Date.parse(r.createdAt)) / (365.25 * 864e5)) },
  { id: 'berserker', name: 'Berserker', title: 'Berserker', icon: 'axe', unit: 'in one day', goals: [10, 30, 60], measure: (_, a) => a.bestDay.count },
  { id: 'diligent', name: 'Diligent', title: 'Diligent', icon: 'calendar', unit: 'active days', goals: [50, 150, 300], measure: (_, a) => a.activeDays },
  // Daily quest titles. They count from the first Action run, kept in player.json.
  { id: 'daily-grinder', name: 'Daily Grinder', title: 'Daily Grinder', icon: 'check', unit: 'perfect days', goals: [7, 30, 100], measure: (_, __, q) => q?.perfectDays ?? null },
  { id: 'perfect-week', name: 'Perfect Week', title: 'The Unfaltering', icon: 'crown', unit: 'perfect-day run', goals: [7, 14, 30], measure: (_, __, q) => q?.bestRun ?? null },
  { id: 'quest-hunter', name: 'Quest Hunter', title: 'Quest Hunter', icon: 'scroll', unit: 'quests cleared', goals: [50, 250, 1000], measure: (_, __, q) => q?.questsDone ?? null },
  { id: 'boss-slayer', name: 'Boss Slayer', title: 'Boss Slayer', icon: 'boss', unit: 'weekly bosses', goals: [1, 10, 50], measure: (_, __, q) => q?.bosses.length ?? null },
  { id: 'escape-artist', name: 'Escape Artist', title: 'Escape Artist', icon: 'gate', unit: 'penalty escapes', goals: [3, 10, 25], measure: (_, __, q) => q?.escapes ?? null },
  { id: 'collector', name: 'Collector', title: 'The Collector', icon: 'crystal', unit: 'quest kinds', goals: [4, 7, 10], measure: (_, __, q) => q?.kinds.length ?? null },
];

export const evaluateAchievements = (raw: RawProfile, activity: ActivitySummary, quests: QuestHistory | null = null): Achievement[] =>
  ACHIEVEMENTS.map((def) => {
    const value = def.measure(raw, activity, quests);
    return {
      id: def.id,
      name: def.name,
      title: def.title,
      icon: def.icon,
      unit: def.unit,
      goals: def.goals,
      value: value ?? 0,
      tier: value === null ? 0 : def.goals.filter((goal) => value >= goal).length,
      available: value !== null,
    };
  });

/**
 * The equipped title: the one the player asked for if they have earned it, otherwise the highest tier earned
 * (ties go to the achievement listed later, which is the rarer kind).
 */
export const equipTitle = (achievements: Achievement[], wanted: string): Achievement | null => {
  const earned = achievements.filter((a) => a.tier > 0);
  const chosen = earned.find((a) => a.id === wanted);
  if (chosen) return chosen;
  return earned.reduce<Achievement | null>((best, a) => (!best || a.tier >= best.tier ? a : best), null);
};
