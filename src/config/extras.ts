import type { BannerStyle, CareerEntry, ExtrasConfig, Quote, SocialLink } from '../domain/types.js';
import { SOCIAL_ICONS } from '../presentation/svg/brandIcons.js';

/** Link types drawn with our own glyphs because there is no brand icon for them. */
export const GENERIC_LINKS = ['website', 'email', 'linkedin', 'codepen', 'link'] as const;

export interface RawExtras {
  socials?: unknown;
  banner?: unknown;
  bio?: unknown;
  arsenal?: unknown;
  spotlight?: unknown;
  feeds?: unknown;
  quotes?: unknown;
  career?: unknown;
  cv?: unknown;
}

export const EMPTY_EXTRAS: ExtrasConfig = {
  socials: [],
  banner: { lines: [], style: 'auto' },
  bio: {},
  arsenal: [],
  spotlight: [],
  feeds: [],
  quotes: 'builtin',
  career: [],
  cv: null,
};

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isHttps = (url: string): boolean => {
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
};

const strings = (value: unknown, field: string, max: number, maxLength: number, problems: string[]): string[] => {
  if (value === undefined) return [];
  if (!Array.isArray(value) || !value.every((v) => typeof v === 'string')) {
    problems.push(`"${field}" must be a list of text.`);
    return [];
  }
  if (value.length > max) problems.push(`"${field}" takes at most ${max} entries.`);
  const long = value.find((v) => v.length > maxLength);
  if (long) problems.push(`"${field}" entries must be ${maxLength} characters or fewer ("${long.slice(0, 30)}…").`);
  return value.slice(0, max).map((v) => v.trim()).filter(Boolean);
};

/** Validates the optional profile extras; every problem is reported, valid parts are kept. */
export const resolveExtras = (input: RawExtras, problems: string[]): ExtrasConfig => {
  const socials: SocialLink[] = [];
  if (input.socials !== undefined) {
    if (!Array.isArray(input.socials)) problems.push('"socials" must be a list of { "type", "url" }.');
    else {
      for (const [i, s] of input.socials.slice(0, 12).entries()) {
        if (!isRecord(s) || typeof s.type !== 'string' || typeof s.url !== 'string') {
          problems.push(`"socials"[${i}] needs "type" and "url".`);
          continue;
        }
        const type = s.type.toLowerCase();
        const known = type in SOCIAL_ICONS || (GENERIC_LINKS as readonly string[]).includes(type);
        if (!known) problems.push(`"socials"[${i}].type "${s.type}" has no icon. Use a simple-icons slug such as youtube, x, discord, or one of: ${GENERIC_LINKS.join(', ')}.`);
        const urlOk = type === 'email' ? /^mailto:[^\s@]+@[^\s@]+$/.test(s.url) : isHttps(s.url);
        if (!urlOk) problems.push(`"socials"[${i}].url must be ${type === 'email' ? 'a mailto: address' : 'an https:// link'}.`);
        if (known && urlOk) socials.push({ type, url: s.url, ...(typeof s.label === 'string' ? { label: s.label.slice(0, 24) } : {}) });
      }
      if (input.socials.length > 12) problems.push('"socials" takes at most 12 links.');
    }
  }

  let banner = EMPTY_EXTRAS.banner;
  if (input.banner !== undefined) {
    if (!isRecord(input.banner)) problems.push('"banner" must be { "lines": [...], "style": "auto" | "typewriter" | "glitch" | "system" }.');
    else {
      const style = input.banner.style ?? 'auto';
      const styles = ['auto', 'typewriter', 'glitch', 'system'] as const;
      const known = (styles as readonly unknown[]).includes(style);
      if (!known) problems.push('"banner.style" must be auto, typewriter, glitch or system.');
      banner = { lines: strings(input.banner.lines, 'banner.lines', 6, 70, problems), style: known ? (style as BannerStyle) : 'auto' };
    }
  }

  const career: CareerEntry[] = [];
  if (input.career !== undefined) {
    if (!Array.isArray(input.career)) problems.push('"career" must be a list of { "role", "org", "years", "current" }.');
    else {
      for (const [i, c] of input.career.slice(0, 6).entries()) {
        if (!isRecord(c) || typeof c.role !== 'string' || !c.role.trim()) {
          problems.push(`"career"[${i}] needs a "role".`);
          continue;
        }
        const field = (v: unknown, name: string): string => {
          if (v === undefined) return '';
          if (typeof v !== 'string' || v.length > 40) problems.push(`"career"[${i}].${name} must be text of 40 characters or fewer.`);
          return typeof v === 'string' ? v.trim().slice(0, 40) : '';
        };
        career.push({ role: c.role.trim().slice(0, 40), org: field(c.org, 'org'), years: field(c.years, 'years'), current: c.current === true });
      }
      if (input.career.length > 6) problems.push('"career" takes at most 6 entries.');
    }
  }

  let cv: string | null = null;
  if (input.cv !== undefined && input.cv !== null && input.cv !== '') {
    const ok = typeof input.cv === 'string' && (isHttps(input.cv) || /^[\w./-]+\.(pdf|md|html|docx?)$/i.test(input.cv)) && !input.cv.includes('..');
    if (!ok) problems.push('"cv" must be a file in your repository such as "cv.pdf", or an https:// link.');
    else cv = input.cv as string;
  }

  const bio: ExtrasConfig['bio'] = {};
  if (input.bio !== undefined) {
    if (!isRecord(input.bio)) problems.push('"bio" must be an object with role, location, focus and about.');
    else {
      for (const key of ['role', 'location', 'focus', 'about'] as const) {
        const v = input.bio[key];
        if (v === undefined) continue;
        const limit = key === 'about' ? 220 : 60;
        if (typeof v !== 'string' || v.length > limit) problems.push(`"bio.${key}" must be text of ${limit} characters or fewer.`);
        else bio[key] = v.trim();
      }
    }
  }

  const feeds = strings(input.feeds, 'feeds', 4, 300, problems).filter((url) => {
    if (isHttps(url)) return true;
    problems.push(`"feeds" entries must be https:// links (got ${JSON.stringify(url)}).`);
    return false;
  });

  let quotes: ExtrasConfig['quotes'] = 'builtin';
  const isPool = (q: unknown): q is 'builtin' | 'dry' => q === 'builtin' || q === 'dry';
  if (input.quotes !== undefined) {
    const list = Array.isArray(input.quotes) ? input.quotes : null;
    const valid = list?.filter((q): q is Quote | 'builtin' | 'dry' => isPool(q) || (isRecord(q) && typeof q.text === 'string' && typeof q.author === 'string' && q.text.length <= 160));
    if (isPool(input.quotes)) quotes = input.quotes;
    else if (!list || !valid || valid.length !== list.length || valid.length === 0) problems.push('"quotes" must be "builtin", "dry", or a list mixing those with { "text" (up to 160 characters), "author" }.');
    else quotes = valid;
  }

  return {
    socials,
    banner,
    bio,
    arsenal: strings(input.arsenal, 'arsenal', 24, 40, problems),
    spotlight: strings(input.spotlight, 'spotlight', 6, 140, problems),
    feeds,
    quotes,
    career,
    cv,
  };
};
