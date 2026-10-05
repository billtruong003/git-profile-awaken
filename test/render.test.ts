import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPlayer } from '../src/application/player.js';
import { resolveConfig } from '../src/config/config.js';
import { buildBlock, END, injectBlock, START } from '../src/cli/readme.js';
import { embedFonts } from '../src/infrastructure/fonts.js';
import { contrast } from '../src/presentation/theme/color.js';
import { THEMES } from '../src/presentation/theme/themes.js';
import { LAYOUT_IDS, WIDGET_IDS, type LayoutId } from '../src/domain/types.js';
import { LAYOUTS, pairRows, renderBento, renderLayout } from '../src/presentation/layouts.js';
import { renderWidgets } from '../src/presentation/widgets/index.js';
import { calendar, fullConfig, fullExtras, rawProfile } from './fixture.js';

test('every theme meets the Awaken System contrast rules in both modes', () => {
  for (const theme of THEMES) {
    for (const mode of ['dark', 'light'] as const) {
      const t = theme[mode];
      const where = `${theme.id}/${mode}`;
      assert.ok(contrast(t.ink, t.panel) >= 7, `${where}: ink`);
      assert.ok(contrast(t.muted, t.raised) >= 4.5, `${where}: muted`);
      assert.ok(contrast(t.system, t.raised) >= 4.5, `${where}: system`);
      assert.ok(contrast(t.frame, t.panel) >= 3, `${where}: frame`);
      assert.ok(contrast(t.alert, t.raised) >= 4.5, `${where}: alert`);
      for (const [grade, color] of Object.entries(t.rank)) assert.ok(contrast(color, t.raised) >= 3, `${where}: rank ${grade}`);
    }
  }
});

const wellFormed = (svg: string, where: string) => {
  assert.ok(svg.startsWith('<svg') && svg.trimEnd().endsWith('</svg>'), `${where}: root`);
  assert.ok(!/undefined|NaN|\[object Object\]/.test(svg), `${where}: leaked value`);
  for (const tag of ['text', 'g', 'symbol', 'defs', 'clipPath', 'filter']) {
    const open = (svg.match(new RegExp(`<${tag}[\\s>]`, 'g')) ?? []).length;
    const close = (svg.match(new RegExp(`</${tag}>`, 'g')) ?? []).length;
    assert.equal(open, close, `${where}: <${tag}> balance`);
  }
  for (const id of svg.match(/href="#([^"]+)"/g) ?? []) {
    assert.ok(svg.includes(`id="${id.slice(7, -1)}"`), `${where}: missing ${id}`);
  }
};

test('every widget renders for every theme, mode, motion and activity', () => {
  const raw = rawProfile();
  for (const theme of THEMES) {
    for (const motion of ['full', 'calm', 'none'] as const) {
      for (const activity of ['arise', 'raid'] as const) {
        const { config } = resolveConfig({ ...fullConfig, theme: theme.id, motion, activity, icons: motion === 'calm' ? 'brand' : 'rune' });
        const player = buildPlayer(raw, config.title);
        player.extras = fullExtras(config.extras);
        for (const mode of ['dark', 'light'] as const) {
          const files = renderWidgets(player, config, mode, [...WIDGET_IDS]);
          for (const file of files) wellFormed(file.svg, `${theme.id}/${mode}/${motion}/${activity}/${file.name}`);
          assert.ok(new Set(files.map((f) => f.widget)).size === WIDGET_IDS.length, `${theme.id}/${motion}: every widget drew`);
        }
      }
    }
  }
});

test('user text is escaped', () => {
  const player = buildPlayer(rawProfile(), 'auto');
  const { config } = resolveConfig({ username: 'player-one' });
  const quest = renderWidgets(player, config, 'dark', ['quest'])[0]!.svg;
  assert.ok(quest.includes('&lt;friends&gt;') && !quest.includes('<friends>'));
});

test('the daily widget switches to the Penalty Zone after a missed day', () => {
  const { config } = resolveConfig({ username: 'player-one' });
  const missed = buildPlayer(rawProfile({ year: { ...rawProfile().year, calendar: calendar((i) => (i >= 364 ? 0 : 1)) } }), 'auto');
  assert.match(renderWidgets(missed, config, 'dark', ['daily'])[0]!.svg, /PENALTY ZONE/);
  const active = buildPlayer(rawProfile({ year: { ...rawProfile().year, calendar: calendar(() => 1) } }), 'auto');
  assert.doesNotMatch(renderWidgets(active, config, 'dark', ['daily'])[0]!.svg, /PENALTY ZONE/);
});

test('fonts are embedded and cut down to the glyphs in use', async () => {
  const { config } = resolveConfig({ username: 'player-one' });
  const svg = renderWidgets(buildPlayer(rawProfile(), 'auto'), config, 'dark', ['runes'])[0]!.svg;
  const out = await embedFonts(svg);
  assert.equal((out.match(/@font-face/g) ?? []).length, 5);
  assert.ok(out.length < 40_000, `rune is ${out.length} bytes`);
});

test('the README block pairs half widgets and replaces itself in place', () => {
  const { config } = resolveConfig({ username: 'player-one' });
  const files = renderWidgets(buildPlayer(rawProfile(), 'auto'), config, 'dark');
  const block = buildBlock(pairRows(files), 'awaken', true, (f) => f.name);
  assert.match(block, /quest-dark\.svg[^]*?width="49%"[^]*?skills-dark\.svg/);
  assert.equal((block.match(/width="24%"/g) ?? []).length, 6);
  const first = injectBlock('# Me\n', block);
  assert.equal(first.appended, true);
  const second = injectBlock(first.text, block.replace('quest', 'QUEST'));
  assert.equal(second.appended, false);
  assert.equal(second.text.split(START).length, 2);
  assert.equal(second.text.split(END).length, 2);
});

test('every banner style renders, and auto follows the layout', () => {
  for (const style of ['typewriter', 'glitch', 'system'] as const) {
    for (const motion of ['full', 'calm', 'none'] as const) {
      const { config } = resolveConfig({ ...fullConfig, banner: { lines: fullConfig.banner.lines, style }, motion });
      const player = buildPlayer(rawProfile(), 'auto');
      player.extras = fullExtras(config.extras);
      wellFormed(renderWidgets(player, config, 'dark', ['banner'])[0]!.svg, `banner ${style} ${motion}`);
    }
  }
  const { config } = resolveConfig({ ...fullConfig, layout: 'showcase' });
  const player = buildPlayer(rawProfile(), 'auto');
  player.extras = fullExtras(config.extras);
  assert.match(renderLayout(player, config, 'dark')[0]![0]!.svg, /\[ PLAYER \]/);
});

test('zero-config layouts draw with only a username and skip what needs history or extras', () => {
  const player = buildPlayer(rawProfile(), 'auto');
  for (const id of LAYOUT_IDS) {
    const { config, problems } = resolveConfig({ username: 'player-one', layout: id });
    assert.deepEqual(problems, []);
    const rows = renderLayout(player, config, 'dark');
    for (const file of rows.flat()) wellFormed(file.svg, `${id}/${file.name}`);
    if (id in LAYOUTS && LAYOUTS[id as keyof typeof LAYOUTS].zeroConfig) assert.ok(rows.length >= 4, `${id} has rows`);
  }
  const names = renderLayout(player, resolveConfig({ username: 'player-one' }).config, 'dark').flat().map((f) => f.name);
  assert.equal(names[0], 'hunter', 'no Level Up without an earlier run');
  assert.ok(!names.some((n) => n.startsWith('spotlight')), 'no spotlight without pinned repositories');
  assert.ok(names.includes('web') && names.includes('ladder') && names.includes('oracle'));
});

test('the Bento layout is one image with unique ids and every tile inside it', () => {
  const player = buildPlayer(rawProfile(), 'auto');
  for (const layout of ['bento', 'bento_compact'] as LayoutId[]) {
    const { config } = resolveConfig({ username: 'player-one', layout });
    const bento = renderBento(player, config, 'dark');
    wellFormed(bento.svg, layout);
    const ids = bento.svg.match(/ id="[^"]+"/g) ?? [];
    assert.equal(new Set(ids).size, ids.length, `${layout}: duplicate ids`);
    assert.ok(bento.height > 400 && bento.width === 840);
  }
});

test('linked widgets are wrapped in links in the README', () => {
  const { config } = resolveConfig({ ...fullConfig, layout: 'portfolio' });
  const player = buildPlayer(rawProfile(), 'auto');
  player.extras = fullExtras(config.extras);
  const block = buildBlock(renderLayout(player, config, 'dark'), 'awaken', false, (f) => f.name);
  assert.match(block, /<a href="https:\/\/github.com\/player-one\/KeyStream"><img src="awaken\/spotlight-1-dark.svg"/);
  assert.match(block, /<a href="cv.pdf">/);
  assert.match(block, /<a href="mailto:me@example.com">/);
});
