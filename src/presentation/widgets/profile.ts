import { GRADES, type Player, type RankGrade, type Stat } from '../../domain/types.js';
import { LADDER } from '../../application/population.js';
import { cut, fit, fmt, fmtShort, footer, frame, FX, fxGlow, fxShine, glow, label, ladderPos, r, sigil, text, textWidth, topShare, type Ctx, type Rendered } from '../svg/kit.js';

const synced = (p: Player): string => p.raw.fetchedAt.slice(0, 10);
const classLine = (p: Player): string =>
  `${p.jobClass.name} · ${p.jobClass.element}${p.raw.languages[0] ? ` · top language ${p.raw.languages[0].name} ${p.raw.languages[0].percent}%` : ''}`;

const titleLine = (ctx: Ctx, p: Player, x: number, y: number, maxWidth: number): string => {
  if (!p.equippedTitle) return label(x, y, 'No title earned yet', ctx);
  const g = glow(ctx);
  return `${label(x, y, 'Title', ctx)}${text(x + 52, y, fit(p.equippedTitle.title, 'strong', maxWidth - 52), 'strong', ctx.t.system, { cls: 'flicker', ...(g ? { filter: g } : {}) })}`;
};

/** Chip with the top share, e.g. "TOP 2.0%". Returns its width so callers can right-align it. */
const topChip = (ctx: Ctx, percentile: number, right: number, y: number): string => {
  const value = topShare(percentile);
  const w = textWidth(value, 'caption') + 16;
  return `<rect x="${r(right - w)}" y="${y}" width="${r(w)}" height="20" fill="${ctx.t.void}" stroke="${ctx.t.line}"/>${text(right - 8, y + 14, value, 'caption', ctx.t.ink, { anchor: 'end' })}`;
};

const statRow = (ctx: Ctx, s: Stat, x: number, y: number, w: number, zebra: boolean): string => {
  const { t } = ctx;
  const barX = x + 116, barW = w - 116 - 116;
  return `<g>${zebra ? `<rect x="${x}" y="${y}" width="${w}" height="48" fill="${t.raised}"/>` : ''}
${label(x + 12, y + 29, s.code, ctx)}
${sigil(ctx, s.rank, x + 56, y + 8, 48, 32)}
${text(barX, y + 21, fit(s.source, 'body', barW - 70), 'body', t.ink)}
${text(barX, y + 35, s.next ? `${s.next.rank} AT ${fmt(s.next.at)}` : 'MAX RANK', 'code', t.muted)}
${text(x + w - 116, y + 29, fmtShort(s.value), 'value', t.ink, { anchor: 'end' })}
${topChip(ctx, s.percentile, x + w - 12, y + 14)}
<rect x="${barX}" y="${y + 40}" width="${barW - 70}" height="2" fill="${zebra ? t.void : t.raised}"/>
<rect class="grow" x="${barX}" y="${y + 40}" width="${r((barW - 70) * s.progress)}" height="2" fill="${t.rank[s.rank]}"/></g>`;
};

/** Where each rank begins, as a percentile: E at 0, D at the 40th … EX at the 99.95th. */
const STARTS: number[] = [0, ...LADDER];
let clipSeq = 0;
const startTop = (i: number): string => {
  const top = (1 - STARTS[i]!) * 100;
  return `${top < 0.1 ? top.toFixed(2) : top < 1 ? top.toFixed(1) : top.toFixed(0)}%`;
};

/**
 * The Rank Ladder: E to EX on a log scale of the top share, every segment from A up carrying its rank's
 * effect, the player's overall position marked, and optionally where each stat lands.
 */
const ladder = (ctx: Ctx, p: Player, x: number, y: number, width: number, withStats: boolean): string => {
  const { t } = ctx;
  const segs = GRADES.map((rank, i) => {
    const x0 = x + ladderPos(STARTS[i]!) * width;
    const x1 = i + 1 < GRADES.length ? x + ladderPos(STARTS[i + 1]!) * width : x + width;
    const w = x1 - x0 - 2;
    const color = t.rank[rank];
    const bar = `<rect x="${r(x0)}" y="${y + 30}" width="${r(w)}" height="8" fill="${color}"${FX[rank] ? '' : ' opacity="0.8"'}/>`;
    let fill = bar;
    if (rank === 'EX' && ctx.motion === 'full') {
      const id = `lx${clipSeq++}`;
      fill = `<clipPath id="${id}"><rect x="${r(x0)}" y="${y + 30}" width="${r(w)}" height="8"/></clipPath><g clip-path="url(#${id})"><rect class="flow" x="${r(x0)}" y="${y + 30}" width="${r(w * 2)}" height="8" fill="url(#exflow)"/></g>`;
    }
    const letter = text((x0 + x1) / 2, y + 18, rank, 'rank', color, { anchor: 'middle', ...(rank.length === 3 ? { cls: 'tight' } : {}) });
    return `${fxGlow(ctx, rank, bar)}${fill}${fxShine(ctx, rank, `M${r(x0)} ${y + 30}h${r(w)}v8h${r(-w)}Z`, x0, y + 30, w, 8, true)}
${fxGlow(ctx, rank, letter)}${letter}
${i > 0 ? text(x0, y + 54, startTop(i), 'code', t.muted, { anchor: 'middle' }) : ''}`;
  }).join('\n');
  const you = x + ladderPos(p.overallPercentile) * width;
  const youLabel = `▲ YOU · ${topShare(p.overallPercentile)}`;
  const labelX = Math.min(x + width - textWidth(youLabel, 'caption') / 2, Math.max(x + textWidth(youLabel, 'caption') / 2, you));
  const g = glow(ctx);
  const marks = withStats ? p.stats.map((s, i) => {
    const sx = x + ladderPos(s.percentile) * width;
    const len = 18 + (i % 3) * 14;
    return `<rect x="${r(sx - 1)}" y="${y + 78}" width="2" height="${len}" fill="${t.line}"/>${text(sx, y + 90 + len, s.code, 'code', t.muted, { anchor: 'middle' })}`;
  }).join('') : '';
  return `${segs}
<rect class="pulse" x="${r(you - 1)}" y="${y + 24}" width="2" height="20" fill="${t.system}"${g ? ` filter="${g}"` : ''}/>
${text(labelX, y + 72, youLabel, 'caption', t.system, { anchor: 'middle' })}
${marks}`;
};

/** Rings mark where A, S, SSS and EX begin. */
const RINGS: RankGrade[] = ['A', 'S', 'SSS', 'EX'];

/** Stat web on the same log scale as the ladder: the shape shows where you stand among players, not raw counts. */
const radar = (ctx: Ctx, p: Player, cx: number, cy: number, radius: number): string => {
  const { t } = ctx;
  const pt = (i: number, f: number): [number, number] => {
    const a = ((-90 + i * 60) * Math.PI) / 180;
    return [cx + radius * f * Math.cos(a), cy + radius * f * Math.sin(a)];
  };
  const poly = (f: (i: number) => number) => [0, 1, 2, 3, 4, 5].map((i) => pt(i, f(i)).map(r).join(',')).join(' ');
  const rings = RINGS.map((rank) => {
    const f = ladderPos(STARTS[GRADES.indexOf(rank)]!);
    const [lx, ly] = pt(0, f);
    return `<polygon points="${poly(() => f)}" fill="none" stroke="${t.rank[rank]}" stroke-opacity="0.55"${rank === 'EX' ? '' : ' stroke-dasharray="3 3"'}/>${text(lx + 4, ly + 10, rank, 'code', t.rank[rank], { opacity: 0.85 })}`;
  }).join('');
  const axes = [0, 1, 2, 3, 4, 5].map((i) => { const [x, y] = pt(i, 1); return `<line x1="${cx}" y1="${cy}" x2="${r(x)}" y2="${r(y)}" stroke="${t.line}"/>`; }).join('');
  const values = p.stats.map((s) => Math.max(0.06, ladderPos(s.percentile)));
  const g = glow(ctx);
  const shape = `<polygon class="pulse" points="${poly((i) => values[i]!)}" fill="${t.system}" fill-opacity="0.22" stroke="${t.system}" stroke-width="2"${g ? ` filter="${g}"` : ''}/>`;
  const dots = p.stats.map((s, i) => {
    const [x, y] = pt(i, values[i]!);
    const dot = `<circle cx="${r(x)}" cy="${r(y)}" r="${FX[s.rank] ? 5 : 4}" fill="${t.rank[s.rank]}"/>`;
    return `${fxGlow(ctx, s.rank, dot)}${dot}`;
  }).join('');
  const labels = p.stats.map((s, i) => {
    const [x, y] = pt(i, 1.27);
    return `${text(x, y - 2, s.code, 'code', t.muted, { anchor: 'middle' })}${text(x, y + 12, s.rank, 'strong', t.rank[s.rank], { anchor: 'middle' })}`;
  }).join('');
  return `${rings}${axes}${shape}${dots}${labels}`;
};

export const statusWindow = (ctx: Ctx, p: Player): Rendered => {
  const W = 840, H = 612;
  const { t } = ctx;
  const f = frame(ctx, W, H, 'STATUS');
  const g = glow(ctx, true);
  const ladderY = f.y + 120;
  const rowsY = ladderY + 86;
  const rowsW = f.w - 16 - 288;
  const boxX = f.x + f.w - 288;
  const right = W - 20 - 76 - 16;
  const body = `${f.svg}
${text(f.x, f.y + 28, `LV. ${p.level}`, 'level', t.system, g ? { filter: g } : {})}
${text(f.x, f.y + 56, fit(p.raw.login, 'name', 420), 'name', t.ink)}
${titleLine(ctx, p, f.x, f.y + 80, 420)}
${text(f.x, f.y + 102, fit(classLine(p), 'body', 460), 'body', t.muted)}
${label(right, f.y + 16, 'Overall rank', ctx, { anchor: 'end' })}
${text(right, f.y + 46, topShare(p.overallPercentile), 'value', t.ink, { anchor: 'end', size: 22 })}
${text(right, f.y + 66, 'OF REGULAR GITHUB PLAYERS', 'code', t.muted, { anchor: 'end' })}
${sigil(ctx, p.overall, W - 20 - 76, f.y + 4, 76, 76, 'hero', { pulse: true })}
${ladder(ctx, p, f.x, ladderY, f.w, false)}
${p.stats.map((s, i) => statRow(ctx, s, f.x, rowsY + i * 48, rowsW, i % 2 === 0)).join('\n')}
<path d="${cut(boxX, rowsY, 288, 288, 8)}" fill="${t.void}"/>
${radar(ctx, p, boxX + 144, rowsY + 144, 98)}
${footer(ctx, p.raw.login, `${synced(p)} · RANKED AMONG REGULAR PLAYERS`, W, H)}`;
  return {
    width: W, height: H, title: `${p.raw.login}: status window`,
    desc: `Level ${p.level}, overall rank ${p.overall} (${topShare(p.overallPercentile).toLowerCase()} of regular GitHub players), ${p.jobClass.name}. ${p.stats.map((s) => `${s.code} ${s.rank} ${topShare(s.percentile).toLowerCase()} (${s.value} ${s.source})`).join(', ')}.`,
    body,
  };
};

export const hunterCard = (ctx: Ctx, p: Player): Rendered => {
  const W = 840, H = 244;
  const { t } = ctx;
  const f = frame(ctx, W, H, 'HUNTER LICENSE');
  const mini = (s: Stat, i: number) => {
    const x = 452 + (i % 3) * 124;
    const y = f.y + 4 + Math.floor(i / 3) * 64;
    return `${sigil(ctx, s.rank, x, y + 4, 48, 32)}${label(x + 58, y + 10, s.code, ctx)}${text(x + 58, y + 28, fmtShort(s.value), 'value', t.ink)}${text(x + 58, y + 43, topShare(s.percentile), 'code', t.muted)}`;
  };
  const body = `${f.svg}
${label(f.x + 38, f.y + 6, 'Rank', ctx, { anchor: 'middle' })}
${sigil(ctx, p.overall, f.x, f.y + 16, 76, 76, 'hero', { pulse: true })}
${text(f.x + 38, f.y + 112, topShare(p.overallPercentile), 'caption', t.ink, { anchor: 'middle' })}
${text(f.x + 104, f.y + 22, fit(p.raw.login, 'name', 320), 'name', t.ink)}
${p.raw.name ? text(f.x + 104, f.y + 44, fit(p.raw.name, 'body', 320), 'body', t.muted) : ''}
${text(f.x + 104, f.y + 66, fit(`${p.jobClass.name} · ${p.jobClass.element} · LV. ${p.level}`, 'body', 320), 'body', t.ink)}
${titleLine(ctx, p, f.x + 104, f.y + 88, 320)}
${text(f.x + 104, f.y + 110, `AWAKENED ${p.raw.createdAt.slice(0, 10)}`, 'caption', t.muted)}
${p.stats.map(mini).join('\n')}
${footer(ctx, p.raw.login, synced(p), W, H)}`;
  return {
    width: W, height: H, title: `${p.raw.login}: hunter license`,
    desc: `Hunter rank ${p.overall}, ${topShare(p.overallPercentile).toLowerCase()} of regular GitHub players, level ${p.level}, ${p.jobClass.name}${p.equippedTitle ? `, title ${p.equippedTitle.title}` : ''}.`,
    body,
  };
};

export const statRune = (ctx: Ctx, p: Player, s: Stat): Rendered => {
  const W = 200, H = 134;
  const { t } = ctx;
  const f = frame(ctx, W, H, null, { padX: 14 });
  const body = `${f.svg}
${sigil(ctx, s.rank, 18, 18, 54, 48)}
${label(84, 36, s.code, ctx)}
${text(84, 58, fit(s.source, 'body', 100), 'body', t.ink)}
${text(18, 98, fmtShort(s.value), 'value', t.ink)}
${text(182, 98, topShare(s.percentile), 'caption', t.ink, { anchor: 'end' })}
<rect x="18" y="108" width="164" height="2" fill="${t.raised}"/>
<rect class="grow" x="18" y="108" width="${r(164 * s.progress)}" height="2" fill="${t.rank[s.rank]}"/>`;
  return { width: W, height: H, title: `${s.code}: rank ${s.rank}`, desc: `${s.code} rank ${s.rank}, ${topShare(s.percentile).toLowerCase()}, from ${s.value} ${s.source}.`, body };
};

export const ladderWidget = (ctx: Ctx, p: Player): Rendered => {
  const W = 840, H = 272;
  const { t } = ctx;
  const f = frame(ctx, W, H, 'RANK LADDER');
  const body = `${f.svg}
${label(f.x, f.y + 6, 'Where you stand among regular players', ctx)}
${text(f.x + f.w, f.y + 6, 'E to EX, log scale of the top share', 'caption', t.muted, { anchor: 'end' })}
${ladder(ctx, p, f.x, f.y + 22, f.w, true)}
${footer(ctx, p.raw.login, synced(p), W, H)}`;
  return {
    width: W, height: H, title: `${p.raw.login}: rank ladder`,
    desc: `Overall ${p.overall}, ${topShare(p.overallPercentile).toLowerCase()} of regular GitHub players. ${p.stats.map((s) => `${s.code} ${topShare(s.percentile).toLowerCase()}`).join(', ')}.`,
    body,
  };
};

export const statWebWidget = (ctx: Ctx, p: Player): Rendered => {
  const W = 420, H = 280;
  const { t } = ctx;
  const f = frame(ctx, W, H, 'STAT WEB');
  const x = f.x + 212;
  const legend = RINGS.map((rank, i) => {
    const y = f.y + 112 + i * 16;
    return `<line x1="${x}" y1="${y - 3.5}" x2="${x + 14}" y2="${y - 3.5}" stroke="${t.rank[rank]}"${rank === 'EX' ? '' : ' stroke-dasharray="3 2"'}/>${text(x + 20, y, `${rank} FROM ${startTop(GRADES.indexOf(rank))}`, 'code', t.muted)}`;
  }).join('');
  const body = `${f.svg}
${radar(ctx, p, f.x + 96, f.y + 100, 64)}
${label(x, f.y + 10, 'Overall', ctx)}
${sigil(ctx, p.overall, x, f.y + 20, 48, 32)}
${text(x + 58, f.y + 41, topShare(p.overallPercentile), 'value', t.ink, { size: 13 })}
${text(x, f.y + 76, 'AXES: SHARE OF PLAYERS', 'code', t.muted)}
${text(x, f.y + 90, 'YOU BEAT, LOG SCALE', 'code', t.muted)}
${legend}
${footer(ctx, p.raw.login, synced(p), W, H)}`;
  return {
    width: W, height: H, title: `${p.raw.login}: stat web`,
    desc: `Six stats on a percentile web. ${p.stats.map((s) => `${s.code} ${s.rank} ${topShare(s.percentile).toLowerCase()}`).join(', ')}.`,
    body,
  };
};
