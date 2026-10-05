import { existsSync } from 'node:fs';
import { appendFile, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { resolveArsenal } from '../application/arsenal.js';
import { buildPlayer } from '../application/player.js';
import { diffProgress, type Snapshot } from '../application/progress.js';
import { quoteOfTheDay, quotePool } from '../application/quotes.js';
import { resolveConfig, type FileConfig } from '../config/config.js';
import { embedFonts } from '../infrastructure/fonts.js';
import { fetchFeeds, fetchSpotlight } from '../infrastructure/extras.js';
import { fetchRawProfile, GithubError } from '../infrastructure/githubClient.js';
import { TECH_ICONS } from '../presentation/svg/brandIcons.js';
import { resolveTheme } from '../presentation/theme/themes.js';
import { layoutName, layoutWidgets, renderLayout } from '../presentation/layouts.js';
import type { WidgetFile } from '../presentation/widgets/index.js';
import { buildBlock, injectBlock } from './readme.js';

const { values: args } = parseArgs({
  options: {
    config: { type: 'string', default: process.env.AWAKEN_CONFIG || 'awaken.json' },
    username: { type: 'string' },
    out: { type: 'string' },
    readme: { type: 'string' },
    'no-readme': { type: 'boolean', default: false },
  },
});

const fail = (message: string): never => {
  console.error(`::error::${message}`);
  process.exit(1);
};

const loadFileConfig = async (path: string): Promise<FileConfig> => {
  if (!existsSync(path)) {
    console.log(`No ${path} found, using defaults.`);
    return {};
  }
  try {
    return JSON.parse(await readFile(path, 'utf8')) as FileConfig;
  } catch (err) {
    return fail(`${path} is not valid JSON: ${(err as Error).message}`);
  }
};

const main = async () => {
  const token = process.env.AWAKEN_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) fail('No token. Set GITHUB_TOKEN (the Action passes it for you).');

  const fileConfig = await loadFileConfig(args.config!);
  const { config, problems } = resolveConfig({
    ...fileConfig,
    username: args.username ?? fileConfig.username ?? process.env.GITHUB_REPOSITORY_OWNER ?? '',
    ...(args.out ? { outDir: args.out } : {}),
    ...(args['no-readme'] ? { readme: null } : args.readme ? { readme: args.readme } : {}),
  });
  if (problems.length) fail(`awaken.json has problems:\n- ${problems.join('\n- ')}`);

  console.log(`Awakening ${config.username} (layout ${layoutName(config.layout)}, theme ${config.theme}, activity ${config.activity}, motion ${config.motion})`);
  const raw = await fetchRawProfile(config.username, token!, { timeZone: config.timezone, commitHours: config.hours });

  // Extras: spotlight, feeds, quote of the day, and what changed since the last run.
  const snapshotPath = join(config.outDir, 'player.json');
  const previous = existsSync(snapshotPath) ? (JSON.parse(await readFile(snapshotPath, 'utf8')) as Snapshot) : null;
  const player = buildPlayer(raw, config.title, previous?.quests ?? null, true);
  if (player.quests) console.log(`Daily quests for ${player.quests.judged.date}: ${player.quests.judged.cleared}/${player.quests.judged.quests.length} cleared.`);
  const { extras } = config;
  const [spotlight, feed] = await Promise.all([
    fetchSpotlight(raw.login, token!, extras.spotlight).catch((err) => {
      console.log(`::warning::Could not read the spotlight repositories: ${(err as Error).message}`);
      return [];
    }),
    fetchFeeds(extras.feeds),
  ]);
  const arsenal = resolveArsenal(extras.arsenal, (slug) => slug in TECH_ICONS);
  if (arsenal.monograms.length) console.log(`No logo for ${arsenal.monograms.join(', ')}; drawn as monograms.`);
  const events = diffProgress(previous, {
    level: player.level,
    overall: player.overall,
    stats: player.stats.map(({ code, rank }) => ({ code, rank })),
    achievements: player.achievements.map(({ id, tier }) => ({ id, tier })),
  }, raw.fetchedAt);
  player.extras = {
    config: extras,
    arsenal: arsenal.items,
    spotlight,
    feed,
    quote: quoteOfTheDay(quotePool(extras.quotes), raw.login, raw.fetchedAt),
    events,
  };
  if (events.length && previous) console.log(`Progress since the last run: ${events.filter((e) => e.at === raw.fetchedAt).map((e) => `${e.subject} ${e.from} → ${e.to}`).join(', ') || 'none new'}`);
  if (config.title !== 'auto' && player.equippedTitle?.id !== config.title) {
    console.log(`::warning::Title "${config.title}" is not earned yet; showing "${player.equippedTitle?.title ?? 'none'}" instead.`);
  }

  const theme = resolveTheme(config.theme);
  const hasLight = theme.light !== theme.dark;
  const modes = hasLight ? (['dark', 'light'] as const) : (['dark'] as const);

  await mkdir(config.outDir, { recursive: true });
  let darkRows: WidgetFile[][] = [];
  for (const mode of modes) {
    const rows = renderLayout(player, config, mode);
    if (mode === 'dark') darkRows = rows;
    await Promise.all(rows.flat().map(async (f) => writeFile(join(config.outDir, `${f.name}-${mode}.svg`), await embedFonts(f.svg))));
  }
  const darkFiles = darkRows.flat();
  const drawn = new Set(darkFiles.map((f) => f.widget));
  const skipped = layoutWidgets(config.layout, config.bento).filter((id) => !drawn.has(id) && id !== 'levelup');
  if (skipped.length) console.log(`Left out until awaken.json has their data: ${skipped.join(', ')}.`);

  // Images from an earlier layout would linger in the folder; remove the ones this tool made and did not redraw.
  const written = new Set(darkFiles.flatMap((f) => modes.map((m) => `${f.name}-${m}.svg`)));
  const ours = /^(hunter|status|ladder|web|levelup|banner|arsenal|bio|career|cv|board|oracle|quest|skills|contribution|achievements|combat|hours|activity|arise|raid|daily|bento|rune-[a-z]{3}|spotlight-\d|contact-\d+-[\w-]+)-(dark|light)\.svg$/;
  const stale = (await readdir(config.outDir)).filter((name) => ours.test(name) && !written.has(name));
  await Promise.all(stale.map((name) => rm(join(config.outDir, name))));
  if (stale.length) console.log(`Removed ${stale.length} images the layout no longer uses.`);

  const summary = {
    login: raw.login, level: player.level, overall: player.overall, overallPercentile: player.overallPercentile, layout: config.layout, class: player.jobClass,
    title: player.equippedTitle?.title ?? null,
    stats: player.stats.map(({ code, value, rank, percentile }) => ({ code, value, rank, percentile })),
    events,
    achievements: player.achievements.map(({ id, tier, value }) => ({ id, tier, value })),
    ...(player.questHistory ? { quests: player.questHistory } : previous?.quests ? { quests: previous.quests } : {}),
    syncedAt: raw.fetchedAt,
  };
  await writeFile(join(config.outDir, 'player.json'), JSON.stringify(summary, null, 2) + '\n');

  if (config.readme) {
    const titles = new Map(darkFiles.map((f) => [f.name, /<title id="t">([^<]*)<\/title>/.exec(f.svg)?.[1] ?? f.name]));
    const block = buildBlock(darkRows, config.outDir.replace(/\\/g, '/'), hasLight, (f) => titles.get(f.name) ?? f.name);
    const current = existsSync(config.readme) ? await readFile(config.readme, 'utf8') : '';
    const { text, appended } = injectBlock(current, block);
    await writeFile(config.readme, text);
    console.log(appended ? `Appended the Awaken block to ${config.readme}.` : `Updated the Awaken block in ${config.readme}.`);
  }

  if (process.env.GITHUB_OUTPUT) {
    await appendFile(process.env.GITHUB_OUTPUT, `out-dir=${config.outDir}\nreadme=${config.readme ?? ''}\n`);
  }
  console.log(`LV ${player.level} · rank ${player.overall} · ${player.jobClass.name} · ${darkFiles.length * modes.length} SVGs in ${config.outDir}/`);
};

main().catch((err) => fail(err instanceof GithubError ? err.message : (err as Error).stack ?? String(err)));
