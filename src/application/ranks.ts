import { GRADES, type RankGrade, type Stat, type StatCode } from '../domain/types.js';
import { compositePercentile, compositeScore, LADDER, percentileOf, valueAt, type Population } from './population.js';
import { POPULATION } from './populationData.js';

export const SOURCES: Record<StatCode, string> = {
  STR: 'Commits',
  AGI: 'Pull Requests',
  INT: 'Issues opened',
  VIT: 'Active repos',
  LUK: 'Stars earned',
  CHA: 'Followers',
};

export const gradeIndex = (rank: RankGrade): number => GRADES.indexOf(rank);

/** The rank for a percentile, and how far it is through that rank (0–1). */
export const rankForPercentile = (p: number): { rank: RankGrade; progress: number; index: number } => {
  const index = LADDER.findIndex((bound) => p < bound);
  if (index === -1) return { rank: 'EX', progress: 1, index: GRADES.length - 1 };
  const lower = index === 0 ? 0 : LADDER[index - 1]!;
  return { rank: GRADES[index]!, progress: Math.min(1, Math.max(0, (p - lower) / (LADDER[index]! - lower))), index };
};

/**
 * A stat's rank is where the player stands among regular GitHub players (10+ contributions in the past
 * year): E below the 40th percentile up to EX in the top 0.05%. `next.at` is the value that reaches the
 * next rank.
 */
export const buildStat = (code: StatCode, value: number, population: Population = POPULATION): Stat => {
  const distribution = population.stats[code];
  const percentile = percentileOf(value, distribution);
  const { rank, progress, index } = rankForPercentile(percentile);
  const next = rank === 'EX'
    ? null
    : { rank: GRADES[index + 1]!, at: Math.max(value + 1, valueAt(LADDER[index]!, distribution)) };
  return { code, source: SOURCES[code], value, rank, progress, next, percentile };
};

/** The overall rank ranks the weighted mean of the six percentiles against the same players. */
export const overallRank = (stats: Stat[], population: Population = POPULATION): { rank: RankGrade; percentile: number } => {
  const score = compositeScore(Object.fromEntries(stats.map((s) => [s.code, s.percentile])) as Record<StatCode, number>);
  const percentile = compositePercentile(score, population.composite);
  return { rank: rankForPercentile(percentile).rank, percentile };
};

/** EXP grows with every kind of contribution; levels follow a square-root curve. */
export const levelFor = (exp: number): { level: number; exp: number; nextExp: number } => {
  const level = Math.floor(Math.sqrt(exp / 100)) + 1;
  const floor = (level - 1) ** 2 * 100;
  const ceiling = level ** 2 * 100;
  return { level, exp: exp - floor, nextExp: ceiling - floor };
};
