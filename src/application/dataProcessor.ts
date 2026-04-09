import type { CombinedGithubData, CharacterProfile, ThemeConfig, RpgStat } from '../domain/types.js';
import { calculateGrade, RANK_THRESHOLDS, calculateOverallLevel, awakenClass, generateQuest, calculateMana, analyzeContributions, createAdminProfile } from './rpgSystem.js';

const ADMIN_USER = 'billtruong003';

export const processProfileData = (data: CombinedGithubData, mode: string | null, theme: ThemeConfig): CharacterProfile => {
  const user = data.graphql.user;
  if (user.login === ADMIN_USER && mode !== 'mortal') {
    return createAdminProfile(user.login, theme);
  }

  const commitCount = data.allTimeCommits;
  const prCount = user.pullRequests.totalCount;
  const issueCount = user.issues.totalCount;
  const totalRepos = user.repositories.totalCount + user.repositoriesContributedTo.totalCount;
  const totalStars = user.repositories.nodes.reduce((acc, node) => acc + node.stargazerCount, 0);
  const followerCount = user.followers.totalCount;

  const buildStat = (code: string, name: string, value: number, thresholds: number[]): RpgStat => {
    const { grade, progress, color } = calculateGrade(value, thresholds, theme);
    return { code, name, value, grade, progress, color };
  };

  const stats: RpgStat[] = [
    buildStat('STR', 'Commits', commitCount, RANK_THRESHOLDS.STR),
    buildStat('AGI', 'PRs', prCount, RANK_THRESHOLDS.AGI),
    buildStat('INT', 'Issues', issueCount, RANK_THRESHOLDS.INT),
    buildStat('VIT', 'Repos', totalRepos, RANK_THRESHOLDS.VIT),
    buildStat('LUK', 'Stars', totalStars, RANK_THRESHOLDS.LUK),
    buildStat('CHA', 'Followers', followerCount, RANK_THRESHOLDS.CHA),
  ];

  const levelData = calculateOverallLevel(commitCount, prCount, issueCount, totalRepos, totalStars, followerCount);
  const quest = generateQuest(user.repositories.nodes);
  const calendar = user.contributionsCollection.contributionCalendar;
  const mana = calculateMana(calendar.weeks);
  const contributions = analyzeContributions(calendar.weeks, commitCount, calendar.totalContributions, theme);

  const langMap = new Map<string, { size: number; color: string }>();
  let totalLanguageSize = 0;
  for (const repo of user.repositories.nodes) {
    const edges = repo.languages?.edges || [];
    for (const edge of edges) {
      totalLanguageSize += edge.size;
      const existing = langMap.get(edge.node.name) || { size: 0, color: edge.node.color };
      langMap.set(edge.node.name, { size: existing.size + edge.size, color: edge.node.color });
    }
  }

  const topLanguages = Array.from(langMap.entries())
    .map(([name, d]) => ({ name, color: d.color || '#888', percent: Number(((d.size / (totalLanguageSize || 1)) * 100).toFixed(1)) }))
    .sort((a, b) => b.percent - a.percent)
    .slice(0, 4);

  const jobClass = awakenClass(topLanguages[0]?.name || 'Unknown');

  return {
    username: user.login,
    isAdmin: false,
    level: levelData.level,
    exp: levelData.exp,
    nextExp: levelData.nextExp,
    rank: levelData.overallRank,
    jobClass,
    stats,
    quest,
    topLanguages,
    mana,
    contributions,
  };
};