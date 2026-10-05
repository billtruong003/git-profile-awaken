import { STAT_CODES, type Player, type RawProfile, type StatCode } from '../domain/types.js';
import { summarizeActivity } from './activity.js';
import { equipTitle, evaluateAchievements } from './achievements.js';
import { awakenClass } from './classes.js';
import { buildStat, levelFor, overallRank } from './ranks.js';

export const buildPlayer = (raw: RawProfile, wantedTitle: string): Player => {
  const values: Record<StatCode, number> = {
    STR: raw.lifetimeCommits,
    AGI: raw.pullRequests,
    INT: raw.issues,
    VIT: raw.year.activeRepos,
    LUK: raw.stars,
    CHA: raw.followers,
  };
  const stats = STAT_CODES.map((code) => buildStat(code, values[code]));
  const activity = summarizeActivity(raw.year.calendar);
  const achievements = evaluateAchievements(raw, activity);
  const raidsMerged = raw.raids.reduce((sum, r) => sum + r.merged, 0);

  const exp =
    raw.lifetimeCommits * 10 +
    raw.pullRequests * 40 +
    raidsMerged * 120 +
    raw.lifetimeReviews * 30 +
    raw.issues * 25 +
    raw.year.activeRepos * 60 +
    raw.stars * 20 +
    raw.followers * 30;

  const overall = overallRank(stats);
  return {
    raw,
    ...levelFor(exp),
    overall: overall.rank,
    overallPercentile: overall.percentile,
    jobClass: awakenClass(raw.languages[0]?.name),
    stats,
    achievements,
    equippedTitle: equipTitle(achievements, wantedTitle),
    activity,
  };
};
