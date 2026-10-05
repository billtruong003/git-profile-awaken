import type { AwakenConfig, BannerStyle, Extras, Player, ThemeMode, WidgetId } from '../../domain/types.js';
import { languageArsenal } from '../../application/arsenal.js';
import { BUILTIN_QUOTES, quoteOfTheDay } from '../../application/quotes.js';
import { EMPTY_EXTRAS } from '../../config/extras.js';
import { TECH_ICONS } from '../svg/brandIcons.js';
import { toSvg } from '../svg/document.js';
import type { Ctx, Rendered } from '../svg/kit.js';
import { resolveTheme } from '../theme/themes.js';
import { ariseWidget, dailyWidget, raidWidget } from './activity.js';
import { achievementsWidget, combatWidget, contributionWidget, hoursWidget, questWidget, skillsWidget } from './details.js';
import { arsenalWidget, bannerWidget, bioWidget, careerWidget, contactCard, cvRune, levelUpWidget, oracleWidget, questBoardWidget, spotlightCard } from './extras.js';
import { hunterCard, ladderWidget, statRune, statusWindow, statWebWidget } from './profile.js';

export interface WidgetFile {
  /** File stem without the theme suffix, e.g. "status" or "rune-str". */
  name: string;
  widget: WidgetId;
  svg: string;
  width: number;
  height: number;
  /** Where the image links to in the README (a repository, a contact, the CV). */
  href?: string;
}

export interface Piece {
  name: string;
  rendered: Rendered;
  href?: string;
}

export interface RenderOptions {
  /** The layout's banner style when the config says "auto". */
  bannerStyle?: Exclude<BannerStyle, 'auto'>;
}

/** Extras for players rendered without the Action (the public server): the quote of the day and nothing to fill in. */
export const extrasOf = (p: Player): Extras =>
  p.extras ?? {
    config: EMPTY_EXTRAS,
    arsenal: [],
    spotlight: [],
    feed: [],
    quote: quoteOfTheDay(BUILTIN_QUOTES, p.raw.login, p.raw.fetchedAt),
    events: [],
  };

const languageItems = (p: Player) => languageArsenal(p.raw.languages.map((l) => l.name), (slug) => slug in TECH_ICONS);

/**
 * Every image a widget id produces. Widgets that need data the player has not given (no socials, no feeds,
 * no changes since the last run) produce nothing, so a layout can list them without leaving holes.
 */
export const renderPieces = (id: WidgetId, ctx: Ctx, p: Player, config: AwakenConfig, o: RenderOptions = {}): Piece[] => {
  const extras = extrasOf(p);
  switch (id) {
    case 'hunter': return [{ name: 'hunter', rendered: hunterCard(ctx, p) }];
    case 'status': return [{ name: 'status', rendered: statusWindow(ctx, p) }];
    case 'runes': return p.stats.map((s) => ({ name: `rune-${s.code.toLowerCase()}`, rendered: statRune(ctx, p, s) }));
    case 'ladder': return [{ name: 'ladder', rendered: ladderWidget(ctx, p) }];
    case 'web': return [{ name: 'web', rendered: statWebWidget(ctx, p) }];
    case 'quest': return [{ name: 'quest', rendered: questWidget(ctx, p, config.timezone) }];
    case 'skills': return [{ name: 'skills', rendered: skillsWidget(ctx, p) }];
    case 'contribution': return [{ name: 'contribution', rendered: contributionWidget(ctx, p) }];
    case 'achievements': return [{ name: 'achievements', rendered: achievementsWidget(ctx, p) }];
    case 'combat': return [{ name: 'combat', rendered: combatWidget(ctx, p) }];
    case 'hours': return [{ name: 'hours', rendered: hoursWidget(ctx, p, config.timezone) }];
    case 'activity': return [{ name: 'activity', rendered: config.activity === 'raid' ? raidWidget(ctx, p) : ariseWidget(ctx, p) }];
    case 'arise': return [{ name: 'arise', rendered: ariseWidget(ctx, p) }];
    case 'raid': return [{ name: 'raid', rendered: raidWidget(ctx, p) }];
    case 'daily': return [{ name: 'daily', rendered: dailyWidget(ctx, p, config.timezone) }];
    case 'oracle': return [{ name: 'oracle', rendered: oracleWidget(ctx, p, extras) }];
    case 'arsenal': return [{ name: 'arsenal', rendered: arsenalWidget(ctx, p, extras, languageItems(p)) }];
    case 'levelup': return extras.events.length ? [{ name: 'levelup', rendered: levelUpWidget(ctx, p, extras.events) }] : [];
    case 'spotlight': return extras.spotlight.slice(0, 4).map((repo, i) => ({ name: `spotlight-${i + 1}`, rendered: spotlightCard(ctx, p, repo), href: `https://github.com/${repo.owner}/${repo.name}` }));
    case 'banner': {
      const style = extras.config.banner.style === 'auto' ? o.bannerStyle ?? 'typewriter' : extras.config.banner.style;
      return [{ name: 'banner', rendered: bannerWidget(ctx, p, extras, style) }];
    }
    case 'contacts': return extras.config.socials.map((link, i) => ({ name: `contact-${i + 1}-${link.type}`, rendered: contactCard(ctx, link), href: link.url }));
    case 'bio': return Object.keys(extras.config.bio).length ? [{ name: 'bio', rendered: bioWidget(ctx, p, extras) }] : [];
    case 'career': return extras.config.career.length ? [{ name: 'career', rendered: careerWidget(ctx, p, extras), ...(extras.config.cv ? { href: extras.config.cv } : {}) }] : [];
    case 'cv': return extras.config.cv ? [{ name: 'cv', rendered: cvRune(ctx, p, extras.config.cv), href: extras.config.cv }] : [];
    case 'board': return extras.feed.length ? [{ name: 'board', rendered: questBoardWidget(ctx, p, extras), href: extras.feed[0]!.url }] : [];
  }
};

export const contextFor = (config: AwakenConfig, mode: ThemeMode): Ctx => {
  const theme = resolveTheme(config.theme);
  return { t: theme[mode], mode, motion: config.motion, icons: config.icons };
};

export const toFile = (ctx: Ctx, widget: WidgetId, piece: Piece): WidgetFile => ({
  name: piece.name,
  widget,
  svg: toSvg(ctx, piece.rendered),
  width: piece.rendered.width,
  height: piece.rendered.height,
  ...(piece.href ? { href: piece.href } : {}),
});

export const renderWidgets = (p: Player, config: AwakenConfig, mode: ThemeMode, only: WidgetId[] = config.widgets, o: RenderOptions = {}): WidgetFile[] => {
  const ctx = contextFor(config, mode);
  return only.flatMap((id) => renderPieces(id, ctx, p, config, o).map((piece) => toFile(ctx, id, piece)));
};
