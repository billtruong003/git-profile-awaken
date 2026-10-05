import { GRADES, type RankGrade, type Stat, type StatCode } from '../domain/types.js';

/**
 * Provisional thresholds: the value needed to enter D, C, B, A, S, SS, SSS and EX.
 * They stand in for a percentile model until enough profiles have been sampled.
 */
export const THRESHOLDS: Record<StatCode, readonly number[]> = {
  STR: [50, 200, 500, 1000, 2500, 5000, 10000, 25000],
  AGI: [5, 20, 50, 100, 250, 500, 1000, 2500],
  INT: [5, 15, 40, 100, 250, 500, 1000, 2000],
  VIT: [3, 6, 10, 20, 35, 60, 100, 150],
  LUK: [10, 50, 200, 500, 1000, 5000, 20000, 100000],
  CHA: [10, 50, 150, 500, 1000, 5000, 20000, 100000],
};

export const SOURCES: Record<StatCode, string> = {
  STR: 'Commits',
  AGI: 'Pull Requests',
  INT: 'Issues opened',
  VIT: 'Active repos',
  LUK: 'Stars earned',
  CHA: 'Followers',
};

const WEIGHTS: Record<StatCode, number> = { STR: 2, AGI: 1.5, INT: 1, VIT: 1, LUK: 1.5, CHA: 1 };

export const gradeIndex = (rank: RankGrade): number => GRADES.indexOf(rank);

export const buildStat = (code: StatCode, value: number): Stat => {
  const steps = THRESHOLDS[code];
  const index = steps.findIndex((at) => value < at);
  if (index === -1) {
    return { code, source: SOURCES[code], value, rank: 'EX', progress: 1, next: null };
  }
  const floor = index === 0 ? 0 : steps[index - 1]!;
  const ceiling = steps[index]!;
  return {
    code,
    source: SOURCES[code],
    value,
    rank: GRADES[index]!,
    progress: Math.min(1, Math.max(0, (value - floor) / (ceiling - floor))),
    next: { rank: GRADES[index + 1]!, at: ceiling },
  };
};

/** Weighted mean of the six tiers, rounded down. */
export const overallRank = (stats: Stat[]): RankGrade => {
  let sum = 0;
  let weight = 0;
  for (const stat of stats) {
    sum += gradeIndex(stat.rank) * WEIGHTS[stat.code];
    weight += WEIGHTS[stat.code];
  }
  return GRADES[Math.floor(sum / weight)] ?? 'E';
};

/** EXP grows with every kind of contribution; levels follow a square-root curve. */
export const levelFor = (exp: number): { level: number; exp: number; nextExp: number } => {
  const level = Math.floor(Math.sqrt(exp / 100)) + 1;
  const floor = (level - 1) ** 2 * 100;
  const ceiling = level ** 2 * 100;
  return { level, exp: exp - floor, nextExp: ceiling - floor };
};
