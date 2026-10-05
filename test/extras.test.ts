import { test } from 'node:test';
import assert from 'node:assert/strict';
import { monogram, resolveArsenal } from '../src/application/arsenal.js';
import { diffProgress, type Snapshot } from '../src/application/progress.js';
import { BUILTIN_QUOTES, quoteOfTheDay } from '../src/application/quotes.js';
import { resolveConfig } from '../src/config/config.js';
import { parseFeed } from '../src/infrastructure/extras.js';
import { TECH_ICONS } from '../src/presentation/svg/brandIcons.js';

test('RSS items and Atom entries (YouTube) are both read', () => {
  const rss = `<rss><channel><title>My Blog</title>
    <item><title><![CDATA[Shaders &amp; me]]></title><link>https://blog.example/a</link><pubDate>Mon, 05 Oct 2026 10:00:00 GMT</pubDate></item>
    <item><title>No link</title></item></channel></rss>`;
  assert.deepEqual(parseFeed(rss, 'blog.example'), [{ title: 'Shaders & me', url: 'https://blog.example/a', date: '2026-10-05T10:00:00.000Z', source: 'My Blog' }]);

  const atom = `<feed xmlns="http://www.w3.org/2005/Atom"><title>Bill The Dev</title>
    <entry><title>Unity VR in 10 minutes</title><link rel="alternate" href="https://www.youtube.com/watch?v=abc"/><published>2026-09-30T12:00:00+00:00</published></entry></feed>`;
  const [video] = parseFeed(atom, 'youtube.com');
  assert.equal(video?.title, 'Unity VR in 10 minutes');
  assert.equal(video?.url, 'https://www.youtube.com/watch?v=abc');
  assert.equal(video?.source, 'Bill The Dev');
});

test('arsenal names resolve to icons through common spellings', () => {
  const { items, monograms } = resolveArsenal(['Unity', 'Next.js', 'nodejs', 'C#', 'Three.js', 'PostgreSQL', 'unity', 'Java', 'Adobe Photoshop'], (s) => s in TECH_ICONS);
  assert.deepEqual(items.map((i) => i.slug), ['unity', 'nextdotjs', 'nodedotjs', 'dotnet', 'threedotjs', 'postgresql', null, null]);
  assert.deepEqual(monograms, ['Java', 'Adobe Photoshop']);
  assert.deepEqual(['Java', 'Adobe Photoshop', 'C#', 'Go'].map(monogram), ['Ja', 'AP', 'C#', 'Go']);
  assert.ok(Object.keys(TECH_ICONS).length > 500);
});

test('progress events report level, rank and tier changes, and expire after a week', () => {
  const before: Snapshot = { level: 13, overall: 'D', stats: [{ code: 'STR', rank: 'B' }], achievements: [{ id: 'raider', tier: 0 }],
    events: [{ kind: 'level', subject: 'Level', from: '11', to: '12', at: '2026-09-20T00:00:00Z' }, { kind: 'level', subject: 'Level', from: '12', to: '13', at: '2026-10-02T00:00:00Z' }] };
  const after: Snapshot = { level: 14, overall: 'C', stats: [{ code: 'STR', rank: 'A' }], achievements: [{ id: 'raider', tier: 1 }] };
  const events = diffProgress(before, after, '2026-10-05T00:00:00Z');
  assert.deepEqual(events.map((e) => `${e.subject} ${e.from}>${e.to}`), ['Level 13>14', 'Overall rank D>C', 'STR B>A', 'raider 0>1', 'Level 12>13']);
  assert.deepEqual(diffProgress(null, after, '2026-10-05T00:00:00Z'), []);
});

test('the quote changes daily and differs between players', () => {
  const a = quoteOfTheDay(BUILTIN_QUOTES, 'alice', '2026-10-05T12:00:00Z');
  assert.equal(quoteOfTheDay(BUILTIN_QUOTES, 'ALICE', '2026-10-05T23:00:00Z'), a);
  assert.notEqual(quoteOfTheDay(BUILTIN_QUOTES, 'alice', '2026-10-06T12:00:00Z'), a);
  assert.equal(quoteOfTheDay([], 'alice', '2026-10-05T00:00:00Z'), null);
});

test('extras are validated field by field', () => {
  const ok = resolveConfig({
    username: 'player-one',
    socials: [{ type: 'youtube', url: 'https://youtube.com/@x' }, { type: 'email', url: 'mailto:me@example.com' }, { type: 'linkedin', url: 'https://linkedin.com/in/x' }],
    banner: { lines: ['Unity developer', 'Programming instructor'], style: 'glitch' },
    bio: { role: 'Game developer', location: 'Vietnam' },
    arsenal: ['Unity', 'C#'],
    feeds: ['https://example.com/feed.xml'],
    quotes: [{ text: 'Ship it.', author: 'Me' }],
  });
  assert.deepEqual(ok.problems, []);
  assert.equal(ok.config.extras.socials.length, 3);
  assert.equal(ok.config.extras.banner.style, 'glitch');

  const bad = resolveConfig({
    username: 'player-one',
    socials: [{ type: 'myspace', url: 'https://myspace.com' }, { type: 'x', url: 'http://x.com/me' }],
    banner: { lines: ['x'.repeat(80)], style: 'blink' },
    feeds: ['ftp://example.com'],
    quotes: [{ text: 'no author' }],
  });
  assert.equal(bad.problems.length, 6);
  assert.deepEqual(bad.config.extras.socials, []);
});

test('layouts, career and cv are validated', () => {
  assert.equal(resolveConfig({ username: 'player-one' }).config.layout, 'default');
  assert.equal(resolveConfig({ username: 'player-one', widgets: ['hunter'] }).config.layout, 'custom');
  const ok = resolveConfig({ username: 'player-one', layout: 'portfolio', career: [{ role: 'Dev', org: 'Studio', years: '2024', current: true }], cv: 'docs/cv.pdf' });
  assert.deepEqual(ok.problems, []);
  assert.deepEqual(ok.config.extras.career, [{ role: 'Dev', org: 'Studio', years: '2024', current: true }]);
  const bad = resolveConfig({ username: 'player-one', layout: 'grid' as never, career: [{ org: 'x' }], cv: '../secret.pdf' });
  assert.equal(bad.problems.length, 3);
  assert.equal(bad.config.extras.cv, null);
});

test('quote pools can be mixed with your own lines', async () => {
  const { DRY_QUOTES, quotePool } = await import('../src/application/quotes.js');
  const mine = { text: 'Ship it.', author: 'Me' };
  const { config, problems } = resolveConfig({ username: 'player-one', quotes: ['dry', mine] });
  assert.deepEqual(problems, []);
  assert.equal(quotePool(config.extras.quotes).length, DRY_QUOTES.length + 1);
  assert.equal(resolveConfig({ username: 'player-one', quotes: 'dry' }).config.extras.quotes, 'dry');
  assert.equal(resolveConfig({ username: 'player-one', quotes: ['funny'] }).problems.length, 1);
  assert.ok(DRY_QUOTES.length >= 40 && DRY_QUOTES.every((q) => q.text.length <= 160));
});

test('your own Bento rows are validated and drawn', async () => {
  const { renderBento } = await import('../src/presentation/layouts.js');
  const { buildPlayer } = await import('../src/application/player.js');
  const { rawProfile } = await import('./fixture.js');
  const ok = resolveConfig({ username: 'player-one', layout: 'bento', bento: [['hunter'], ['web', 'daily', 'oracle']] });
  assert.deepEqual(ok.problems, []);
  const short = renderBento(buildPlayer(rawProfile(), 'auto'), ok.config, 'dark');
  const full = renderBento(buildPlayer(rawProfile(), 'auto'), resolveConfig({ username: 'player-one', layout: 'bento' }).config, 'dark');
  assert.ok(short.height < full.height);
  assert.equal(resolveConfig({ username: 'player-one', bento: [['hunter', 'nope']] }).problems.length, 1);
  assert.equal(resolveConfig({ username: 'player-one', bento: [[]] }).problems.length, 1);
});
