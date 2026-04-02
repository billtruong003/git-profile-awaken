export type RankGrade = 'E' | 'D' | 'C' | 'B' | 'A' | 'S' | 'SS' | 'SSS' | 'EX';

export interface RpgStat {
  code: string;
  name: string;
  value: number;
  grade: RankGrade;
  progress: number;
  color: string;
}

export interface CharacterClass {
  name: string;
  element: string;
  trait: string;
}

export interface ActiveQuest {
  title: string;
  target: string;
  rank: RankGrade;
  status: string;
}

export interface ContributionAnalysis {
  totalContributions: number;
  dailyAverage: number;
  currentStreak: number;
  longestStreak: number;
  bestWeekCount: number;
  weeklyBreakdown: number[];
  grade: RankGrade;
  gradeColor: string;
  gradeProgress: number;
}

export interface CharacterProfile {
  username: string;
  isAdmin: boolean;
  level: number;
  exp: number;
  nextExp: number;
  rank: RankGrade;
  jobClass: CharacterClass;
  stats: RpgStat[];
  quest: ActiveQuest;
  topLanguages: { name: string; color: string; percent: number }[];
  mana: number;
  contributions: ContributionAnalysis;
}

export interface ThemeConfig {
  bg: string;
  panel: string;
  text: string;
  textMuted: string;
  primary: string;
  secondary: string;
  accent: string;
  border: string;
  rankColors: Record<RankGrade, string>;
}

export interface RawGithubData {
  user: {
    login: string;
    followers: { totalCount: number };
    pullRequests: { totalCount: number };
    issues: { totalCount: number };
    repositories: {
      totalCount: number;
      nodes: {
        name: string;
        stargazerCount: number;
        pushedAt: string;
        diskUsage: number;
        defaultBranchRef: { target: { message: string } } | null;
        languages: { edges: { size: number; node: { name: string; color: string } }[] };
      }[];
    };
    repositoriesContributedTo: { totalCount: number };
    contributionsCollection: {
      contributionCalendar: {
        totalContributions: number;
        weeks: { contributionDays: { contributionCount: number; date: string }[] }[];
      };
    };
  };
}

export interface CombinedGithubData {
  graphql: RawGithubData;
  allTimeCommits: number;
}