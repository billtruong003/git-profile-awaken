import type { BannerStyle, Extras, Player, ProgressEvent, RankGrade, RepoCard, SocialLink } from '../../domain/types.js';
import { GRADES } from '../../domain/types.js';
import { monogram } from '../../application/arsenal.js';
import { escapeSvgText } from '../../infrastructure/sanitizer.js';
import { ACHIEVEMENTS } from '../../application/achievements.js';
import { SOCIAL_ICONS, TECH_ICONS } from '../svg/brandIcons.js';
import { cut, fit, fmt, footer, frame, glow, label, r, sigil, text, textWidth, TYPE, use, wrap, type Ctx, type Rendered } from '../svg/kit.js';

const synced = (p: Player): string => p.raw.fetchedAt.slice(0, 10);
const glowAttr = (ctx: Ctx, strong = false): string => (glow(ctx, strong) ? ` filter="${glow(ctx, strong)}"` : '');

/** A simple-icons logo (24 grid) drawn at `size`, or null when the catalog has no logo for the slug. */
const logo = (slug: string, x: number, y: number, size: number, fill: string): string | null => {
  const path = TECH_ICONS[slug]?.path ?? SOCIAL_ICONS[slug]?.path;
  return path ? `<path transform="translate(${r(x)} ${r(y)}) scale(${r(size / 24)})" d="${path}" fill="${fill}"/>` : null;
};

/** Small north-east arrow, drawn so it does not depend on a font glyph. */
const arrow = (x: number, y: number, color: string): string =>
  `<path d="M${r(x)} ${r(y - 8)}h7v7h-1.6v-4.3l-5.3 5.3-1.1-1.1 5.3-5.3h-4.3Z" fill="${color}"/>`;

const chevron = (x: number, y: number, color: string): string =>
  `<path d="M${r(x)} ${r(y - 9)}l6 5-6 5v-2.4l3.2-2.6-3.2-2.6Z" fill="${color}"/>`;

// ---------- Arsenal ----------

/** Catalog categories folded into a few inventory shelves, so a short list does not scatter over many rows. */
const SHELF: Record<string, string> = {
  'Game development': 'GAME · 3D', '3D, VFX and animation': 'GAME · 3D', Languages: 'LANGUAGES',
  Frontend: 'WEB', Backend: 'WEB', 'CMS and commerce': 'WEB', Mobile: 'MOBILE',
  'Cloud and DevOps': 'CLOUD · DATA', Databases: 'CLOUD · DATA', 'Data and AI': 'CLOUD · DATA',
  'Design and UI/UX': 'DESIGN · MEDIA', 'Audio and video': 'DESIGN · MEDIA',
  'Editors and tools': 'TOOLS', Testing: 'TOOLS', 'Operating systems': 'TOOLS',
  'Hardware and embedded': 'HARDWARE', 'Web3 and blockchain': 'WEB3',
};

type Item = { name: string; slug: string | null };

const slot = (ctx: Ctx, item: Item, x: number, y: number, size: number, equipped: boolean): string => {
  const { t } = ctx;
  const c = size > 50 ? 8 : 5;
  const inset = equipped ? 2 : 1;
  const icon = item.slug ? logo(item.slug, x + size * 0.26, y + size * 0.26, size * 0.48, t.ink) : null;
  const mark = icon ?? text(x + size / 2, y + size / 2 + size * 0.12, monogram(item.name), 'strong', t.muted, { anchor: 'middle', size: Math.round(size * 0.34) });
  return `<path d="${cut(x, y, size, size, c)}" fill="${equipped ? t.system : t.frame}"${equipped ? glowAttr(ctx) : ''}/>
<path d="${cut(x + inset, y + inset, size - inset * 2, size - inset * 2, c - inset * 0.6)}" fill="${t.void}"/>${mark}`;
};

/** Equipped = your top three languages; inventory = what you listed, grouped by category. */
export const arsenalWidget = (ctx: Ctx, p: Player, extras: Extras, languageItems: Item[]): Rendered => {
  const W = 840;
  const { t } = ctx;
  const equipped = languageItems.slice(0, 3);
  const listed = extras.arsenal.length ? extras.arsenal : languageItems.slice(3, 11);
  const groups = new Map<string, Item[]>();
  for (const item of listed) {
    const category = item.slug ? SHELF[TECH_ICONS[item.slug]?.category ?? ''] ?? 'TOOLS' : 'OTHER';
    groups.set(category, [...(groups.get(category) ?? []), item]);
  }
  const perRow = 8;
  const rows = [...groups].flatMap(([category, items]) =>
    Array.from({ length: Math.ceil(items.length / perRow) }, (_, i) => ({ category: i === 0 ? category : '', items: items.slice(i * perRow, (i + 1) * perRow) })));
  const H = Math.max(340, 56 + 22 + rows.length * 50 + 44);
  const f = frame(ctx, W, H, 'ARSENAL');
  const x0 = f.x + 268;
  const left = equipped.map((item, i) => {
    const x = f.x + i * 84;
    return `${slot(ctx, item, x, f.y + 20, 72, true)}${text(x + 36, f.y + 112, fit(item.name, 'caption', 80), 'caption', t.ink, { anchor: 'middle' })}`;
  }).join('');
  const inventory = rows.length
    ? rows.map((row, ri) => {
      const y = f.y + 22 + ri * 50;
      const name = row.category;
      return `${name ? text(x0, y + 24, fit(name, 'code', 90), 'code', t.muted) : ''}${row.items.map((item, i) => slot(ctx, item, x0 + 96 + i * 50, y, 40, false)).join('')}`;
    }).join('\n')
    : text(x0, f.y + 46, 'Add "arsenal" to awaken.json to fill the inventory.', 'body', t.muted);
  const body = `${f.svg}
${label(f.x, f.y + 6, 'Equipped', ctx)}
${left}
${text(f.x, f.y + 136, 'FROM YOUR TOP LANGUAGES', 'code', t.muted)}
${label(x0, f.y + 6, 'Inventory', ctx)}
${text(f.x + f.w, f.y + 6, `${listed.length} items`, 'caption', t.muted, { anchor: 'end' })}
${inventory}
${footer(ctx, p.raw.login, synced(p), W, H)}`;
  return {
    width: W, height: H, title: `${p.raw.login}: arsenal`,
    desc: `Equipped ${equipped.map((i) => i.name).join(', ') || 'nothing yet'}. Inventory: ${listed.map((i) => i.name).join(', ') || 'empty'}.`,
    body,
  };
};

// ---------- Repo Spotlight ----------

export const spotlightCard = (ctx: Ctx, p: Player, repo: RepoCard): Rendered => {
  const W = 420, H = 184;
  const { t } = ctx;
  const f = frame(ctx, W, H, null, { padX: 18 });
  const lines = repo.description ? wrap(repo.description, 'body', f.w, 2) : ['No description yet.'];
  const stars = fmt(repo.stars);
  const right = f.x + f.w;
  const lang = repo.language;
  const bottom = H - 26;
  const body = `${f.svg}
${text(f.x, f.y + 10, '[ SPOTLIGHT ]', 'label', t.system)}
${text(right, f.y + 10, stars, 'value', t.rank.S, { anchor: 'end', size: 13 })}
${use('star', right - textWidth(stars, 'value') * (13 / 14) - 18, f.y - 2, 13, t.rank.S)}
${text(f.x, f.y + 40, fit(repo.name, 'name', f.w), 'name', t.ink)}
${lines.map((line, i) => text(f.x, f.y + 62 + i * 18, line, 'body', t.muted, repo.description ? {} : { opacity: 0.6 })).join('')}
${lang ? `<circle cx="${f.x + 4}" cy="${bottom - 4}" r="4" fill="${lang.color}" stroke="${t.line}"/>${text(f.x + 14, bottom, fit(lang.name, 'caption', 130), 'caption', t.ink)}` : ''}
${text(f.x + 160, bottom, `${fmt(repo.forks)} FORKS`, 'code', t.muted)}
${text(right, bottom, `PUSHED ${repo.pushedAt.slice(0, 10)}`, 'code', t.muted, { anchor: 'end' })}`;
  return {
    width: W, height: H, title: `${repo.owner}/${repo.name}`,
    desc: `${repo.name}: ${repo.description || 'no description'}. ${repo.stars} stars, ${repo.forks} forks${lang ? `, ${lang.name}` : ''}.`,
    body, symbols: ['star'],
  };
};

// ---------- Guild Contacts ----------

const HANDLE = /^https?:\/\/(?:www\.)?[^/]+\/(?:@|in\/|users\/|u\/|c\/)?([^/?#]+)/;
const contactName = (type: string): string =>
  SOCIAL_ICONS[type]?.title ?? ({ website: 'Website', email: 'Email', linkedin: 'LinkedIn', codepen: 'CodePen', link: 'Link' } as Record<string, string>)[type] ?? type;

export const contactCard = (ctx: Ctx, link: SocialLink): Rendered => {
  const W = 200, H = 56;
  const { t } = ctx;
  const f = frame(ctx, W, H, null);
  const handle = link.label ?? (link.type === 'email' ? link.url.replace(/^mailto:/, '') : HANDLE.exec(link.url)?.[1] ?? new URL(link.url).hostname);
  const icon = logo(link.type, 21, 19, 18, t.ink);
  const generic = icon ? '' : use(link.type in { website: 1, email: 1, linkedin: 1, codepen: 1 } ? link.type : 'link', 21, 19, 18, t.ink);
  const body = `${f.svg}
<path d="${cut(14, 12, 32, 32, 5)}" fill="${t.void}"/>${icon ?? generic}
${text(56, 26, fit(contactName(link.type), 'strong', 112), 'strong', t.ink)}
${text(56, 41, fit(handle, 'code', 112), 'code', t.muted)}
${arrow(178, 33, t.system)}`;
  return { width: W, height: H, title: `${contactName(link.type)}: ${handle}`, desc: link.url, body, ...(icon ? {} : { symbols: [link.type in { website: 1, email: 1, linkedin: 1, codepen: 1 } ? link.type : 'link'] }) };
};

// ---------- System Banner ----------

let bannerSeq = 0;

export const bannerLines = (p: Player, extras: Extras): string[] =>
  extras.config.banner.lines.length
    ? extras.config.banner.lines
    : [`Player ${p.raw.login} has logged in.`, `${p.jobClass.name} · LV. ${p.level} · rank ${p.overall}`, ...(p.raw.languages[0] ? [`Main skill: ${p.raw.languages[0].name}`] : [])];

export const bannerWidget = (ctx: Ctx, p: Player, extras: Extras, style: Exclude<BannerStyle, 'auto'>): Rendered => {
  const W = 840, H = 140;
  const { t } = ctx;
  const f = frame(ctx, W, H, null, { padX: 24 });
  const lines = bannerLines(p, extras);
  const id = `bn${bannerSeq++}`;
  const meta = `LV. ${p.level} · RANK ${p.overall}`;
  let css = '';
  let middle: string;
  let header: string;

  if (style === 'glitch') {
    const big = (extras.config.banner.lines.length ? lines[0]! : p.raw.login).toUpperCase();
    const size = Math.min(44, Math.floor(f.w / (big.length * (0.62 + 6 / 44))));
    const bigText = (fill: string, cls = '') => `<text x="${f.x}" y="${f.y + 66}" class="hero${cls}" fill="${fill}" style="font-size:${size}px;letter-spacing:${Math.round(size / 7)}px">${escapeSvgText(big)}</text>`;
    const anim = ctx.motion === 'full';
    header = `${text(f.x, f.y + 10, '[ PLAYER ]', 'label', t.system)}${text(f.x + f.w, f.y + 10, meta, 'code', t.muted, { anchor: 'end' })}`;
    middle = `${bigText(t.ink)}${anim ? `<clipPath id="${id}a"><rect class="${id}ca" x="${f.x - 10}" y="${f.y + 20}" width="${f.w + 20}" height="14"/></clipPath><clipPath id="${id}b"><rect class="${id}cb" x="${f.x - 10}" y="${f.y + 20}" width="${f.w + 20}" height="12"/></clipPath>
<g clip-path="url(#${id}a)">${bigText(t.mana, ` ${id}ja`)}</g><g clip-path="url(#${id}b)">${bigText(t.alert, ` ${id}jb`)}</g>` : ''}
${text(f.x, f.y + 96, fit(lines[1] ?? '', 'body', f.w), 'body', t.muted)}`;
    if (anim) {
      css = `@media (prefers-reduced-motion:no-preference){
.${id}ca{animation:${id}ca 4s steps(1) infinite}.${id}cb{animation:${id}cb 4s steps(1) infinite}
.${id}ja{animation:${id}ja 4s steps(1) infinite}.${id}jb{animation:${id}jb 4s steps(1) infinite}
@keyframes ${id}ca{0%,86%,100%{transform:translateY(-200px)}88%{transform:translateY(4px)}91%{transform:translateY(30px)}94%{transform:translateY(18px)}}
@keyframes ${id}cb{0%,86%,100%{transform:translateY(-200px)}89%{transform:translateY(24px)}92%{transform:translateY(2px)}95%{transform:translateY(36px)}}
@keyframes ${id}ja{0%,86%,100%{transform:none}88%{transform:translateX(-4px)}91%{transform:translateX(4px)}94%{transform:translateX(-2px)}}
@keyframes ${id}jb{0%,86%,100%{transform:none}89%{transform:translateX(4px)}92%{transform:translateX(-4px)}95%{transform:translateX(3px)}}}`;
    }
  } else if (style === 'system') {
    header = `${text(f.x, f.y + 10, '[ SYSTEM ]', 'label', t.system)}${text(f.x + f.w, f.y + 10, meta, 'code', t.muted, { anchor: 'end' })}`;
    middle = lines.slice(0, 3).map((line, i) => `${chevron(f.x, f.y + 38 + i * 24, t.system)}${text(f.x + 16, f.y + 38 + i * 24, fit(line, 'value', f.w - 16), 'value', i === 0 ? t.ink : t.muted)}`).join('');
  } else {
    header = `${text(f.x, f.y + 10, '[ SYSTEM NOTIFICATION ]', 'label', t.system)}${text(f.x + f.w, f.y + 10, `SESSION ${synced(p)}`, 'code', t.muted, { anchor: 'end' })}`;
    const longest = Math.max(...lines.map((l) => l.length));
    const size = Math.min(24, Math.floor(f.w / (longest * 0.6)));
    const shown = ctx.motion === 'full' ? lines : lines.slice(0, 1);
    const cycle = 4 * shown.length;
    middle = shown.map((line, i) => {
      const w = line.length * size * 0.6 + 4;
      return `<clipPath id="${id}${i}"><rect class="${id}t${i}" x="${f.x}" y="${f.y + 22}" width="${r(w)}" height="${size + 14}"/></clipPath><text x="${f.x}" y="${f.y + 22 + size}" class="value" fill="${t.ink}" style="font-size:${size}px" clip-path="url(#${id}${i})">${escapeSvgText(line)}</text>`;
    }).join('');
    middle += `<rect class="${ctx.motion === 'none' ? '' : 'blink'}" x="${f.x}" y="${f.y + 76}" width="10" height="16" fill="${t.system}"${glowAttr(ctx)}/>${text(f.x + 20, f.y + 89, `@${p.raw.login} · ${meta}`, 'code', t.muted)}`;
    if (ctx.motion === 'full') {
      const pct = (s: number) => `${((s / cycle) * 100).toFixed(1)}%`;
      css = `@media (prefers-reduced-motion:no-preference){${shown.map((line, i) => `.${id}t${i}{transform-box:fill-box;transform-origin:left;animation:${id}k ${cycle}s steps(${Math.max(1, line.length)}) ${i * 4}s infinite both}`).join('')}
@keyframes ${id}k{0%{transform:scaleX(0)}${pct(1.5)}{transform:scaleX(1)}${pct(3.6)}{transform:scaleX(1)}${pct(3.8)},100%{transform:scaleX(0)}}
.blink{animation:blink 1s steps(1) infinite}@keyframes blink{0%,49%{opacity:1}50%,100%{opacity:0}}}`;
    } else if (ctx.motion === 'calm') {
      css = `@media (prefers-reduced-motion:no-preference){.${id}t0{transform-box:fill-box;transform-origin:left;animation:${id}k 1.6s steps(${Math.max(1, lines[0]!.length)}) .3s 1 both}@keyframes ${id}k{from{transform:scaleX(0)}to{transform:scaleX(1)}}
.blink{animation:blink 1s steps(1) 4}@keyframes blink{0%,49%{opacity:1}50%,100%{opacity:0}}}`;
    }
  }
  const body = `${f.svg}
${header}
${middle}`;
  return { width: W, height: H, title: `${p.raw.login}: system banner`, desc: lines.join(' / '), body, css };
};


// ---------- Character Bio, Career Log, CV ----------

export const bioWidget = (ctx: Ctx, p: Player, extras: Extras): Rendered => {
  const W = 420, H = 280;
  const { t } = ctx;
  const f = frame(ctx, W, H, 'CHARACTER');
  const bio = extras.config.bio;
  const rows: [string, string][] = [
    ...(bio.role ? [['Role', bio.role] as [string, string]] : []),
    ...(bio.focus ? [['Focus', bio.focus] as [string, string]] : []),
    ...(bio.location ? [['Base', bio.location] as [string, string]] : []),
    ['Class', `${p.jobClass.name} · ${p.jobClass.element}`],
    ['Awakened', p.raw.createdAt.slice(0, 10)],
  ];
  const about = bio.about ? wrap(bio.about, 'body', f.w, 3) : [];
  const list = rows.slice(0, 6 - Math.ceil(about.length / 2)).map(([k, v], i) => {
    const y = f.y + 14 + i * 28;
    return `${label(f.x, y, k, ctx)}${text(f.x + f.w, y, fit(v, 'strong', f.w - 96), 'strong', t.ink, { anchor: 'end' })}<line x1="${f.x}" y1="${y + 9.5}" x2="${f.x + f.w}" y2="${y + 9.5}" stroke="${t.line}"/>`;
  }).join('');
  const aboutY = f.y + 14 + Math.min(rows.length, 6 - Math.ceil(about.length / 2)) * 28 + 8;
  const body = `${f.svg}
${list}
${about.map((line, i) => text(f.x, aboutY + i * 18, line, 'body', t.muted)).join('')}
${footer(ctx, p.raw.login, synced(p), W, H)}`;
  return { width: W, height: H, title: `${p.raw.login}: character`, desc: [...rows.map(([k, v]) => `${k}: ${v}`), bio.about ?? ''].join('. '), body };
};

export const careerWidget = (ctx: Ctx, p: Player, extras: Extras): Rendered => {
  const W = 420, H = 280;
  const { t } = ctx;
  const f = frame(ctx, W, H, 'CAREER LOG');
  const entries = extras.config.career.slice(0, 4);
  const list = entries.map((e, i) => {
    const y = f.y + 22 + i * 44;
    const chip = e.current
      ? `<rect x="${f.x}" y="${y}" width="92" height="20" fill="${t.system}"/>${text(f.x + 46, y + 14, 'IN PROGRESS', 'code', t.onSystem, { anchor: 'middle' })}`
      : `<rect x="${f.x + 0.5}" y="${y + 0.5}" width="91" height="19" fill="none" stroke="${t.line}"/>${text(f.x + 46, y + 14, 'CLEARED', 'code', t.muted, { anchor: 'middle' })}`;
    const yearsW = textWidth(e.years, 'caption');
    return `${chip}
${text(f.x + 104, y + 8, fit(e.role, 'strong', f.w - 112 - yearsW), 'strong', t.ink)}
${e.org ? text(f.x + 104, y + 24, fit(e.org, 'caption', f.w - 112 - yearsW), 'caption', t.muted) : ''}
${e.years ? text(f.x + f.w, y + 14, e.years, 'caption', t.muted, { anchor: 'end' }) : ''}
<line x1="${f.x}" y1="${y + 34.5}" x2="${f.x + f.w}" y2="${y + 34.5}" stroke="${t.line}"/>`;
  }).join('');
  const cv = extras.config.cv;
  const cvName = cv ? (cv.startsWith('https://') ? new URL(cv).hostname.replace(/^www\./, '') : cv.split('/').pop()!) : '';
  const body = `${f.svg}
${label(f.x, f.y + 6, 'Quests completed', ctx)}
${text(f.x + f.w, f.y + 6, `${extras.config.career.length} quests`, 'caption', t.muted, { anchor: 'end' })}
${list}
${cv ? `${text(f.x, H - 22, fit(`FULL RÉSUMÉ: ${cvName}`, 'caption', f.w - 120), 'caption', t.system)}${arrow(f.x + Math.min(f.w - 120, textWidth(`FULL RÉSUMÉ: ${cvName}`, 'caption')) + 6, H - 21, t.system)}` : ''}
${text(f.x + f.w, H - 22, `@${p.raw.login}`, 'code', t.muted, { anchor: 'end' })}`;
  return { width: W, height: H, title: `${p.raw.login}: career log`, desc: entries.map((e) => `${e.role}${e.org ? ` at ${e.org}` : ''}${e.years ? ` (${e.years})` : ''}`).join('; '), body };
};

export const cvRune = (ctx: Ctx, p: Player, cv: string): Rendered => {
  const W = 200, H = 56;
  const { t } = ctx;
  const f = frame(ctx, W, H, null);
  const name = cv.startsWith('https://') ? new URL(cv).hostname : cv.split('/').pop()!;
  const kind = /\.(\w+)$/.exec(cv)?.[1]?.toUpperCase() ?? 'LINK';
  const body = `${f.svg}
<path d="${cut(14, 12, 32, 32, 5)}" fill="${t.system}"/>${use('doc', 21, 19, 18, t.onSystem)}
${text(56, 26, 'Résumé / CV', 'strong', t.ink)}
${text(56, 41, fit(`${name} · ${kind}`, 'code', 110), 'code', t.muted)}
${use('download', 172, 20, 14, t.system)}`;
  return { width: W, height: H, title: `${p.raw.login}: résumé`, desc: `Download the résumé (${name}).`, body, symbols: ['doc', 'download'] };
};

// ---------- Level Up, Quest Board, Oracle ----------

const achievementName = (id: string): string => ACHIEVEMENTS.find((a) => a.id === id)?.name ?? id;
const isGrade = (v: string): v is RankGrade => (GRADES as readonly string[]).includes(v);

/** The newest run's changes, else the most recent ones of the past week. */
export const recentEvents = (events: ProgressEvent[]): ProgressEvent[] => {
  const newest = events[0]?.at;
  return newest ? events.filter((e) => e.at === newest).concat(events.filter((e) => e.at !== newest)).slice(0, 4) : [];
};

export const levelUpWidget = (ctx: Ctx, p: Player, events: ProgressEvent[]): Rendered => {
  const W = 840, H = 136;
  const { t } = ctx;
  const f = frame(ctx, W, H, null, { padX: 24 });
  const shown = recentEvents(events);
  const heading = shown.some((e) => e.kind === 'level') ? 'LEVEL UP' : shown.some((e) => e.kind !== 'achievement') ? 'RANK UP' : 'UNLOCKED';
  const g = glow(ctx, true);
  const x0 = f.x + 268;
  const cell = (e: ProgressEvent, i: number) => {
    const x = x0 + (i % 2) * 270;
    const y = f.y + 8 + Math.floor(i / 2) * 50;
    const name = e.kind === 'achievement' ? achievementName(e.subject) : e.kind === 'overall' ? 'Overall' : e.subject;
    const ranked = isGrade(e.from) && isGrade(e.to);
    const from = e.kind === 'achievement' ? `T${e.from}` : e.from;
    const to = e.kind === 'achievement' ? `T${e.to}` : e.to;
    const lx = x + Math.min(118, textWidth(name.toUpperCase(), 'label') + 12);
    const shownName = fit(name.toUpperCase(), 'label', 110);
    if (ranked) {
      return `${text(x, y + 23, shownName, 'label', t.muted)}${sigil(ctx, e.from as RankGrade, lx, y + 4, 44, 28)}${chevron(lx + 54, y + 23, t.system)}${sigil(ctx, e.to as RankGrade, lx + 68, y + 4, 44, 28)}`;
    }
    return `${text(x, y + 23, shownName, 'label', t.muted)}${text(lx, y + 24, from, 'value', t.muted, { size: 16 })}${chevron(lx + textWidth(from, 'value') * (16 / 14) + 8, y + 23, t.system)}${text(lx + textWidth(from, 'value') * (16 / 14) + 22, y + 24, to, 'value', t.ink, { size: 16 })}`;
  };
  const body = `${f.svg}
<path d="${cut(f.x, f.y + 2, 22, 20, 2)}" fill="${t.system}"/>${text(f.x + 11, f.y + 17, '!', 'strong', t.onSystem, { anchor: 'middle' })}
${text(f.x + 32, f.y + 17, 'SYSTEM NOTIFICATION', 'label', t.system)}
${text(f.x, f.y + 60, heading, 'level', t.system, { cls: 'pulse', ...(g ? { filter: g } : {}) })}
${text(f.x, f.y + 84, shown[0] ? shown[0].at.slice(0, 10) : synced(p), 'code', t.muted)}
<line x1="${x0 - 24.5}" y1="${f.y}" x2="${x0 - 24.5}" y2="${H - 22}" stroke="${t.line}"/>
${shown.length ? shown.map(cell).join('\n') : text(x0, f.y + 50, 'Nothing new since the last run.', 'body', t.muted)}`;
  return {
    width: W, height: H, title: `${p.raw.login}: ${heading.toLowerCase()}`,
    desc: shown.map((e) => `${e.kind === 'achievement' ? achievementName(e.subject) : e.subject} ${e.from} to ${e.to}`).join(', ') || 'No recent changes.',
    body,
  };
};

export const questBoardWidget = (ctx: Ctx, p: Player, extras: Extras): Rendered => {
  const W = 420, H = 280;
  const { t } = ctx;
  const f = frame(ctx, W, H, 'QUEST BOARD');
  const items = extras.feed.slice(0, 5);
  const youtube = items.some((i) => /youtube\.com|youtu\.be/.test(i.url));
  const source = items[0]?.source ?? 'your feeds';
  const icon = youtube ? logo('youtube', f.x + f.w - 16, f.y - 6, 16, t.alert) : use('rss', f.x + f.w - 16, f.y - 6, 16, t.system);
  const rows = items.map((item, i) => {
    const y = f.y + 34 + i * 30;
    const date = item.date.slice(0, 10);
    return `${text(f.x, y, fit(item.title, 'body', f.w - 96), 'body', t.ink)}${text(f.x + f.w, y, date, 'caption', t.muted, { anchor: 'end' })}<line x1="${f.x}" y1="${y + 10.5}" x2="${f.x + f.w}" y2="${y + 10.5}" stroke="${t.line}"/>`;
  }).join('');
  const body = `${f.svg}
${label(f.x, f.y + 6, fit(`Latest from ${source}`, 'label', f.w - 30), ctx)}
${icon}
${rows || text(f.x, f.y + 40, 'No posts found in your feeds.', 'body', t.muted)}
${footer(ctx, p.raw.login, synced(p), W, H)}`;
  return { width: W, height: H, title: `${p.raw.login}: quest board`, desc: items.map((i) => i.title).join('; ') || 'No posts.', body, ...(youtube ? {} : { symbols: ['rss'] }) };
};

export const oracleWidget = (ctx: Ctx, p: Player, extras: Extras): Rendered => {
  const W = 420, H = 280;
  const { t } = ctx;
  const f = frame(ctx, W, H, 'ORACLE SCROLL');
  const quote = extras.quote ?? { text: 'Arise.', author: 'The System' };
  let size = 20;
  let lines = wrap(quote.text, 'name', f.w, 5, size);
  if (lines.length > 4) {
    size = 16;
    lines = wrap(quote.text, 'name', f.w, 5, size);
  }
  const step = Math.round(size * 1.35);
  const g = glow(ctx, true);
  const y0 = f.y + 52;
  const body = `${f.svg}
${text(f.x - 2, f.y + 38, '“', 'hero', t.system, { size: 44, ...(g ? { filter: g } : {}) })}
${lines.map((line, i) => text(f.x, y0 + i * step, line, 'name', t.ink, size !== TYPE.name.size ? { size } : {})).join('')}
${text(f.x, y0 + lines.length * step + 6, `— ${fit(quote.author, 'body', f.w - 20)}`, 'body', t.muted)}
${text(f.x, H - 22, 'SCROLL OF THE DAY', 'code', t.muted)}
${text(f.x + f.w, H - 22, synced(p), 'code', t.muted, { anchor: 'end' })}`;
  return { width: W, height: H, title: `${p.raw.login}: oracle scroll`, desc: `“${quote.text}” — ${quote.author}`, body };
};
