import type { ProgressEvent, RankGrade } from '../domain/types.js';

/** What the previous run saved in player.json, as far as progress is concerned. */
export interface Snapshot {
  level: number;
  overall: RankGrade;
  stats: { code: string; rank: RankGrade }[];
  achievements: { id: string; tier: number }[];
  events?: ProgressEvent[];
}

const KEEP_DAYS = 7;
const KEEP_EVENTS = 8;

/**
 * Compares this run with the last one and returns the recent history of level-ups, rank-ups and unlocked
 * tiers: new events first, then earlier ones still younger than a week.
 */
export const diffProgress = (previous: Snapshot | null, current: Snapshot, nowIso: string): ProgressEvent[] => {
  if (!previous) return [];
  const at = nowIso;
  const fresh: ProgressEvent[] = [];
  if (current.level > previous.level) fresh.push({ kind: 'level', subject: 'Level', from: String(previous.level), to: String(current.level), at });
  if (current.overall !== previous.overall) fresh.push({ kind: 'overall', subject: 'Overall rank', from: previous.overall, to: current.overall, at });
  for (const stat of current.stats) {
    const before = previous.stats.find((s) => s.code === stat.code);
    if (before && before.rank !== stat.rank) fresh.push({ kind: 'stat', subject: stat.code, from: before.rank, to: stat.rank, at });
  }
  for (const a of current.achievements) {
    const before = previous.achievements.find((x) => x.id === a.id)?.tier ?? 0;
    if (a.tier > before) fresh.push({ kind: 'achievement', subject: a.id, from: String(before), to: String(a.tier), at });
  }
  const cutoff = Date.parse(nowIso) - KEEP_DAYS * 864e5;
  const older = (previous.events ?? []).filter((e) => Date.parse(e.at) >= cutoff);
  return [...fresh, ...older].slice(0, KEEP_EVENTS);
};
