import { resolveTheme } from '../theme/themes.js';
import { toSvg } from './document.js';
import { cut, fit, frame, text, type Ctx } from './kit.js';

const CODES: Record<number, string> = {
  400: 'INVALID_PARAMETER',
  401: 'AUTH_FAILURE',
  404: 'ENTITY_NOT_FOUND',
  429: 'MANA_DEPLETED',
  500: 'SYSTEM_FAILURE',
};

/** SystemNotice in its alert tone; it keeps a half-widget width so a broken README does not jump. */
export const buildErrorSvg = (status: number, title: string, detail: string): string => {
  const t = resolveTheme('solo_leveling').dark;
  const ctx: Ctx = { t, mode: 'dark', motion: 'calm', icons: 'rune' };
  const W = 420, H = 120;
  const f = frame(ctx, W, H, null, { accent: t.alert, edge: t.alert });
  const body = `${f.svg}
<path d="${cut(20, 22, 22, 20, 2)}" fill="${t.alert}"/>
${text(31, 37, '!', 'strong', t.panel, { anchor: 'middle' })}
${text(52, 37, fit(title.toUpperCase(), 'wtitle', 340), 'wtitle', t.alert)}
${text(20, 70, fit(detail, 'body', 380), 'body', t.ink)}
${text(20, 94, `${CODES[status] ?? 'UNKNOWN_ANOMALY'} · ${status}`, 'code', t.muted)}`;
  return toSvg(ctx, { width: W, height: H, title, desc: detail, body });
};
