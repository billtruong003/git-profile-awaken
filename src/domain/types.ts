export const GRADES = ['E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS', 'EX'] as const;
export type RankGrade = (typeof GRADES)[number];

export const STAT_CODES = ['STR', 'AGI', 'INT', 'VIT', 'LUK', 'CHA'] as const;
export type StatCode = (typeof STAT_CODES)[number];

export type ThemeMode = 'dark' | 'light';
export type Motion = 'full' | 'calm' | 'none';
export type ActivityStyle = 'arise' | 'raid';
export type IconSet = 'rune' | 'brand';

export const WIDGET_IDS = [
  'hunter', 'status', 'quest', 'skills', 'contribution', 'runes',
  'achievements', 'combat', 'hours', 'activity', 'daily',
] as const;
export type WidgetId = (typeof WIDGET_IDS)[number];

export interface CalendarDay {
  date: string;
  count: number;
  weekday: number;
}

export interface LanguageShare {
  name: string;
  color: string;
  percent: number;
}

export interface QuestInfo {
  repo: string;
  language: { name: string; color: string } | null;
  createdAt: string;
  pushedAt: string;
  lastMessage: string;
  commits: number;
}

export interface Raid {
  repo: string;
  stars: number;
  merged: number;
}

/** GitHub data, normalized, before any game rule is applied. */
export interface RawProfile {
  login: string;
  name: string | null;
  createdAt: string;
  followers: number;
  organizations: number;
  ownedRepos: number;
  stars: number;
  pullRequests: number;
  mergedPullRequests: number;
  issues: number;
  lifetimeCommits: number;
  lifetimeReviews: number;
  year: {
    commits: number;
    pullRequests: number;
    reviews: number;
    issues: number;
    newRepos: number;
    activeRepos: number;
    calendar: CalendarDay[];
  };
  languages: LanguageShare[];
  quest: QuestInfo | null;
  raids: Raid[];
  /** Commits per hour of day in the player's timezone, or null when not fetched. */
  commitHours: number[] | null;
  fetchedAt: string;
}

export interface Stat {
  code: StatCode;
  source: string;
  value: number;
  rank: RankGrade;
  progress: number;
  next: { rank: RankGrade; at: number } | null;
}

export interface Achievement {
  id: string;
  name: string;
  title: string;
  icon: string;
  /** 0 = locked, 1..3 = tiers reached. */
  tier: number;
  value: number;
  goals: readonly [number, number, number];
  unit: string;
  available: boolean;
}

export interface ActivitySummary {
  weeks: CalendarDay[][];
  total: number;
  activeDays: number;
  currentStreak: number;
  bestStreak: number;
  bestWeek: { index: number; start: string; count: number };
  bestDay: { date: string; count: number };
  mp14: number;
  today: CalendarDay | null;
  yesterday: CalendarDay | null;
  /** Monday first. */
  weekdayTotals: number[];
}

export interface Player {
  raw: RawProfile;
  level: number;
  exp: number;
  nextExp: number;
  overall: RankGrade;
  jobClass: { name: string; element: string; from: string | null };
  stats: Stat[];
  achievements: Achievement[];
  equippedTitle: Achievement | null;
  activity: ActivitySummary;
}

export interface AwakenConfig {
  username: string;
  theme: string;
  title: string;
  activity: ActivityStyle;
  icons: IconSet;
  motion: Motion;
  timezone: string;
  widgets: WidgetId[];
  outDir: string;
  readme: string | null;
}
