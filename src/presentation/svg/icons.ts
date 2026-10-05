/**
 * Hand-drawn glyphs on a 16x16 grid. Each is a single filled path (even-odd for cut-outs) so a
 * <use> can tint it with one fill.
 */
export const ICONS: Record<string, string> = {
  // Activity: ARISE
  knight: 'M8 1C4.7 1 3 3.4 3 6.5V13l2 2h6l2-2V6.5C13 3.4 11.3 1 8 1ZM4.8 7h6.4v1.4H8.7V11H7.3V8.4H4.8Z',
  marshal: 'M2.2 0.8 5 3.4C5.9 2.6 6.9 2.2 8 2.2s2.1.4 3 1.2L13.8.8 13.3 6.6V13l-2.2 2.2H4.9L2.7 13V6.6ZM4.6 7.4h6.8v1.4H8.7v2.6H7.3V8.8H4.6Z',
  // Activity: Dungeon Raid
  slime: 'M1.5 14C1.5 8.6 4.6 5 8 5s6.5 3.6 6.5 9ZM5 9h1.6v1.8H5Zm4.4 0H11v1.8H9.4Z',
  imp: 'M2.5 1.5 5.4 6h5.2l2.9-4.5V9c0 3.5-2.5 6-5.5 6s-5.5-2.5-5.5-6ZM5.2 8.6l2 .8v1.2l-2-.6Zm5.6 0v1.4l-2 .6V9.4Z',
  demon: 'M8 1C4 1 2 3.8 2 7c0 2 1 3.5 2.5 4.3V14h7v-2.7C13 10.5 14 9 14 7c0-3.2-2-6-6-6ZM5 6h2v2.5H5Zm4 0h2v2.5H9ZM7.3 11h1.4v2H7.3Z',
  boss: 'M2.5 4 4.5 1 8 3l3.5-2 2 3V8c0 1.6-.8 2.9-2 3.6V14h-7v-2.4c-1.2-.7-2-2-2-3.6ZM5 6.5h2V9H5Zm4 0h2V9H9Z',
  // Achievements and skills
  sword: 'M13.5 1 15 2.5 7 10.5 5.5 9ZM4 9.5 6.5 12l-1.3 1.3-.9-.9-1.9 1.9-.7-.7 1.9-1.9-.9-.9Z',
  flame: 'M8 1c1 3 4 4.5 4 8.5 0 3-1.8 5.5-4 5.5S4 12.5 4 9.5c0-2 1-3 1.6-4.3.4 1.4 1 2.2 1.8 2.4C7 5.2 7.4 3 8 1Z',
  moon: 'M10.5 1.5A6.5 6.5 0 1 0 14.5 11a5.5 5.5 0 1 1-4-9.5Z',
  sun: 'M8 4.5a3.5 3.5 0 1 1-.01 0ZM7.25 0h1.5v3h-1.5Zm0 13h1.5v3h-1.5ZM0 7.25h3v1.5H0Zm13 0h3v1.5h-3ZM2.1 3.2l1.1-1.1 2.1 2.1-1.1 1.1Zm8.6 8.6 1.1-1.1 2.1 2.1-1.1 1.1ZM2.1 12.8l2.1-2.1 1.1 1.1-2.1 2.1Zm8.6-8.6 2.1-2.1 1.1 1.1-2.1 2.1Z',
  shield: 'M8 1l6 2v5c0 3.5-2.5 6-6 7-3.5-1-6-3.5-6-7V3Z',
  gate: 'M2 15V6c0-3 2.7-5 6-5s6 2 6 5v9h-3V7c0-1.7-1.3-3-3-3S5 5.3 5 7v8Z',
  swords: 'M1.5 2.5l1-1L9 8l-1 1Zm13 0-1-1L7 8l1 1ZM3.5 11 5 12.5 2.5 15 1 13.5Zm9 0L11 12.5l2.5 2.5 1.5-1.5Z',
  target: 'M8 1a7 7 0 1 0 .01 0Zm0 2.2a4.8 4.8 0 1 1-.01 0Zm0 2.3a2.5 2.5 0 1 0 .01 0Z',
  cross: 'M6 1h4v5h5v4h-5v5H6v-5H1V6h5Z',
  scroll: 'M2 2h5c.6 0 1 .4 1 1v11c0-.6-.4-1-1-1H2Zm12 0H9c-.6 0-1 .4-1 1v11c0-.6.4-1 1-1h5Z',
  star: 'M8 1l2.1 4.6 4.9.5-3.7 3.3 1.1 4.9L8 11.8l-4.4 2.5 1.1-4.9L1 6.1l4.9-.5Z',
  beacon: 'M8 4.2a2 2 0 1 1-.01 0ZM3.8 1.5l1.1 1.1a4.5 4.5 0 0 0 0 6.8L3.8 10.5a6 6 0 0 1 0-9Zm8.4 0a6 6 0 0 1 0 9l-1.1-1.1a4.5 4.5 0 0 0 0-6.8ZM7.2 8h1.6v7H7.2Z',
  banner: 'M3 1h1.5v14H3ZM4.5 2H14l-2.5 3.5L14 9H4.5Z',
  hourglass: 'M3 1h10v2.5L9.5 8l3.5 4.5V15H3v-2.5L6.5 8 3 3.5Z',
  axe: 'M6 1h1.5v14H6Zm1.5 1c3.5 0 6.5 1.5 6.5 5s-3 5-6.5 5Z',
  calendar: 'M1.5 2.5h13v12h-13ZM3 6.5v6.5h10V6.5Zm1.6 3.1 1-1 1.4 1.4 3.4-3.4 1 1-4.4 4.4Z',
  lock: 'M4 7V5a4 4 0 0 1 8 0v2h1v8H3V7Zm1.8 0h4.4V5a2.2 2.2 0 0 0-4.4 0Z',
  // Skill runes by class
  orb: 'M8 1a7 7 0 1 0 .01 0Zm0 2a5 5 0 1 1-.01 0Zm0 2.5a2.5 2.5 0 1 0 .01 0Z',
  nut: 'M8 1l6 3.5v7L8 15l-6-3.5v-7Zm0 4.5a2.5 2.5 0 1 0 .01 0Z',
  crystal: 'M8 1l5 5-5 9-5-9Zm0 2.4L5.4 6 8 10.8 10.6 6Z',
  wing: 'M14 2C8 2 3 6 2 14c2-4 5-6 8-7-2 2-4 4-5 7 5-2 9-6 9-12Z',
  prism: 'M8 1l7 13H1Zm0 4L4.4 12h7.2Z',
  terminal: 'M2 3l6 5-6 5v-2l3.6-3L2 5Zm6 9h6v1.6H8Z',
  lambda: 'M3 15l4-8-1.5-5H8l5 12h-2L8.6 9l-3.3 6Z',
  scales: 'M7.2 1h1.6v12H12v2H4v-2h3.2ZM1 7l2.5-4L6 7a2.5 2.5 0 0 1-5 0Zm9 0 2.5-4L15 7a2.5 2.5 0 0 1-5 0Z',
  rune: 'M8 1l7 7-7 7-7-7Zm0 3.5L4.5 8 8 11.5 11.5 8Z',
};

/** The rune each class wields; also the skill icon for every language of that class. */
export const CLASS_RUNE: Record<string, string> = {
  'Blade Master': 'sword',
  'Grand Magus': 'orb',
  'Holy Knight': 'shield',
  Necromancer: 'nut',
  Illusionist: 'crystal',
  Alchemist: 'flame',
  Ranger: 'wing',
  Runesmith: 'prism',
  Summoner: 'orb',
  Warden: 'terminal',
  Oracle: 'lambda',
  Arbiter: 'scales',
  Novice: 'rune',
};

export const symbol = (id: string, path: string, viewBox = '0 0 16 16'): string =>
  `<symbol id="i-${id}" viewBox="${viewBox}"><path fill-rule="evenodd" d="${path}"/></symbol>`;
