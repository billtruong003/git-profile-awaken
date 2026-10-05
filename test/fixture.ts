import type { CalendarDay, Extras, ExtrasConfig, RawProfile } from '../src/domain/types.js';

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
  days: Array.from({ length: 9 }, (_, i) => {
    const date = new Date(Date.UTC(2026, 9, 5) - i * 864e5);
    return { date: date.toISOString().slice(0, 10), weekday: date.getUTCDay(), contributions: [2, 4, 0, 6, 1, 3, 5, 2, 0][i]!, commits: [2, 3, 0, 5, 1, 3, 4, 2, 0][i]!, repos: [1, 2, 0, 2, 1, 1, 3, 1, 0][i]!, issues: i === 1 ? 1 : 0, stars: i === 3 ? 2 : 0 };
  }),
  closes: { quickdraws: 2, unreviewedMerges: 12, sampled: 40 },
  fetchedAt: '2026-10-05T12:00:00Z',
  ...overrides,
});

/** Everything a player can fill in, so every widget has something to draw. */
export const fullConfig = {
  username: 'player-one',
  socials: [{ type: 'youtube', url: 'https://youtube.com/@x' }, { type: 'email', url: 'mailto:me@example.com' }, { type: 'website', url: 'https://example.com' }],
  banner: { lines: ['Player one has logged in.', 'Unity developer & <teacher>'] },
  bio: { role: 'Game developer', location: 'Vietnam', about: 'Builds free tools for game developers and teaches programming at night.' },
  arsenal: ['Unity', 'C#', 'Blender', 'Photoshop', 'PostgreSQL', 'Docker'],
  career: [{ role: 'Unity developer', org: 'Studio', years: '2024 – now', current: true }, { role: 'Instructor', org: 'School', years: '2022 – 2024' }],
  cv: 'cv.pdf',
};

export const fullExtras = (config: ExtrasConfig): Extras => ({
  config,
  arsenal: [{ name: 'Unity', slug: 'unity' }, { name: 'C#', slug: 'dotnet' }, { name: 'Blender', slug: 'blender' }, { name: 'Photoshop', slug: null }, { name: 'PostgreSQL', slug: 'postgresql' }, { name: 'Docker', slug: 'docker' }],
  spotlight: [
    { owner: 'player-one', name: 'KeyStream', description: 'A reverse proxy & <cache> for API keys that keeps going for a long time so it wraps.', stars: 37, forks: 15, language: { name: 'JavaScript', color: '#f1e05a' }, pushedAt: '2026-02-02T00:00:00Z' },
    { owner: 'player-one', name: 'Outline', description: '', stars: 4, forks: 1, language: null, pushedAt: '2026-02-13T00:00:00Z' },
  ],
  feed: [{ title: 'Unity VR in 10 minutes', url: 'https://www.youtube.com/watch?v=abc', date: '2026-09-30T12:00:00.000Z', source: 'Bill The Dev' }],
  quote: { text: 'A ship in port is safe, but that is not what ships are built for.', author: 'Grace Hopper' },
  events: [
    { kind: 'level', subject: 'Level', from: '13', to: '14', at: '2026-10-05T12:00:00Z' },
    { kind: 'overall', subject: 'Overall rank', from: 'S', to: 'SS', at: '2026-10-05T12:00:00Z' },
    { kind: 'achievement', subject: 'night-owl', from: '1', to: '2', at: '2026-10-03T12:00:00Z' },
  ],
});
