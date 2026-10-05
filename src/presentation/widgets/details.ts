import type { Achievement, Player } from '../../domain/types.js';
import { awakenClass } from '../../application/classes.js';
import { BRAND_ICONS } from '../svg/brandIcons.js';
import { CLASS_RUNE } from '../svg/icons.js';
import { cut, dot, fit, fmt, footer, frame, glow, label, r, text, use, type Ctx, type Rendered } from '../svg/kit.js';

const synced = (p: Player): string => p.raw.fetchedAt.slice(0, 10);

const row = (ctx: Ctx, x: number, y: number, w: number, key: string, value: string, sub = ''): string => {
  const { t } = ctx;
  const valueWidth = value.length * 7.8;
  return `${label(x, y, key, ctx)}
${sub ? text(x + w - valueWidth - 10, y, fit(sub, 'caption', w - valueWidth - 140), 'caption', t.muted, { anchor: 'end' }) : ''}
${text(x + w, y, value, 'value', t.ink, { anchor: 'end' })}
<line x1="${x}" y1="${y + 8.5}" x2="${x + w}" y2="${y + 8.5}" stroke="${t.line}"/>`;
};

const dateIn = (iso: string, timeZone: string): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));

export const offsetLabel = (timeZone: string): string =>
  new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'shortOffset' }).formatToParts(new Date()).find((x) => x.type === 'timeZoneName')?.value ?? 'UTC';

export const questWidget = (ctx: Ctx, p: Player, timeZone: string): Rendered => {
  const W = 420, H = 280;
  const { t } = ctx;
  const f = frame(ctx, W, H, 'ACTIVE QUEST');
  const q = p.raw.quest;
  const body = q
    ? `${f.svg}
${text(f.x, f.y + 18, fit(`Subjugate the ${q.repo} Dungeon`, 'name', f.w), 'name', t.ink)}
${row(ctx, f.x, f.y + 52, f.w, 'Target', fit(q.repo, 'value', 220))}
${q.language ? `${label(f.x, f.y + 76, 'Language', ctx)}${dot(f.x + f.w - q.language.name.length * 8.4 - 12, f.y + 72, q.language.color, t.line)}${text(f.x + f.w, f.y + 76, q.language.name, 'value', t.ink, { anchor: 'end' })}<line x1="${f.x}" y1="${f.y + 84.5}" x2="${f.x + f.w}" y2="${f.y + 84.5}" stroke="${t.line}"/>` : row(ctx, f.x, f.y + 76, f.w, 'Language', 'Unknown')}
${row(ctx, f.x, f.y + 100, f.w, 'Progress', `${fmt(q.commits)} commits`, `since ${dateIn(q.createdAt, timeZone)}`)}
${row(ctx, f.x, f.y + 124, f.w, 'Last push', dateIn(q.pushedAt, timeZone))}
${label(f.x, f.y + 152, 'Last entry', ctx)}
${text(f.x, f.y + 172, fit(q.lastMessage || '(no message)', 'body', f.w), 'body', t.ink)}
${footer(ctx, p.raw.login, synced(p), W, H)}`
    : `${f.svg}${text(f.x, f.y + 18, 'No active quest', 'name', t.muted)}${text(f.x, f.y + 44, 'Push to a repository to accept a quest.', 'body', t.ink)}${footer(ctx, p.raw.login, synced(p), W, H)}`;
  return { width: W, height: H, title: `${p.raw.login}: active quest`, desc: q ? `Latest repository ${q.repo}, ${q.commits} commits since ${q.createdAt.slice(0, 10)}.` : 'No active quest.', body };
};

export const skillIcon = (ctx: Ctx, language: string): string =>
  ctx.icons === 'brand' && BRAND_ICONS[language] ? `brand:${language}` : CLASS_RUNE[awakenClass(language).name] ?? 'rune';

export const skillsWidget = (ctx: Ctx, p: Player): Rendered => {
  const W = 420, H = 280;
  const { t } = ctx;
  const f = frame(ctx, W, H, 'PASSIVE SKILLS');
  const langs = p.raw.languages.slice(0, 5);
  const icons = langs.map((l) => skillIcon(ctx, l.name));
  const rows = langs.map((l, i) => {
    const y = f.y + 30 + i * 28;
    const barX = f.x + 128, barW = f.w - 128 - 60;
    return `${use(icons[i]!, f.x, y - 12, 15, i === 0 ? t.system : t.ink, i === 0 && glow(ctx) ? ` filter="${glow(ctx)}"` : '')}
${text(f.x + 24, y, fit(l.name, 'body', 100), 'body', t.ink)}
<rect x="${barX}" y="${y - 6}" width="${barW}" height="4" fill="${t.raised}"/>
<rect class="grow" x="${barX}" y="${y - 6}" width="${r((barW * l.percent) / 100)}" height="4" fill="${t.system}"/>
${text(f.x + f.w, y, `${l.percent.toFixed(1)}%`, 'caption', t.ink, { anchor: 'end' })}`;
  }).join('\n');
  const body = `${f.svg}
${label(f.x, f.y + 6, 'Mastery by code size', ctx)}
${text(f.x + f.w, f.y + 6, `${p.raw.ownedRepos} repos`, 'caption', t.muted, { anchor: 'end' })}
${rows}
${text(f.x, f.y + 178, fit(`Class ${p.jobClass.name}, awakened from ${p.jobClass.from ?? 'nothing yet'}`, 'body', f.w), 'body', t.muted)}
${footer(ctx, p.raw.login, synced(p), W, H)}`;
  return { width: W, height: H, title: `${p.raw.login}: passive skills`, desc: langs.map((l) => `${l.name} ${l.percent}%`).join(', '), body, symbols: icons };
};

export const contributionWidget = (ctx: Ctx, p: Player): Rendered => {
  const W = 420, H = 280;
  const { t } = ctx;
  const a = p.activity;
  const f = frame(ctx, W, H, 'CONTRIBUTION LOG');
  const cellW = (f.w - 8) / 2;
  const cell = (i: number, key: string, value: string) => {
    const x = f.x + (i % 2) * (cellW + 8);
    const y = f.y + Math.floor(i / 2) * 50;
    return `<rect x="${r(x)}" y="${y}" width="${r(cellW)}" height="44" fill="${t.raised}"/>${label(x + 10, y + 18, key, ctx)}${text(x + 10, y + 36, value, 'value', t.ink)}`;
  };
  const weeks = a.weeks.slice(-16).map((w) => w.reduce((s, d) => s + d.count, 0));
  const max = Math.max(1, ...weeks);
  const chartY = f.y + 124, chartH = 40;
  const barW = (f.w - 4 - 15 * 4) / 16;
  const bars = weeks.map((v, i) => {
    const h = v === 0 ? 2 : Math.max(3, (v / max) * (chartH - 4));
    return `<rect class="grow-y" x="${r(f.x + 2 + i * (barW + 4))}" y="${r(chartY + chartH - 2 - h)}" width="${r(barW)}" height="${r(h)}" fill="${v === 0 ? t.line : t.system}"/>`;
  }).join('');
  const body = `${f.svg}
${cell(0, 'Last 365 days', `${fmt(a.total)} contributions`)}
${cell(1, 'Daily average', `${(a.total / Math.max(1, p.raw.year.calendar.length)).toFixed(1)} / day`)}
${cell(2, 'Current streak', `${a.currentStreak} days`)}
${cell(3, 'Best streak', `${a.bestStreak} days`)}
${label(f.x, f.y + 116, 'Last 16 weeks', ctx)}
${text(f.x + f.w, f.y + 116, `best week of the year ${a.bestWeek.count}`, 'caption', t.muted, { anchor: 'end' })}
<rect x="${f.x}" y="${chartY}" width="${f.w}" height="${chartH}" fill="${t.void}"/>
${bars}
${footer(ctx, p.raw.login, synced(p), W, H)}`;
  return {
    width: W, height: H, title: `${p.raw.login}: contribution log`,
    desc: `${a.total} contributions in the last year, current streak ${a.currentStreak} days, best ${a.bestStreak}.`, body,
    css: '@media (prefers-reduced-motion:no-preference){.grow-y{transform-box:fill-box;transform-origin:bottom;animation:grow-y .8s cubic-bezier(.2,.8,.2,1) .3s both}@keyframes grow-y{from{transform:scaleY(0)}to{transform:scaleY(1)}}}',
  };
};

export const combatWidget = (ctx: Ctx, p: Player): Rendered => {
  const W = 420, H = 280;
  const f = frame(ctx, W, H, 'COMBAT RECORD');
  const raw = p.raw;
  const raidsMerged = raw.raids.reduce((s, x) => s + x.merged, 0);
  const topRaid = [...raw.raids].sort((a, b) => b.merged - a.merged)[0];
  const accuracy = raw.pullRequests ? Math.round((raw.mergedPullRequests / raw.pullRequests) * 100) : 0;
  const lines: [string, string, string][] = [
    ['Raids', `${raidsMerged} merged`, topRaid?.repo ?? ''],
    ['PR accuracy', `${accuracy}%`, `${raw.mergedPullRequests} / ${raw.pullRequests}`],
    ['Support', `${fmt(raw.lifetimeReviews)} reviews`, ''],
    ['Gates opened', `${raw.year.newRepos} repos`, 'this year'],
    ['Active days', `${p.activity.activeDays} / ${raw.year.calendar.length}`, `${Math.round((p.activity.activeDays / Math.max(1, raw.year.calendar.length)) * 100)}%`],
    ['Best day', `${p.activity.bestDay.count}`, p.activity.bestDay.date],
    ['Guilds', `${raw.organizations} orgs`, ''],
  ];
  const body = `${f.svg}
${lines.map(([k, v, s], i) => row(ctx, f.x, f.y + 8 + i * 25, f.w, k, v, s)).join('\n')}
${footer(ctx, raw.login, synced(p), W, H)}`;
  return { width: W, height: H, title: `${raw.login}: combat record`, desc: lines.map(([k, v]) => `${k} ${v}`).join(', '), body };
};

export const hoursWidget = (ctx: Ctx, p: Player, timeZone: string): Rendered => {
  const W = 420, H = 280;
  const { t } = ctx;
  const f = frame(ctx, W, H, 'HUNTING HOURS');
  const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  const wmax = Math.max(1, ...p.activity.weekdayTotals);
  const hours = p.raw.commitHours;
  const barsX = hours ? f.x + 190 : f.x;
  const barsW = f.x + f.w - barsX;
  const weekdays = p.activity.weekdayTotals.map((v, i) => {
    const y = f.y + 16 + i * 21;
    const w = barsW - 70;
    return `${text(barsX, y, days[i]!, 'code', t.muted)}<rect x="${barsX + 34}" y="${y - 6}" width="${w}" height="6" fill="${t.raised}"/><rect class="grow" x="${barsX + 34}" y="${y - 6}" width="${r((w * v) / wmax)}" height="6" fill="${t.system}"/>${text(barsX + barsW, y, String(v), 'caption', t.ink, { anchor: 'end' })}`;
  }).join('');

  if (!hours) {
    const body = `${f.svg}${weekdays}
${text(f.x, f.y + 172, 'Commit hours are off. Set "hours": true to see the clock.', 'body', t.muted)}
${footer(ctx, p.raw.login, synced(p), W, H)}`;
    return { width: W, height: H, title: `${p.raw.login}: hunting hours`, desc: 'Contributions per weekday.', body };
  }

  const total = hours.reduce((s, v) => s + v, 0);
  const max = Math.max(1, ...hours);
  const peak = hours.indexOf(max);
  const night = [22, 23, 0, 1, 2, 3, 4].reduce((s, h) => s + hours[h]!, 0);
  const cx = f.x + 82, cy = f.y + 82, r0 = 30, r1 = 74;
  const at = (h: number, rad: number): [number, number] => {
    const a = (h / 24) * 2 * Math.PI - Math.PI / 2;
    return [cx + rad * Math.cos(a), cy + rad * Math.sin(a)];
  };
  const spokes = hours.map((v, h) => {
    const [x0, y0] = at(h + 0.5, r0);
    const [x1, y1] = at(h + 0.5, r0 + 4 + (r1 - r0 - 4) * (v / max));
    return `<line x1="${r(x0)}" y1="${r(y0)}" x2="${r(x1)}" y2="${r(y1)}" stroke="${h === peak ? t.system : t.frame}" stroke-width="6"${h === peak && glow(ctx) ? ` filter="${glow(ctx)}" class="pulse"` : ''}/>`;
  }).join('');
  const [ax, ay] = at(22, r1 + 5);
  const [bx, by] = at(29, r1 + 5);
  const ticks = [0, 6, 12, 18].map((h) => { const [x, y] = at(h, r0 - 11); return text(x, y + 4, String(h).padStart(2, '0'), 'code', t.muted, { anchor: 'middle' }); }).join('');
  const share = Math.round((night / Math.max(1, total)) * 100);
  const body = `${f.svg}
<circle cx="${cx}" cy="${cy}" r="${r0 - 2}" fill="${t.void}"/>
${spokes}
<path d="M${r(ax)} ${r(ay)}A${r1 + 5} ${r1 + 5} 0 0 1 ${r(bx)} ${r(by)}" fill="none" stroke="${t.shadow}" stroke-width="2"${glow(ctx) ? ` filter="${glow(ctx)}"` : ''}/>
${ticks}
${weekdays}
${text(f.x, f.y + 184, `Peak ${String(peak).padStart(2, '0')}:00 · ${share}% after dark`, 'strong', t.ink)}
${text(f.x + f.w, f.y + 184, `${fmt(total)} commits · ${offsetLabel(timeZone)}`, 'caption', t.muted, { anchor: 'end' })}
${footer(ctx, p.raw.login, synced(p), W, H)}`;
  return { width: W, height: H, title: `${p.raw.login}: hunting hours`, desc: `Most commits at ${peak}:00, ${share}% between 22:00 and 05:00.`, body };
};

const PIP = 'M0 3 3 0 6 3 3 6Z';

/** Why a badge cannot be measured, instead of looking locked. */
const UNAVAILABLE: Record<string, string> = {
  'night-owl': 'needs commit hours', 'early-bird': 'needs commit hours',
  quickdraw: 'not fetched', yolo: 'not fetched',
  'daily-grinder': 'counts with the Action', 'perfect-week': 'counts with the Action', 'quest-hunter': 'counts with the Action',
  'boss-slayer': 'counts with the Action', 'escape-artist': 'counts with the Action', collector: 'counts with the Action',
};

const badge = (ctx: Ctx, a: Achievement, x: number, y: number, w: number): string => {
  const { t } = ctx;
  const earned = a.tier > 0;
  const tileStroke = a.tier >= 2 ? t.system : earned ? t.frame : t.line;
  const goal = a.goals[Math.min(a.tier, 2)]!;
  const progress = !a.available ? UNAVAILABLE[a.id] ?? 'not measured yet' : a.tier === 3 ? `${fmt(a.value)} · MAX` : `${fmt(a.value)} / ${fmt(goal)}`;
  const pips = [0, 1, 2].map((i) => `<path transform="translate(${x + 17 + i * 10} ${y + 58})" d="${PIP}" fill="${i < a.tier ? t.system : t.line}"/>`).join('');
  const g = a.tier === 3 ? glow(ctx) : '';
  return `<g${a.tier === 3 ? ' class="pulse"' : ''}>
<path d="${cut(x, y, w, 68, 8)}" fill="${earned ? t.raised : t.panel}" stroke="${earned ? t.frame : t.line}"/>
<path d="${cut(x + 10, y + 10, 40, 40, 6)}" fill="${t.void}" stroke="${tileStroke}" stroke-width="${a.tier >= 2 ? 2 : 1}"${g ? ` filter="${g}"` : ''}/>
${a.tier === 3 ? `<path d="${cut(x + 14, y + 14, 32, 32, 4)}" fill="none" stroke="${t.system}"/>` : ''}
${use(earned ? a.icon : 'lock', x + 20, y + 20, 20, earned ? (a.tier >= 2 ? t.system : t.ink) : t.muted)}
${text(x + 60, y + 22, fit(a.name, 'strong', w - 68), 'strong', earned ? t.ink : t.muted)}
${pips}
${text(x + 60, y + 41, progress, 'caption', earned ? t.ink : t.muted)}
${text(x + 60, y + 57, fit(a.unit.toUpperCase(), 'code', w - 70), 'code', t.muted)}
</g>`;
};

export const achievementsWidget = (ctx: Ctx, p: Player): Rendered => {
  const cols = 4, gap = 10;
  const W = 840, H = 56 + 52 + Math.ceil(p.achievements.length / cols) * 76 + 24;
  const { t } = ctx;
  const f = frame(ctx, W, H, 'ACHIEVEMENTS');
  const w = (f.w - gap * (cols - 1)) / cols;
  const unlocked = p.achievements.filter((a) => a.tier > 0).length;
  const g = glow(ctx, true);
  const badges = p.achievements.map((a, i) => badge(ctx, a, f.x + (i % cols) * (w + gap), f.y + 52 + Math.floor(i / cols) * 76, w)).join('\n');
  const body = `${f.svg}
${label(f.x, f.y + 8, 'Equipped title', ctx)}
${text(f.x, f.y + 36, p.equippedTitle?.title ?? 'None yet', 'name', p.equippedTitle ? t.system : t.muted, { cls: 'flicker', ...(g ? { filter: g } : {}) })}
${label(f.x + f.w, f.y + 8, 'Unlocked', ctx, { anchor: 'end' })}
${text(f.x + f.w, f.y + 36, `${unlocked} / ${p.achievements.length}`, 'value', t.ink, { anchor: 'end' })}
${badges}
${footer(ctx, p.raw.login, synced(p), W, H)}`;
  return {
    width: W, height: H, title: `${p.raw.login}: achievements`,
    desc: `${unlocked} of ${p.achievements.length} achievements unlocked. ${p.achievements.filter((a) => a.tier > 0).map((a) => `${a.name} tier ${a.tier}`).join(', ')}.`,
    body, symbols: [...new Set([...p.achievements.map((a) => a.icon), 'lock'])],
  };
};
