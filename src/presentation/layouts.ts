import type { AwakenConfig, BannerStyle, LayoutId, Player, ThemeMode, WidgetId } from '../domain/types.js';
import { toSvg } from './svg/document.js';
import { r, type Rendered } from './svg/kit.js';
import { contextFor, renderPieces, toFile, type Piece, type WidgetFile } from './widgets/index.js';

export type StackLayout = Exclude<LayoutId, 'custom' | 'bento' | 'bento_compact'>;
export type BentoLayout = Extract<LayoutId, 'bento' | 'bento_compact'>;

export interface LayoutSpec {
  name: string;
  /** Rows of widgets; half widgets in one row sit side by side. */
  rows: WidgetId[][];
  /** Banner style when the config says "auto". */
  banner: Exclude<BannerStyle, 'auto'>;
  /** Works with only a username. The others show their extra widgets once awaken.json fills them in. */
  zeroConfig: boolean;
}

export const LAYOUTS: Record<StackLayout, LayoutSpec> = {
  default: {
    name: 'Default', banner: 'typewriter', zeroConfig: true,
    rows: [['levelup'], ['hunter'], ['ladder'], ['web', 'skills'], ['activity'], ['quest', 'contribution'], ['spotlight'], ['oracle', 'daily'], ['runes']],
  },
  classic: { name: 'Classic', banner: 'typewriter', zeroConfig: true, rows: [['hunter'], ['status'], ['quest', 'skills'], ['contribution', 'combat'], ['runes']] },
  stats: { name: 'Stats Sheet', banner: 'typewriter', zeroConfig: true, rows: [['status'], ['ladder'], ['combat', 'hours'], ['achievements'], ['runes']] },
  activity: { name: 'Activity First', banner: 'typewriter', zeroConfig: true, rows: [['arise'], ['raid'], ['daily', 'contribution'], ['hunter']] },
  minimal: { name: 'Minimal', banner: 'typewriter', zeroConfig: false, rows: [['banner'], ['hunter'], ['contacts']] },
  showcase: { name: 'Showcase', banner: 'glitch', zeroConfig: false, rows: [['banner'], ['activity'], ['levelup'], ['spotlight'], ['contacts']] },
  dashboard: { name: 'Dashboard', banner: 'typewriter', zeroConfig: false, rows: [['banner'], ['bio', 'skills'], ['quest', 'contribution'], ['daily', 'board'], ['activity']] },
  portfolio: { name: 'Portfolio', banner: 'glitch', zeroConfig: false, rows: [['banner'], ['bio', 'career'], ['arsenal'], ['spotlight'], ['contacts'], ['cv']] },
};

/** Bento rows: every tile in a row is scaled to one height so the row fills the width exactly. */
export const BENTOS: Record<BentoLayout, { name: string; rows: WidgetId[][] }> = {
  bento: { name: 'Bento', rows: [['hunter'], ['ladder', 'web'], ['skills', 'quest', 'daily'], ['activity'], ['contribution', 'combat', 'hours']] },
  bento_compact: { name: 'Bento Compact', rows: [['hunter'], ['ladder', 'daily'], ['activity']] },
};

export const isBento = (id: LayoutId): id is BentoLayout => id === 'bento' || id === 'bento_compact';

export const layoutName = (id: LayoutId): string => (id === 'custom' ? 'Custom' : isBento(id) ? BENTOS[id].name : LAYOUTS[id].name);

/** The widget ids a layout draws, in order. */
export const layoutWidgets = (id: LayoutId): WidgetId[] =>
  id === 'custom' ? [] : [...new Set((isBento(id) ? BENTOS[id] : LAYOUTS[id]).rows.flat())];

/** Splits images into README lines: full width alone, halves in pairs, runes and contacts four across. */
export const pairRows = (files: WidgetFile[]): WidgetFile[][] => {
  const rows: WidgetFile[][] = [];
  let pending: WidgetFile[] = [];
  const flush = () => {
    if (pending.length) rows.push(pending);
    pending = [];
  };
  for (const file of files) {
    if (file.width >= 800) {
      flush();
      rows.push([file]);
      continue;
    }
    if (pending.length && pending[0]!.width !== file.width) flush();
    pending.push(file);
    if ((file.width <= 200 && pending.length === 4) || (file.width > 200 && pending.length === 2)) flush();
  }
  flush();
  return rows;
};

/**
 * Bento: one SVG on a grid. Each tile is the widget itself, drawn at its own size and scaled into place, so
 * nothing wraps or drifts on GitHub. The trade-off is one link for the whole block.
 */
export const composeBento = (rows: Piece[][], title: string): Rendered => {
  const W = 840, pad = 10, gap = 10, inner = W - pad * 2;
  let y = pad;
  const parts: string[] = [];
  const css = new Set<string>();
  const defs: string[] = [];
  const symbols: string[] = [];
  for (const row of rows.filter((x) => x.length)) {
    const sum = row.reduce((s, piece) => s + piece.rendered.width / piece.rendered.height, 0);
    const height = (inner - gap * (row.length - 1)) / sum;
    let x = pad;
    for (const { rendered } of row) {
      const scale = height / rendered.height;
      parts.push(`<g transform="translate(${r(x)} ${r(y)}) scale(${scale.toFixed(4)})">${rendered.body}</g>`);
      if (rendered.css) css.add(rendered.css);
      if (rendered.defs) defs.push(rendered.defs);
      symbols.push(...(rendered.symbols ?? []));
      x += rendered.width * scale + gap;
    }
    y += height + gap;
  }
  return {
    width: W, height: Math.round(y - gap + pad), title,
    desc: rows.flat().map((piece) => piece.rendered.desc).join(' '),
    body: parts.join('\n'), css: [...css].join('\n'), defs: defs.join(''), symbols,
  };
};

export const renderBento = (p: Player, config: AwakenConfig, mode: ThemeMode): WidgetFile => {
  const ctx = contextFor(config, mode);
  const spec = BENTOS[isBento(config.layout) ? config.layout : 'bento'];
  const rows = spec.rows.map((ids) => ids.flatMap((id) => renderPieces(id, ctx, p, config).slice(0, 1)));
  const rendered = composeBento(rows, `${p.raw.login}: ${spec.name.toLowerCase()} profile`);
  return { name: 'bento', widget: 'hunter', svg: toSvg(ctx, rendered), width: rendered.width, height: rendered.height };
};

/** The README lines for the configured layout (or the custom widget list), in one theme mode. */
export const renderLayout = (p: Player, config: AwakenConfig, mode: ThemeMode): WidgetFile[][] => {
  const ctx = contextFor(config, mode);
  if (config.layout === 'custom') {
    return pairRows(config.widgets.flatMap((id) => renderPieces(id, ctx, p, config).map((piece) => toFile(ctx, id, piece))));
  }
  if (isBento(config.layout)) return [[renderBento(p, config, mode)]];
  const spec = LAYOUTS[config.layout];
  return spec.rows.flatMap((ids) => pairRows(ids.flatMap((id) => renderPieces(id, ctx, p, config, { bannerStyle: spec.banner }).map((piece) => toFile(ctx, id, piece)))));
};
