import type { RankGrade, CharacterClass, ActiveQuest, ThemeConfig, RpgStat, CharacterProfile, ContributionAnalysis } from '../domain/types.js';

export const RANK_THRESHOLDS = {
  STR: [10, 30, 100, 200, 400, 600, 1000, 2000],
  AGI: [2, 5, 10, 20, 40, 60, 100, 150],
  INT: [2, 5, 10, 20, 40, 60, 100, 150],
  VIT: [2, 4, 8, 15, 25, 40, 60, 80],
  LUK: [5, 15, 30, 60, 100, 200, 500, 1000],
  CHA: [2, 5, 10, 25, 50, 100, 200, 500],
};

const CONTRIBUTION_THRESHOLDS = [50, 150, 300, 500, 800, 1200, 1800, 2500];

const GRADES: RankGrade[] = ['E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS', 'EX'];

const OVERALL_POWER_THRESHOLDS = [50, 150, 300, 600, 1000, 1800, 2800, 4000];

const WEEKLY_CHART_SIZE = 16;

const resolveGradeFromThresholds = (
  value: number,
  thresholds: number[],
): { grade: RankGrade; progress: number } => {
  for (let i = 0; i < thresholds.length; i++) {
    if (value < thresholds[i]!) {
      const prevThreshold = i === 0 ? 0 : thresholds[i - 1]!;
      const range = thresholds[i]! - prevThreshold || 1;
      const progress = Math.min(Math.max(((value - prevThreshold) / range) * 100, 0), 100);
      return { grade: GRADES[i]!, progress };
    }
  }
  return { grade: GRADES[GRADES.length - 1]!, progress: 100 };
};

export const calculateGrade = (
  value: number,
  thresholds: number[],
  theme: ThemeConfig,
): { grade: RankGrade; progress: number; color: string } => {
  const { grade, progress } = resolveGradeFromThresholds(value, thresholds);
  return { grade, progress, color: theme.rankColors[grade] };
};

export const calculateOverallLevel = (
  str: number,
  agi: number,
  int: number,
  vit: number,
  luk: number,
  cha: number,
): { level: number; exp: number; nextExp: number; overallRank: RankGrade } => {
  const totalExp = str * 10 + agi * 50 + int * 40 + vit * 100 + luk * 20 + cha * 30;
  const level = Math.floor(Math.pow(totalExp / 100, 0.5)) + 1;
  const currentLevelExpFloor = Math.pow(level - 1, 2) * 100;
  const nextLevelExpCeiling = Math.pow(level, 2) * 100;

  const overallPower = str * 1.5 + agi * 2 + int * 2 + vit + luk + cha;
  const { grade: overallRank } = resolveGradeFromThresholds(overallPower, OVERALL_POWER_THRESHOLDS);

  return {
    level,
    exp: totalExp - currentLevelExpFloor,
    nextExp: nextLevelExpCeiling - currentLevelExpFloor,
    overallRank,
  };
};

export const awakenClass = (topLang: string): CharacterClass => {
  const lang = topLang.toLowerCase();
  if (lang.includes('typescript') || lang.includes('javascript')) return { name: 'Blade Master', element: 'Lightning', trait: 'Asynchronous Strike' };
  if (lang.includes('python') || lang.includes('jupyter')) return { name: 'Grand Magus', element: 'Arcane', trait: 'Data Manipulation' };
  if (lang.includes('java') || lang.includes('c#') || lang.includes('csharp')) return { name: 'Holy Knight', element: 'Light', trait: 'Object Orientation' };
  if (lang.includes('c++') || lang.includes('c') || lang.includes('rust') || lang.includes('go')) return { name: 'Necromancer', element: 'Darkness', trait: 'Memory Control' };
  if (lang.includes('html') || lang.includes('css')) return { name: 'Illusionist', element: 'Wind', trait: 'Visual Deception' };
  if (lang.includes('php') || lang.includes('ruby')) return { name: 'Alchemist', element: 'Fire', trait: 'Legacy Transmutation' };
  return { name: 'Novice', element: 'Neutral', trait: 'Adaptability' };
};

export const generateQuest = (repos: any[]): ActiveQuest => {
  const latestRepo = repos[0];
  if (!latestRepo) return { title: 'Awaiting System Directives', target: 'Unknown Dimension', rank: 'E', status: 'Idle' };

  const repoSizeKb = latestRepo.diskUsage || 0;
  let rank: RankGrade = 'E';
  if (repoSizeKb > 100_000) rank = 'S';
  else if (repoSizeKb > 50_000) rank = 'A';
  else if (repoSizeKb > 10_000) rank = 'B';
  else if (repoSizeKb > 5_000) rank = 'C';
  else if (repoSizeKb > 1_000) rank = 'D';

  const primaryLanguage = latestRepo.languages?.edges?.[0]?.node?.name || 'Code';
  const repoName = latestRepo.name;

  const questTemplates = [
    `Subjugate the [REPO] Dungeon`,
    `Optimize [LANG] Mana Core`,
    `Purify Bug Swarm in [REPO]`,
    `Establish [LANG] Stronghold`,
    `Retrieve Artifacts from [REPO]`,
    `Defend [REPO] from Degradation`,
  ];

  const commitMessage = latestRepo.defaultBranchRef?.target?.message?.split('\n')[0] || '';
  const templateIndex = (commitMessage.length + repoSizeKb) % questTemplates.length;
  let title = questTemplates[templateIndex]!.replace('[REPO]', repoName).replace('[LANG]', primaryLanguage);

  if (title.length > 32) title = title.substring(0, 29) + '...';

  return { title, target: repoName, rank, status: 'In Progress' };
};

const RECENT_ACTIVITY_WINDOW_DAYS = 14;
const FULL_MANA_CONTRIBUTION_TARGET = 35;

export const calculateMana = (weeks: any[]): number => {
  const recentDays = weeks.flatMap((w: any) => w.contributionDays).slice(-RECENT_ACTIVITY_WINDOW_DAYS);
  const recentContributions = recentDays.reduce((sum: number, day: any) => sum + day.contributionCount, 0);
  return Math.min((recentContributions / FULL_MANA_CONTRIBUTION_TARGET) * 100, 100);
};

export const analyzeContributions = (
  weeks: any[],
  allTimeTotal: number,
  calendarTotal: number,
  theme: ThemeConfig,
): ContributionAnalysis => {
  const allDays = weeks.flatMap((w: any) => w.contributionDays);

  const totalDaysTracked = allDays.length || 1;
  const dailyAverage = Number((calendarTotal / totalDaysTracked).toFixed(1));

  let currentStreak = 0;
  for (let i = allDays.length - 1; i >= 0; i--) {
    if (allDays[i].contributionCount > 0) {
      currentStreak++;
    } else {
      break;
    }
  }

  let longestStreak = 0;
  let runningStreak = 0;
  for (const day of allDays) {
    if (day.contributionCount > 0) {
      runningStreak++;
      if (runningStreak > longestStreak) longestStreak = runningStreak;
    } else {
      runningStreak = 0;
    }
  }

  const weeklyTotals = weeks.map((w: any) =>
    w.contributionDays.reduce((sum: number, d: any) => sum + d.contributionCount, 0),
  );
  const bestWeekCount = Math.max(...weeklyTotals, 0);

  const weeklyBreakdown = weeklyTotals.slice(-WEEKLY_CHART_SIZE);

  const { grade, progress, color } = calculateGrade(allTimeTotal, CONTRIBUTION_THRESHOLDS, theme);

  return {
    totalContributions: allTimeTotal,
    dailyAverage,
    currentStreak,
    longestStreak,
    bestWeekCount,
    weeklyBreakdown,
    grade,
    gradeColor: color,
    gradeProgress: progress,
  };
};

export const createAdminProfile = (username: string, theme: ThemeConfig): CharacterProfile => {
  const maxStat = (code: string, name: string): RpgStat => ({
    code,
    name,
    value: 999999,
    grade: 'EX',
    progress: 100,
    color: theme.rankColors['EX'],
  });
  return {
    username,
    isAdmin: true,
    level: 999,
    exp: 9999,
    nextExp: 9999,
    rank: 'EX',
    jobClass: { name: 'System Monarch', element: 'Void', trait: 'Absolute Override' },
    stats: [
      maxStat('STR', 'Commits'),
      maxStat('AGI', 'Pull Requests'),
      maxStat('INT', 'Issues'),
      maxStat('VIT', 'Repositories'),
      maxStat('LUK', 'Stars'),
      maxStat('CHA', 'Followers'),
    ],
    quest: { title: 'Rewrite the Universe Laws', target: 'Yggdrasil Core', rank: 'EX', status: 'Executing' },
    topLanguages: [{ name: 'System Code', color: '#ff003c', percent: 100 }],
    mana: 100,
    contributions: {
      totalContributions: 999999,
      dailyAverage: 999.9,
      currentStreak: 9999,
      longestStreak: 9999,
      bestWeekCount: 9999,
      weeklyBreakdown: Array(WEEKLY_CHART_SIZE).fill(100),
      grade: 'EX',
      gradeColor: theme.rankColors['EX'],
      gradeProgress: 100,
    },
  };
};