import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPlayer } from '../src/application/player.js';
import { resolveConfig } from '../src/config/config.js';
import { buildBlock, END, injectBlock, START } from '../src/cli/readme.js';
import { embedFonts } from '../src/infrastructure/fonts.js';
import { contrast } from '../src/presentation/theme/color.js';
import { THEMES } from '../src/presentation/theme/themes.js';
import { renderWidgets } from '../src/presentation/widgets/index.js';
import { calendar, rawProfile } from './fixture.js';

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
        const { config } = resolveConfig({ username: 'player-one', theme: theme.id, motion, activity, icons: motion === 'calm' ? 'brand' : 'rune' });
        const player = buildPlayer(raw, config.title);
        for (const mode of ['dark', 'light'] as const) {
          for (const file of renderWidgets(player, config, mode)) wellFormed(file.svg, `${theme.id}/${mode}/${motion}/${activity}/${file.name}`);
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
  const block = buildBlock(files, 'awaken', true, (f) => f.name);
  assert.match(block, /quest-dark\.svg[^]*?width="49%"[^]*?skills-dark\.svg/);
  assert.equal((block.match(/width="24%"/g) ?? []).length, 6);
  const first = injectBlock('# Me\n', block);
  assert.equal(first.appended, true);
  const second = injectBlock(first.text, block.replace('quest', 'QUEST'));
  assert.equal(second.appended, false);
  assert.equal(second.text.split(START).length, 2);
  assert.equal(second.text.split(END).length, 2);
});
