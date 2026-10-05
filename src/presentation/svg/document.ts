import { escapeSvgText } from '../../infrastructure/sanitizer.js';
import { FONTS_PLACEHOLDER } from '../../infrastructure/fonts.js';
import { BRAND_ICONS } from './brandIcons.js';
import { ICONS, symbol } from './icons.js';
import { typeCss, type Ctx, type Rendered } from './kit.js';

/**
 * Motion levels. "full" loops the ambient effects, "calm" plays each entrance once,
 * "none" draws the final frame. Everything also respects the viewer's reduced-motion setting.
 */
const motionCss = (ctx: Ctx): string => {
  if (ctx.motion === 'none') return '';
  const base = `@keyframes grow{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes appear{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
.grow{transform-box:fill-box;transform-origin:left;animation:grow .9s cubic-bezier(.2,.8,.2,1) .2s both}
.appear{transform-box:fill-box;animation:appear .6s ease-out .4s both}`;
  const ambient = ctx.motion === 'full'
    ? `@keyframes pulse{0%,100%{opacity:1}50%{opacity:.62}}
@keyframes breathe{0%,100%{opacity:1}50%{opacity:.35}}
@keyframes flicker{0%,100%{opacity:1}3%{opacity:.4}5%{opacity:1}42%{opacity:1}43%{opacity:.55}44%{opacity:1}71%{opacity:.8}72%{opacity:1}}
@keyframes sweep{from{transform:translateX(0)}to{transform:translateX(200%)}}
.pulse{animation:pulse 2.6s ease-in-out infinite}
.breathe{animation:breathe 3.2s ease-in-out infinite}
.flicker{animation:flicker 6s linear infinite}
.sweep{animation:sweep 3.6s linear infinite}
@keyframes fxa{0%,100%{opacity:.3}50%{opacity:.95}}
@keyframes fxs{0%,100%{opacity:.45}50%{opacity:1}}
@keyframes fxsss{0%,100%{opacity:.8}20%{opacity:1}22%{opacity:.25}26%{opacity:.9}60%{opacity:1}64%{opacity:.5}}
@keyframes shine{0%{transform:translateX(0)}60%,100%{transform:translateX(330%)}}
@keyframes twinkle{0%,100%{opacity:0;transform:scale(.3)}50%{opacity:1;transform:scale(1)}}
@keyframes flow{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.fx-a{animation:fxa 3.2s ease-in-out infinite}.fx-s{animation:fxs 2.4s ease-in-out infinite}.fx-ss{animation:fxs 2s ease-in-out infinite}
.fx-sss{animation:fxsss 2.2s linear infinite}.fx-ex{animation:fxs 1.8s ease-in-out infinite}
.shine{opacity:1;transform-box:fill-box;animation:shine 3s ease-in-out infinite}
.spark{transform-box:fill-box;transform-origin:center;animation:twinkle 2.4s ease-in-out infinite both}
.flow{transform-box:fill-box;animation:flow 3s linear infinite}`
    : '';
  return `@media (prefers-reduced-motion:no-preference){${base}${ambient}}`;
};

const defs = (ctx: Ctx, rendered: Rendered): string => {
  const { rank } = ctx.t;
  const icons = [...new Set(rendered.symbols ?? [])]
    .map((id) => (id.startsWith('brand:') ? symbol(id, BRAND_ICONS[id.slice(6)] ?? '', '0 0 24 24') : symbol(id, ICONS[id] ?? '')))
    .join('');
  return `<defs>
<filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="glow-lg" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="fx-blur" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="3.2"/></filter>
<linearGradient id="shine" x1="0" x2="1" y1="0" y2="0.3"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".5"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<linearGradient id="exflow" x1="0" x2="1">${[rank.EX, rank.S, ctx.t.mana, rank.A, rank.EX, rank.S, ctx.t.mana, rank.A, rank.EX].map((c, i) => `<stop offset="${(i / 8).toFixed(3)}" stop-color="${c}"/>`).join('')}</linearGradient>
<linearGradient id="prism" x1="0" x2="1"><stop offset="0" stop-color="${rank.SSS}" stop-opacity="0"/><stop offset=".3" stop-color="${rank.S}" stop-opacity=".45"/><stop offset=".5" stop-color="${ctx.t.mana}" stop-opacity=".55"/><stop offset=".7" stop-color="${rank.A}" stop-opacity=".45"/><stop offset="1" stop-color="${rank.C}" stop-opacity="0"/></linearGradient>
${icons}${rendered.defs ?? ''}
</defs>`;
};

export const toSvg = (ctx: Ctx, rendered: Rendered): string => {
  const { width, height } = rendered;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="t d">
<title id="t">${escapeSvgText(rendered.title)}</title>
<desc id="d">${escapeSvgText(rendered.desc)}</desc>
<style>${FONTS_PLACEHOLDER}${typeCss()}.tight{letter-spacing:-1px}.shine{opacity:0}${motionCss(ctx)}${rendered.css ?? ''}</style>
${defs(ctx, rendered)}
${rendered.body}
</svg>`;
};
