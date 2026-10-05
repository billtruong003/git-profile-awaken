import type { Player, Stat } from '../../domain/types.js';
import { gradeIndex } from '../../application/ranks.js';
import { fit, fmt, footer, frame, gauge, glow, label, r, sigil, text, type Ctx, type Rendered } from '../svg/kit.js';

const synced = (p: Player): string => p.raw.fetchedAt.slice(0, 10);
const classLine = (p: Player): string =>
  `${p.jobClass.name} · ${p.jobClass.element}${p.raw.languages[0] ? ` · top language ${p.raw.languages[0].name} ${p.raw.languages[0].percent}%` : ''}`;

const titleLine = (ctx: Ctx, p: Player, x: number, y: number, maxWidth: number): string => {
  if (!p.equippedTitle) return label(x, y, 'No title earned yet', ctx);
  const g = glow(ctx);
  return `${label(x, y, 'Title', ctx)}${text(x + 52, y, fit(p.equippedTitle.title, 'strong', maxWidth - 52), 'strong', ctx.t.system, { cls: 'flicker', ...(g ? { filter: g } : {}) })}`;
};

const statRow = (ctx: Ctx, s: Stat, x: number, y: number, w: number, zebra: boolean): string => {
  const { t } = ctx;
  const track = w - 112 - 12;
  return `<g>${zebra ? `<rect x="${x}" y="${y}" width="${w}" height="44" fill="${t.raised}"/>` : ''}
${label(x + 12, y + 27, s.code, ctx)}
${sigil(ctx, s.rank, x + 50, y + 6, 48, 32)}
${text(x + 112, y + 26, s.source, 'body', t.ink)}
${text(x + w - 12, y + 27, fmt(s.value), 'value', t.ink, { anchor: 'end' })}
<rect x="${x + 112}" y="${y + 36}" width="${track}" height="2" fill="${zebra ? t.void : t.raised}"/>
<rect class="grow" x="${x + 112}" y="${y + 36}" width="${r(track * s.progress)}" height="2" fill="${t.rank[s.rank]}"/></g>`;
};

/** Axis value = (tier + progress) / 9, rings at the tier-group edges C, S and EX. */
const radar = (ctx: Ctx, p: Player, cx: number, cy: number, radius: number): string => {
  const { t } = ctx;
  const pt = (i: number, f: number): [number, number] => {
    const a = ((-90 + i * 60) * Math.PI) / 180;
    return [cx + radius * f * Math.cos(a), cy + radius * f * Math.sin(a)];
  };
  const poly = (f: (i: number) => number) => [0, 1, 2, 3, 4, 5].map((i) => pt(i, f(i)).map(r).join(',')).join(' ');
  const rings = [2 / 9, 5 / 9, 8 / 9, 1].map((f) => `<polygon points="${poly(() => f)}" fill="none" stroke="${t.line}"/>`).join('');
  const axes = [0, 1, 2, 3, 4, 5].map((i) => { const [x, y] = pt(i, 1); return `<line x1="${cx}" y1="${cy}" x2="${r(x)}" y2="${r(y)}" stroke="${t.line}"/>`; }).join('');
  const values = p.stats.map((s) => Math.max(0.05, (gradeIndex(s.rank) + s.progress) / 9));
  const labels = p.stats.map((s, i) => { const [x, y] = pt(i, 1.22); return text(x, y + 4, `${s.code} ${s.rank}`, 'label', t.muted, { anchor: 'middle' }); }).join('');
  const g = glow(ctx);
  return `${rings}${axes}<polygon class="pulse" points="${poly((i) => values[i]!)}" fill="${t.system}" fill-opacity="0.22" stroke="${t.system}" stroke-width="2"${g ? ` filter="${g}"` : ''}/>${labels}`;
};

export const statusWindow = (ctx: Ctx, p: Player): Rendered => {
  const W = 840, H = 540;
  const { t } = ctx;
  const f = frame(ctx, W, H, 'STATUS');
  const g = glow(ctx, true);
  const rowsY = f.y + 156;
  const body = `${f.svg}
${text(f.x, f.y + 32, `LV. ${p.level}`, 'level', t.system, g ? { filter: g } : {})}
${text(f.x, f.y + 62, fit(p.raw.login, 'name', 520), 'name', t.ink)}
${titleLine(ctx, p, f.x, f.y + 86, 520)}
${text(f.x, f.y + 108, fit(classLine(p), 'body', 560), 'body', t.muted)}
${label(W - 20 - 38, f.y + 6, 'Overall rank', ctx, { anchor: 'middle' })}
${sigil(ctx, p.overall, W - 20 - 76, f.y + 14, 76, 76, 'hero', { pulse: true })}
${gauge(ctx, f.x, f.y + 132, (f.w - 24) / 2, 'EXP', `${fmt(p.exp)} / ${fmt(p.nextExp)}`, p.exp / p.nextExp, t.system, { ticks: true, glow: true })}
${gauge(ctx, f.x + (f.w + 24) / 2, f.y + 132, (f.w - 24) / 2, 'MP', `${p.activity.mp14} contributions · 14d`, p.activity.mp14 / 35, t.mana)}
${p.stats.map((s, i) => statRow(ctx, s, f.x, rowsY + i * 44, 470, i % 2 === 0)).join('\n')}
<path d="M${f.x + 486 + 8} ${rowsY}H${f.x + f.w}V${rowsY + 256}L${f.x + f.w - 8} ${rowsY + 264}H${f.x + 486}V${rowsY + 8}Z" fill="${t.void}"/>
${radar(ctx, p, f.x + 486 + (f.w - 486) / 2, rowsY + 132, 88)}
${footer(ctx, p.raw.login, synced(p), W, H)}`;
  return { width: W, height: H, title: `${p.raw.login}: status window`, desc: `Level ${p.level}, overall rank ${p.overall}, ${p.jobClass.name}. ${p.stats.map((s) => `${s.code} ${s.rank} (${s.value} ${s.source})`).join(', ')}.`, body };
};

export const hunterCard = (ctx: Ctx, p: Player): Rendered => {
  const W = 840, H = 232;
  const { t } = ctx;
  const f = frame(ctx, W, H, 'HUNTER LICENSE');
  const mini = (s: Stat, i: number) => {
    const x = 500 + (i % 3) * 104;
    const y = f.y + 6 + Math.floor(i / 3) * 46;
    return `${sigil(ctx, s.rank, x, y, 48, 32)}${label(x + 56, y + 12, s.code, ctx)}${text(x + 56, y + 30, fmt(s.value), 'value', t.ink)}`;
  };
  const body = `${f.svg}
${label(f.x + 38, f.y + 6, 'Rank', ctx, { anchor: 'middle' })}
${sigil(ctx, p.overall, f.x, f.y + 16, 76, 76, 'hero', { pulse: true })}
${text(f.x + 104, f.y + 22, fit(p.raw.login, 'name', 380), 'name', t.ink)}
${p.raw.name ? text(f.x + 104, f.y + 44, fit(p.raw.name, 'body', 380), 'body', t.muted) : ''}
${text(f.x + 104, f.y + 66, fit(`${p.jobClass.name} · ${p.jobClass.element} · LV. ${p.level}`, 'body', 380), 'body', t.ink)}
${titleLine(ctx, p, f.x + 104, f.y + 88, 380)}
${text(f.x + 104, f.y + 108, `AWAKENED ${p.raw.createdAt.slice(0, 10)}`, 'caption', t.muted)}
${p.stats.map(mini).join('\n')}
${footer(ctx, p.raw.login, synced(p), W, H)}`;
  return { width: W, height: H, title: `${p.raw.login}: hunter license`, desc: `Hunter rank ${p.overall}, level ${p.level}, ${p.jobClass.name}${p.equippedTitle ? `, title ${p.equippedTitle.title}` : ''}.`, body };
};

export const statRune = (ctx: Ctx, p: Player, s: Stat): Rendered => {
  const W = 200, H = 134;
  const { t } = ctx;
  const f = frame(ctx, W, H, null, { padX: 14 });
  const body = `${f.svg}
${sigil(ctx, s.rank, 18, 18, 54, 48)}
${label(82, 36, s.code, ctx)}
${text(82, 58, fit(s.source, 'body', 100), 'body', t.ink)}
${text(18, 98, fmt(s.value), 'value', t.ink)}
${s.next ? text(182, 98, `NEXT ${s.next.rank} · ${fmt(s.next.at)}`, 'code', t.muted, { anchor: 'end' }) : text(182, 98, 'MAX RANK', 'code', t.muted, { anchor: 'end' })}
<rect x="18" y="108" width="164" height="2" fill="${t.raised}"/>
<rect class="grow" x="18" y="108" width="${r(164 * s.progress)}" height="2" fill="${t.rank[s.rank]}"/>`;
  return { width: W, height: H, title: `${s.code}: rank ${s.rank}`, desc: `${s.code} rank ${s.rank} from ${s.value} ${s.source}.`, body };
};
