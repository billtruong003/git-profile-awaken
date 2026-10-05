import type { CalendarDay, RawProfile } from '../src/domain/types.js';

/** A year of days ending 2026-10-05 (a Monday), with a repeating, known pattern. */
export const calendar = (pattern: (i: number) => number = (i) => (i % 7 === 3 ? 0 : (i * 7) % 13)): CalendarDay[] => {
  const end = Date.UTC(2026, 9, 5);
  return Array.from({ length: 366 }, (_, k) => {
    const time = end - (365 - k) * 864e5;
    const date = new Date(time);
    return { date: date.toISOString().slice(0, 10), count: pattern(k), weekday: date.getUTCDay() };
  });
};

export const rawProfile = (overrides: Partial<RawProfile> = {}): RawProfile => ({
  login: 'player-one',
  name: 'Player One',
  createdAt: '2022-09-26T16:17:32Z',
  followers: 16,
  organizations: 7,
  ownedRepos: 139,
  stars: 93,
  pullRequests: 15,
  mergedPullRequests: 15,
  issues: 1,
  lifetimeCommits: 1169,
  lifetimeReviews: 0,
  year: { commits: 495, pullRequests: 8, reviews: 0, issues: 0, newRepos: 54, activeRepos: 41, calendar: calendar() },
  languages: [
    { name: 'C#', color: '#178600', percent: 64.7 },
    { name: 'ShaderLab', color: '#222c37', percent: 14.5 },
    { name: 'HTML', color: '#e34c26', percent: 5.4 },
    { name: 'C', color: '#555555', percent: 4.5 },
    { name: 'TypeScript', color: '#3178c6', percent: 3.2 },
  ],
  quest: { repo: 'ShapeWright', language: { name: 'Python', color: '#3572A5' }, createdAt: '2026-09-29T15:13:33Z', pushedAt: '2026-10-05T11:46:24Z', lastMessage: 'docs: add track W & <friends>', commits: 65 },
  raids: [{ repo: 'SummonGods/SpiritWar', stars: 0, merged: 3 }],
  commitHours: [23, 24, 26, 16, 18, 11, 4, 28, 45, 9, 22, 21, 26, 38, 19, 18, 21, 22, 18, 20, 9, 4, 12, 15],
  fetchedAt: '2026-10-05T12:00:00Z',
  ...overrides,
});
