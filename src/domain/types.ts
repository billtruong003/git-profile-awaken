export const GRADES = ['E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS', 'EX'] as const;
export type RankGrade = (typeof GRADES)[number];

export const STAT_CODES = ['STR', 'AGI', 'INT', 'VIT', 'LUK', 'CHA'] as const;
export type StatCode = (typeof STAT_CODES)[number];

export type ThemeMode = 'dark' | 'light';
export type Motion = 'full' | 'calm' | 'none';
export type ActivityStyle = 'arise' | 'raid';
export type IconSet = 'rune' | 'brand';

export const LAYOUT_IDS = ['default', 'classic', 'stats', 'activity', 'bento', 'bento_compact', 'minimal', 'showcase', 'dashboard', 'portfolio', 'custom'] as const;
export type LayoutId = (typeof LAYOUT_IDS)[number];

export const WIDGET_IDS = [
  'hunter', 'status', 'quest', 'skills', 'contribution', 'runes',
  'achievements', 'combat', 'hours', 'activity', 'daily',
  'ladder', 'web', 'levelup', 'oracle', 'spotlight', 'arsenal',
  'banner', 'contacts', 'bio', 'career', 'cv', 'board', 'arise', 'raid',
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

/** One day of activity in the player's timezone, what the daily quests are judged on. */
export interface DayLog {
  date: string;
  /** 0 = Sunday. */
  weekday: number;
  contributions: number;
  commits: number;
  repos: number;
  issues: number;
  stars: number;
}

export interface QuestStatus {
  id: string;
  name: string;
  short: string;
  done: boolean;
  /** e.g. "2 / 3". */
  progress: string;
}

export interface DailyBoard {
  /** The day that just ended: what the nightly image grades. */
  judged: { date: string; quests: QuestStatus[]; cleared: number };
  /** Today's quests, so players know what to do. */
  today: { date: string; quests: QuestStatus[] };
  boss: { weekStart: string; active: number; goal: number; defeated: boolean };
}

/** Quest results kept in player.json between runs; quest titles count from the first run. */
export interface QuestHistory {
  /** Judged days already counted, newest first (the last 60), so a second run on a day counts nothing twice. */
  days: { date: string; cleared: number; total: number }[];
  perfectDays: number;
  run: number;
  bestRun: number;
  questsDone: number;
  bosses: string[];
  escapes: number;
  kinds: string[];
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
  /** Today and the eight days before it, newest first, in the player's timezone. Null when not fetched. */
  days: DayLog[] | null;
  /** Your most recent merged pull requests and closed issues, for Pull Shark, Quickdraw and YOLO. */
  closes: { quickdraws: number; unreviewedMerges: number; sampled: number } | null;
  fetchedAt: string;
}

export interface Stat {
  code: StatCode;
  source: string;
  value: number;
  rank: RankGrade;
  progress: number;
  next: { rank: RankGrade; at: number } | null;
  /** Share of regular GitHub players below this value (0–1). */
  percentile: number;
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
  /** Share of regular GitHub players with a lower overall score (0–1). */
  overallPercentile: number;
  jobClass: { name: string; element: string; from: string | null };
  stats: Stat[];
  achievements: Achievement[];
  equippedTitle: Achievement | null;
  activity: ActivitySummary;
  /** Daily quests; null when the day-by-day data was not fetched. */
  quests: DailyBoard | null;
  /** Quest history after this run; null without the Action. */
  questHistory: QuestHistory | null;
  /** Present when the Action gathered them (spotlight, feeds, quote, progress events). */
  extras?: Extras;
}

// ---------- profile extras (Guild Contacts, banner, bio, arsenal, spotlight, feeds, quotes) ----------

export interface SocialLink {
  /** A simple-icons slug (youtube, x, discord…) or one of: website, email, linkedin. */
  type: string;
  url: string;
  label?: string;
}

export type BannerStyle = 'auto' | 'typewriter' | 'glitch' | 'system';

export interface CareerEntry {
  role: string;
  org: string;
  years: string;
  /** Shown as IN PROGRESS instead of CLEARED. */
  current: boolean;
}

export interface ExtrasConfig {
  socials: SocialLink[];
  /** "auto" lets the layout pick: glitch for Showcase and Portfolio, typewriter elsewhere. */
  banner: { lines: string[]; style: BannerStyle };
  bio: { role?: string; location?: string; focus?: string; about?: string };
  /** Technology names or slugs ("Unity", "nextjs", "postgresql"). Your top languages are added. */
  arsenal: string[];
  /** Repositories to show ("name" or "owner/name"). Empty: your pinned repositories. */
  spotlight: string[];
  /** RSS or Atom feeds: a blog, or a YouTube channel (youtube.com/feeds/videos.xml?channel_id=…). */
  feeds: string[];
  /** "builtin" (famous lines) or "dry" (dry dev jokes) rotate a bundled pool daily; a list can mix pools and your own. */
  quotes: QuoteSetting;
  career: CareerEntry[];
  /** A path in your profile repository (cv.pdf) or an https:// link to your résumé. */
  cv: string | null;
}

export interface RepoCard {
  owner: string;
  name: string;
  description: string;
  stars: number;
  forks: number;
  language: { name: string; color: string } | null;
  pushedAt: string;
}

export interface FeedItem {
  title: string;
  url: string;
  date: string;
  source: string;
}

export type QuotePool = 'builtin' | 'dry';
export type QuoteSetting = QuotePool | (QuotePool | { text: string; author: string })[];

export interface Quote {
  text: string;
  author: string;
}

/** Something that changed since the last run, kept for a while so the Level Up notice can show it. */
export interface ProgressEvent {
  kind: 'level' | 'overall' | 'stat' | 'achievement';
  subject: string;
  from: string;
  to: string;
  at: string;
}

export interface Extras {
  config: ExtrasConfig;
  /** Resolved Arsenal: logo slug, or null for a monogram tile. */
  arsenal: { name: string; slug: string | null }[];
  spotlight: RepoCard[];
  feed: FeedItem[];
  quote: Quote | null;
  events: ProgressEvent[];
}

export interface AwakenConfig {
  username: string;
  theme: string;
  title: string;
  activity: ActivityStyle;
  icons: IconSet;
  motion: Motion;
  timezone: string;
  /** README arrangement. "custom" stacks `widgets` in the order given. */
  layout: LayoutId;
  widgets: WidgetId[];
  outDir: string;
  readme: string | null;
  extras: ExtrasConfig;
}
