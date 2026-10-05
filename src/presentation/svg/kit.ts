import type { IconSet, Motion, RankGrade, ThemeMode } from '../../domain/types.js';
import { escapeSvgText } from '../../infrastructure/sanitizer.js';
import type { Tokens } from '../theme/themes.js';

export interface Ctx {
  t: Tokens;
  mode: ThemeMode;
  motion: Motion;
  icons: IconSet;
}

export interface Rendered {
  width: number;
  height: number;
  title: string;
  desc: string;
  body: string;
  /** Icon ids the body references with <use>. */
  symbols?: string[];
  css?: string;
  defs?: string;
}

// ---------- type scale (Awaken System) ----------
const DISPLAY = "'Chakra Petch','Segoe UI',system-ui,sans-serif";
const MONO = "'JetBrains Mono',ui-monospace,Consolas,monospace";

export const TYPE = {
  hero: { font: DISPLAY, size: 48, weight: 700, spacing: 0, em: 0.62 },
  level: { font: DISPLAY, size: 32, weight: 700, spacing: 1, em: 0.6 },
  name: { font: DISPLAY, size: 20, weight: 600, spacing: 0, em: 0.55 },
  rank: { font: DISPLAY, size: 20, weight: 700, spacing: 0, em: 0.62 },
  wtitle: { font: DISPLAY, size: 13, weight: 700, spacing: 3, em: 0.62 },
  body: { font: DISPLAY, size: 13, weight: 500, spacing: 0, em: 0.52 },
  strong: { font: DISPLAY, size: 13, weight: 600, spacing: 0, em: 0.54 },
  label: { font: DISPLAY, size: 12, weight: 600, spacing: 1.5, em: 0.6 },
  value: { font: MONO, size: 14, weight: 600, spacing: 0, em: 0.6 },
  caption: { font: MONO, size: 12, weight: 500, spacing: 0, em: 0.6 },
  code: { font: MONO, size: 10, weight: 500, spacing: 1, em: 0.6 },
} as const;
export type TypeStyle = keyof typeof TYPE;

export const typeCss = (): string =>
  Object.entries(TYPE)
    .map(([name, s]) => `.${name}{font:${s.weight} ${s.size}px ${s.font};letter-spacing:${s.spacing}px${s.font === MONO ? ';font-variant-numeric:tabular-nums' : ''}}`)
    .join('');

export const textWidth = (text: string, style: TypeStyle): number => {
  const s = TYPE[style];
  return text.length * (s.size * s.em + s.spacing);
};

export const fit = (text: string, style: TypeStyle, maxWidth: number): string => {
  if (textWidth(text, style) <= maxWidth) return text;
  let out = text;
  while (out.length > 1 && textWidth(out + '…', style) > maxWidth) out = out.slice(0, -1);
  return out.trimEnd() + '…';
};

interface TextOptions {
  anchor?: 'start' | 'middle' | 'end';
  cls?: string;
  opacity?: number;
  filter?: string;
}

export const text = (x: number, y: number, value: string, style: TypeStyle, fill: string, o: TextOptions = {}): string =>
  `<text x="${r(x)}" y="${r(y)}" class="${style}${o.cls ? ' ' + o.cls : ''}" fill="${fill}"${o.anchor && o.anchor !== 'start' ? ` text-anchor="${o.anchor}"` : ''}${o.opacity !== undefined ? ` opacity="${o.opacity}"` : ''}${o.filter ? ` filter="${o.filter}"` : ''}>${escapeSvgText(value)}</text>`;

export const label = (x: number, y: number, value: string, ctx: Ctx, o: TextOptions = {}): string =>
  text(x, y, value.toUpperCase(), 'label', ctx.t.muted, o);

export const r = (n: number): string => (Number.isInteger(n) ? String(n) : n.toFixed(1));

export const fmt = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 100_000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString('en-US');
};

/** Glow only on dark grounds, and only when motion/effects are on. */
export const glow = (ctx: Ctx, strong = false): string => (ctx.t.glow && ctx.motion !== 'none' ? `url(#${strong ? 'glow-lg' : 'glow'})` : '');
const glowAttr = (ctx: Ctx, strong = false): string => {
  const g = glow(ctx, strong);
  return g ? ` filter="${g}"` : '';
};

// ---------- shapes ----------
/** 45-degree cuts on the top-left and bottom-right corners. */
export const cut = (x: number, y: number, w: number, h: number, c: number): string =>
  `M${r(x + c)} ${r(y)}H${r(x + w)}V${r(y + h - c)}L${r(x + w - c)} ${r(y + h)}H${r(x)}V${r(y + c)}Z`;

export const FRAME_INSET = 4;
export const HEADER = 36;

export interface FrameBox {
  svg: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** SystemFrame: chamfered panel, bracketed title strip, two corner ticks outside the outline. */
export const frame = (ctx: Ctx, width: number, height: number, title: string | null, o: { accent?: string; edge?: string; padX?: number } = {}): FrameBox => {
  const { t } = ctx;
  const accent = o.accent ?? t.system;
  const edge = o.edge ?? t.frame;
  const i = FRAME_INSET;
  const w = width - i * 2;
  const h = height - i * 2;
  const padX = o.padX ?? 16;
  const header = title
    ? `<path d="M${i + 14} ${i}H${width - i}V${i + HEADER}H${i}V${i + 14}Z" fill="${t.raised}"/>
<line x1="${i}" y1="${i + HEADER + 0.5}" x2="${width - i}" y2="${i + HEADER + 0.5}" stroke="${t.line}"/>
${text(width / 2, i + 23, `[ ${title} ]`, 'wtitle', accent, { anchor: 'middle' })}`
    : '';
  const svg = `<path d="${cut(i, i, w, h, 14)}" fill="${t.panel}"/>
${header}
<path d="${cut(i + 0.75, i + 0.75, w - 1.5, h - 1.5, 13.7)}" fill="none" stroke="${edge}" stroke-width="1.5"/>
<path class="breathe" d="M${width - 15} 1H${width - 1}V15M1 ${height - 15}V${height - 1}H15" fill="none" stroke="${accent}" stroke-width="2"${glowAttr(ctx)}/>`;
  const top = title ? i + HEADER + 16 : i + 14;
  return { svg, x: i + padX, y: top, w: width - (i + padX) * 2, h: height - i - 16 - top };
};

export const footer = (ctx: Ctx, login: string, date: string, width: number, height: number): string =>
  text(width - 20, height - 18, `@${login} · SYNCED ${date}`, 'code', ctx.t.muted, { anchor: 'end' });

const TIER: Record<RankGrade, 0 | 1 | 2 | 3> = { E: 0, D: 0, C: 1, B: 1, A: 1, S: 2, SS: 2, SSS: 2, EX: 3 };
let sigilSeq = 0;

/** RankSigil: chamfered tile with the rank letter; the frame gains detail by tier. */
export const sigil = (ctx: Ctx, rank: RankGrade, x: number, y: number, w: number, h: number, style: 'rank' | 'hero' = 'rank', o: { pulse?: boolean } = {}): string => {
  const { t } = ctx;
  const color = t.rank[rank];
  const tier = TIER[rank];
  const c = h >= 70 ? 8 : 6;
  const sw = tier === 0 ? 1 : 2;
  const size = TYPE[style].size;
  const id = `sg${sigilSeq++}`;
  const prism = tier === 3
    ? `<clipPath id="${id}"><path d="${cut(x, y, w, h, c)}"/></clipPath><g clip-path="url(#${id})"><rect class="sweep" x="${x - w}" y="${y}" width="${w}" height="${h}" fill="url(#prism)"/></g>`
    : '';
  const inner = tier >= 2 ? `<path d="${cut(x + 4.5, y + 4.5, w - 9, h - 9, Math.max(2, c - 3))}" fill="none" stroke="${color}" stroke-width="1"/>` : '';
  const glowing = tier >= 2 ? glowAttr(ctx) : '';
  return `<g${o.pulse ? ' class="pulse"' : ''}>
<path d="${cut(x, y, w, h, c)}" fill="${t.void}"/>${prism}
<path d="${cut(x + sw / 2, y + sw / 2, w - sw, h - sw, c - sw * 0.3)}" fill="none" stroke="${color}" stroke-width="${sw}"${glowing}/>${inner}
${text(x + w / 2, y + h / 2 + size * 0.36, rank, style, color, { anchor: 'middle', ...(rank.length === 3 ? { cls: 'tight' } : {}) })}
</g>`;
};

/** Gauge: label left, real quantity right, square-ended bar below. */
export const gauge = (ctx: Ctx, x: number, y: number, w: number, name: string, caption: string, ratio: number, color: string, o: { ticks?: boolean; glow?: boolean } = {}): string => {
  const { t } = ctx;
  const fill = Math.max(0, Math.min(1, ratio)) * w;
  const ticks = o.ticks ? [0.25, 0.5, 0.75].map((q) => `<rect x="${r(x + w * q - 1)}" y="${y + 8}" width="2" height="6" fill="${t.panel}"/>`).join('') : '';
  return `${label(x, y, name, ctx)}
${text(x + w, y, caption, 'caption', t.ink, { anchor: 'end' })}
<rect x="${x}" y="${y + 8}" width="${w}" height="6" fill="${t.raised}"/>
<rect class="grow" x="${x}" y="${y + 8}" width="${r(fill)}" height="6" fill="${color}"${o.glow ? glowAttr(ctx) : ''}/>${ticks}`;
};

export const use = (icon: string, x: number, y: number, size: number, fill: string, extra = ''): string =>
  `<use href="#i-${icon}" x="${r(x)}" y="${r(y)}" width="${size}" height="${size}" fill="${fill}"${extra}/>`;

export const dot = (x: number, y: number, color: string, ring: string): string =>
  `<circle cx="${r(x)}" cy="${r(y)}" r="4" fill="${color}" stroke="${ring}" stroke-width="1"/>`;
