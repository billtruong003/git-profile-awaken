import type { Player } from '../../domain/types.js';
import { activityLevel } from '../../application/activity.js';
import { cut, fmt, footer, frame, glow, label, r, text, use, type Ctx, type Rendered } from '../svg/kit.js';
import { offsetLabel } from './details.js';

const CELL = 12;
const STEP = 15;
const LOOP_S = 10;

const synced = (p: Player): string => p.raw.fetchedAt.slice(0, 10);

/** Animation shorthand per motion level: "full" loops, "calm" plays once and rests on the final frame. */
const anim = (ctx: Ctx, loop: string, once: string, seconds: number, delay: number): string =>
  ctx.motion === 'none' ? '' : ` style="animation:${ctx.motion === 'full' ? loop : once} ${seconds}s ease-out ${delay.toFixed(2)}s ${ctx.motion === 'full' ? 'infinite' : '1'} both"`;

const gridGeometry = (p: Player, width: number) => {
  const weeks = p.activity.weeks;
  const gridW = weeks.length * STEP - 3;
  return { weeks, gridW, x0: Math.round((width - gridW) / 2) };
};

// ---------- ARISE: every active day rises as a shadow knight when the wave passes ----------
export const ariseWidget = (ctx: Ctx, p: Player): Rendered => {
  const W = 840, H = 268;
  const { t } = ctx;
  const f = frame(ctx, W, H, 'SHADOW EXTRACTION', { padX: 16 });
  const { weeks, gridW, x0 } = gridGeometry(p, W);
  const y0 = f.y + 56;
  const sweep = 4.2;
  const g = glow(ctx);
  const gs = glow(ctx, true);
  let elites = 0;

  const cells = weeks.map((week, c) => week.map((d) => {
    const x = x0 + c * STEP;
    const y = y0 + d.weekday * STEP;
    const level = activityLevel(d.count);
    if (level === 0) return `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" fill="${t.raised}"/>`;
    if (level === 3) elites++;
    const color = level === 3 ? t.shadow : level === 2 ? t.system : t.frame;
    const delay = (c / weeks.length) * sweep;
    return `<path d="${cut(x, y, CELL, CELL, 3)}" fill="${color}" fill-opacity="0.18"/>`
      + `<g class="unit"${anim(ctx, 'rise', 'rise-once', ctx.motion === 'full' ? LOOP_S : 0.9, delay)}>${use(level === 3 ? 'marshal' : 'knight', x, y, CELL, color, level === 3 && g ? ` filter="${g}"` : '')}</g>`;
  }).join('')).join('');

  const wave = ctx.motion === 'none' ? '' : `<rect x="${x0 - 4}" y="${y0 - 6}" width="2" height="${7 * STEP + 9}" fill="${t.shadow}"${gs ? ` filter="${gs}"` : ''}${anim(ctx, 'wave', 'wave-once', ctx.motion === 'full' ? LOOP_S : sweep, 0).replace('ease-out', 'linear')}/>`;
  const sweepPct = (sweep / LOOP_S) * 100;
  const counters: [string, string][] = [['Mana spent', fmt(p.activity.total)], ['Elites', fmt(elites)], ['Shadows', fmt(p.activity.activeDays)]];
  const body = `${f.svg}
${text(f.x, f.y + 34, 'ARISE', 'level', t.shadow, { cls: 'flicker', ...(gs ? { filter: gs } : {}) })}
${counters.map(([k, v], i) => `${label(f.x + f.w - i * 100, f.y + 12, k, ctx, { anchor: 'end' })}${text(f.x + f.w - i * 100, f.y + 32, v, 'value', t.ink, { anchor: 'end' })}`).join('')}
${cells}
${wave}
${footer(ctx, p.raw.login, synced(p), W, H)}`;
  const css = `.unit{transform-box:fill-box;transform-origin:center}
@media (prefers-reduced-motion:no-preference){
@keyframes rise{0%{opacity:0;transform:translateY(6px) scale(.3)}4%{opacity:1;transform:translateY(-2px) scale(1.25)}7%{transform:none}86%{opacity:1;transform:none}94%,100%{opacity:0;transform:translateY(-3px)}}
@keyframes rise-once{0%{opacity:0;transform:translateY(6px) scale(.3)}45%{opacity:1;transform:translateY(-2px) scale(1.25)}100%{opacity:1;transform:none}}
@keyframes wave{0%{transform:translateX(0);opacity:1}${sweepPct.toFixed(0)}%{transform:translateX(${gridW + 6}px);opacity:1}${(sweepPct + 2).toFixed(0)}%,100%{transform:translateX(${gridW + 6}px);opacity:0}}
@keyframes wave-once{0%{transform:translateX(0);opacity:1}96%{transform:translateX(${gridW + 6}px);opacity:1}100%{transform:translateX(${gridW + 6}px);opacity:0}}}`;
  return {
    width: W, height: H, title: `${p.raw.login}: shadow extraction`,
    desc: `${p.activity.activeDays} active days in the last year rise as shadow soldiers; ${elites} days with 10 or more contributions become elites.`,
    body, css, symbols: ['knight', 'marshal'],
  };
};

// ---------- Dungeon Raid: the hunter clears the year week by week; the busiest week is the boss ----------
export const raidWidget = (ctx: Ctx, p: Player): Rendered => {
  const W = 840, H = 292;
  const { t } = ctx;
  const f = frame(ctx, W, H, 'DUNGEON RAID', { padX: 16 });
  const { weeks, gridW, x0 } = gridGeometry(p, W);
  const y0 = f.y + 76;
  const run = 7;
  const boss = p.activity.bestWeek;
  const bossDay = weeks[boss.index]?.reduce((best, d) => (d.count > best.count ? d : best), weeks[boss.index]![0]!);
  const g = glow(ctx);
  const opacity = [0, 0.45, 0.75, 1];
  const icon = ['', 'slime', 'imp', 'demon'];

  const cells = weeks.map((week, c) => week.map((d) => {
    const x = x0 + c * STEP;
    const y = y0 + d.weekday * STEP;
    const level = activityLevel(d.count);
    if (level === 0) return `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" fill="${t.raised}"/>`;
    const isBoss = c === boss.index && d === bossDay;
    return `<g class="unit"${anim(ctx, 'slain', 'slain', ctx.motion === 'full' ? LOOP_S : 0.8, (c / weeks.length) * run)}>${use(isBoss ? 'boss' : icon[level]!, x, y, CELL, t.alert, ` fill-opacity="${opacity[level]}"${isBoss && g ? ` filter="${g}"` : ''}`)}</g>`;
  }).join('')).join('');

  const bossX = x0 + boss.index * STEP;
  const hitAt = ((boss.index / weeks.length) * run / LOOP_S) * 100;
  const hunter = ctx.motion === 'none' ? '' : `<g class="hunter"${ctx.motion === 'full' ? ` style="animation:hunter ${LOOP_S}s steps(${weeks.length},end) infinite"` : ` style="animation:hunter-once ${run}s steps(${weeks.length},end) 1 both"`}>
<rect x="${x0 - 8}" y="${y0 - 6}" width="3" height="${7 * STEP + 9}" fill="${t.system}"${g ? ` filter="${g}"` : ''}/>${use('sword', x0 - 14, y0 - 24, 14, t.system)}</g>`;
  const legend = [[1, 'Weak · 1–3'], [2, 'Strong · 4–9'], [3, 'Elite · 10+']] as const;
  const body = `${f.svg}
${text(f.x, f.y + 18, 'The 365-Day Gate', 'name', t.ink)}
${text(f.x, f.y + 40, `${fmt(p.activity.total)} monsters · ${p.activity.activeDays} battles · boss: week of ${boss.start}`, 'caption', t.muted)}
${label(f.x + f.w - 280, f.y + 12, 'Boss HP', ctx, {})}
${text(f.x + f.w, f.y + 12, `${boss.count} contributions`, 'caption', t.ink, { anchor: 'end' })}
<rect x="${f.x + f.w - 280}" y="${f.y + 20}" width="280" height="6" fill="${t.raised}"/>
<rect class="hp" x="${f.x + f.w - 280}" y="${f.y + 20}" width="280" height="6" fill="${t.alert}"/>
<rect x="${bossX - 3.5}" y="${y0 - 3.5}" width="${CELL + 7}" height="${7 * STEP + 4}" fill="none" stroke="${t.alert}" stroke-width="1.5"/>
${text(bossX + CELL / 2, y0 - 10, 'BOSS', 'code', t.alert, { anchor: 'middle', cls: 'boss-label' })}
${text(bossX + CELL / 2, y0 - 10, 'CLEARED', 'code', t.alert, { anchor: 'middle', cls: 'cleared', opacity: 0 })}
${cells}
${hunter}
${legend.map(([lv, name], i) => `${use(icon[lv]!,f.x + i * 120, H - 32, 12, t.alert, ` fill-opacity="${opacity[lv]}"`)}${text(f.x + 18 + i * 120, H - 22, name, 'code', t.muted)}`).join('')}
${footer(ctx, p.raw.login, synced(p), W, H)}`;
  const css = `.unit{transform-box:fill-box;transform-origin:center}.hp{transform-box:fill-box;transform-origin:left}
@media (prefers-reduced-motion:no-preference){
@keyframes slain{0%{transform:none;opacity:1}2%{transform:scale(1.6);opacity:1}6%,88%{transform:scale(.45);opacity:.25}96%,100%{transform:none;opacity:1}}
@keyframes hunter{0%{transform:translateX(0)}${((run / LOOP_S) * 100).toFixed(0)}%,100%{transform:translateX(${gridW + 14}px)}}
@keyframes hunter-once{from{transform:translateX(0)}to{transform:translateX(${gridW + 14}px)}}
${ctx.motion === 'full' ? `@keyframes hp{0%,${hitAt.toFixed(1)}%{transform:scaleX(1)}${(hitAt + 3).toFixed(1)}%,94%{transform:scaleX(0)}100%{transform:scaleX(1)}}
@keyframes cleared{0%,${hitAt.toFixed(1)}%{opacity:0}${(hitAt + 1).toFixed(1)}%,${(hitAt + 18).toFixed(1)}%{opacity:1}${(hitAt + 20).toFixed(1)}%,100%{opacity:0}}
@keyframes boss-label{0%,${hitAt.toFixed(1)}%{opacity:1}${(hitAt + 1).toFixed(1)}%,${(hitAt + 18).toFixed(1)}%{opacity:0}${(hitAt + 20).toFixed(1)}%,100%{opacity:1}}
.hp{animation:hp ${LOOP_S}s linear infinite}.cleared{animation:cleared ${LOOP_S}s linear infinite}.boss-label{animation:boss-label ${LOOP_S}s linear infinite}` : ''}}`;
  return {
    width: W, height: H, title: `${p.raw.login}: dungeon raid`,
    desc: `${p.activity.total} contributions as monsters over ${p.activity.activeDays} active days; the boss is the week of ${boss.start} with ${boss.count}.`,
    body, css, symbols: ['slime', 'imp', 'demon', 'boss', 'sword'],
  };
};

// ---------- Daily Quest / Penalty Zone ----------
const dateIn = (iso: string, timeZone: string): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));

const check = (ctx: Ctx, x: number, y: number, done: boolean): string => {
  const { t } = ctx;
  return done
    ? `<path d="${cut(x, y, 18, 18, 4)}" fill="${t.system}"/><path d="M${x + 4.5} ${y + 9.5}l3 3 6-6.5" fill="none" stroke="${t.onSystem}" stroke-width="2"/>`
    : `<path d="${cut(x + 0.75, y + 0.75, 16.5, 16.5, 3.6)}" fill="${t.panel}" stroke="${t.frame}" stroke-width="1.5"/>`;
};

export const dailyWidget = (ctx: Ctx, p: Player, timeZone: string): Rendered => {
  const W = 420, H = 280;
  const { t } = ctx;
  const a = p.activity;
  const today = a.today;
  const inPenalty = (today?.count ?? 0) === 0 && (a.yesterday?.count ?? 1) === 0;

  if (inPenalty) {
    const days = p.raw.year.calendar;
    let idle = 0;
    for (let i = days.length - 2; i >= 0 && days[i]!.count === 0; i--) idle++;
    const last = [...days].reverse().find((d) => d.count > 0);
    const f = frame(ctx, W, H, 'PENALTY ZONE', { accent: t.alert, edge: t.alert });
    const g = glow(ctx, true);
    const rows: [string, string][] = [['Days in zone', String(idle)], ['Last contribution', last?.date ?? 'none'], ['Escape', '1 contribution today']];
    const body = `<g class="pulse">${f.svg}</g>
${text(f.x, f.y + 30, 'STREAK LOST', 'level', t.alert, { cls: 'flicker', ...(g ? { filter: g } : {}) })}
${text(f.x, f.y + 56, `No contribution on ${a.yesterday?.date ?? 'the last day'}.`, 'body', t.ink)}
${text(f.x, f.y + 74, 'The System has moved you to the Penalty Zone.', 'body', t.ink)}
${rows.map(([k, v], i) => `${label(f.x, f.y + 108 + i * 25, k, ctx)}${text(f.x + f.w, f.y + 108 + i * 25, v, 'value', t.ink, { anchor: 'end' })}<line x1="${f.x}" y1="${f.y + 116.5 + i * 25}" x2="${f.x + f.w}" y2="${f.y + 116.5 + i * 25}" stroke="${t.line}"/>`).join('')}
${footer(ctx, p.raw.login, p.raw.fetchedAt.slice(0, 10), W, H)}`;
    return { width: W, height: H, title: `${p.raw.login}: penalty zone`, desc: `No contribution for ${idle} day(s). Streak lost.`, body };
  }

  const todayDate = today?.date ?? '';
  const pushedToday = p.raw.quest ? dateIn(p.raw.quest.pushedAt, timeZone) === todayDate : false;
  const tasks: [string, string, boolean][] = [
    ['Make one contribution today', `${Math.min(1, today?.count ?? 0)} / 1`, (today?.count ?? 0) > 0],
    [`Push to ${p.raw.quest?.repo ?? 'your active quest'}`, `${pushedToday ? 1 : 0} / 1`, pushedToday],
    ['Keep MP at 14 or more (14 days)', `${a.mp14} / 14`, a.mp14 >= 14],
  ];
  const cleared = tasks.every((x) => x[2]);
  const f = frame(ctx, W, H, cleared ? 'QUEST COMPLETE' : 'DAILY QUEST');
  const body = `${f.svg}
${label(f.x, f.y + 8, `Clear before 00:00 ${offsetLabel(timeZone)}`, ctx)}
${text(f.x + f.w, f.y + 8, 'resets daily', 'caption', t.muted, { anchor: 'end' })}
${tasks.map(([name, count, done], i) => {
    const y = f.y + 28 + i * 34;
    return `${check(ctx, f.x, y, done)}${text(f.x + 30, y + 14, name, 'body', done ? t.muted : t.ink)}${text(f.x + f.w, y + 14, count, 'value', done ? t.system : t.ink, { anchor: 'end' })}<line x1="${f.x}" y1="${y + 26.5}" x2="${f.x + f.w}" y2="${y + 26.5}" stroke="${t.line}"/>`;
  }).join('')}
${cleared
    ? text(f.x, f.y + 150, `Streak ${a.currentStreak} days. The System acknowledges your effort.`, 'body', t.system)
    : text(f.x, f.y + 150, 'Miss today and you enter the Penalty Zone.', 'body', t.alert)}
${footer(ctx, p.raw.login, p.raw.fetchedAt.slice(0, 10), W, H)}`;
  return { width: W, height: H, title: `${p.raw.login}: daily quest`, desc: tasks.map(([n, c]) => `${n} ${c}`).join(', '), body };
};
