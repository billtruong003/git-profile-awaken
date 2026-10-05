import { LAYOUT_IDS, WIDGET_IDS, type AwakenConfig, type WidgetId } from '../domain/types.js';
import { isValidGithubUsername } from '../infrastructure/sanitizer.js';
import { THEME_IDS } from '../presentation/theme/themes.js';
import { ACHIEVEMENTS } from '../application/achievements.js';
import { EMPTY_EXTRAS, resolveExtras, type RawExtras } from './extras.js';

export interface FileConfig extends Partial<Omit<AwakenConfig, 'widgets' | 'extras' | 'bento'>>, RawExtras {
  widgets?: string[];
  bento?: unknown;
  /** Fetch commit times for the Hunting Hours clock and the hour-based achievements. */
  hours?: boolean;
}

export const DEFAULTS: AwakenConfig & { hours: boolean } = {
  username: '',
  theme: 'solo_leveling',
  title: 'auto',
  activity: 'arise',
  icons: 'rune',
  motion: 'full',
  timezone: 'UTC',
  layout: 'default',
  bento: null,
  widgets: ['hunter', 'status', 'achievements', 'activity', 'quest', 'skills', 'contribution', 'combat', 'hours', 'daily', 'runes'],
  outDir: 'awaken',
  readme: 'README.md',
  extras: EMPTY_EXTRAS,
  hours: true,
};

const oneOf = <T extends string>(value: unknown, allowed: readonly T[], field: string, problems: string[]): T | undefined => {
  if (value === undefined || value === '') return undefined;
  if (typeof value === 'string' && (allowed as readonly string[]).includes(value)) return value as T;
  problems.push(`"${field}" must be one of: ${allowed.join(', ')} (got ${JSON.stringify(value)}).`);
  return undefined;
};

const validTimeZone = (zone: string): boolean => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
};

const resolveBento = (value: unknown, problems: string[]): WidgetId[][] | null => {
  if (value === undefined || value === null) return null;
  const ok = Array.isArray(value) && value.length > 0 && value.length <= 10
    && value.every((row) => Array.isArray(row) && row.length > 0 && row.length <= 4 && row.every((id) => (WIDGET_IDS as readonly unknown[]).includes(id)));
  if (!ok) {
    problems.push(`"bento" must be up to 10 rows of 1 to 4 widget ids, e.g. [["hunter"], ["bio", "career"]]. Known widgets: ${WIDGET_IDS.join(', ')}.`);
    return null;
  }
  return value as WidgetId[][];
};

/** Merges file config over defaults and reports every invalid field at once instead of failing on the first. */
export const resolveConfig = (input: FileConfig): { config: AwakenConfig & { hours: boolean }; problems: string[] } => {
  const problems: string[] = [];
  const username = input.username ?? '';
  if (!isValidGithubUsername(username)) problems.push(`"username" must be a GitHub username (got ${JSON.stringify(username)}).`);

  const titleIds = ['auto', ...ACHIEVEMENTS.map((a) => a.id)];
  const widgets = input.widgets?.filter((w): w is WidgetId => {
    const ok = (WIDGET_IDS as readonly string[]).includes(w);
    if (!ok) problems.push(`Unknown widget "${w}". Known widgets: ${WIDGET_IDS.join(', ')}.`);
    return ok;
  });
  const timezone = input.timezone && validTimeZone(input.timezone) ? input.timezone : undefined;
  if (input.timezone && !timezone) problems.push(`"timezone" must be an IANA zone such as "Asia/Ho_Chi_Minh" (got ${JSON.stringify(input.timezone)}).`);

  const config = {
    ...DEFAULTS,
    username,
    theme: oneOf(input.theme, THEME_IDS, 'theme', problems) ?? DEFAULTS.theme,
    title: oneOf(input.title, titleIds, 'title', problems) ?? DEFAULTS.title,
    activity: oneOf(input.activity, ['arise', 'raid'] as const, 'activity', problems) ?? DEFAULTS.activity,
    icons: oneOf(input.icons, ['rune', 'brand'] as const, 'icons', problems) ?? DEFAULTS.icons,
    motion: oneOf(input.motion, ['full', 'calm', 'none'] as const, 'motion', problems) ?? DEFAULTS.motion,
    timezone: timezone ?? DEFAULTS.timezone,
    // A widget list without a layout keeps working the way it did before layouts existed.
    layout: oneOf(input.layout, LAYOUT_IDS, 'layout', problems) ?? (widgets?.length ? 'custom' : DEFAULTS.layout),
    widgets: widgets?.length ? widgets : DEFAULTS.widgets,
    bento: resolveBento(input.bento, problems),
    outDir: input.outDir ?? DEFAULTS.outDir,
    readme: input.readme === null ? null : input.readme ?? DEFAULTS.readme,
    hours: input.hours ?? DEFAULTS.hours,
    extras: resolveExtras(input, problems),
  };
  return { config, problems };
};
