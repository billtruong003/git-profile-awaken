import { existsSync } from 'node:fs';
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { buildPlayer } from '../application/player.js';
import { resolveConfig, type FileConfig } from '../config/config.js';
import { embedFonts } from '../infrastructure/fonts.js';
import { fetchRawProfile, GithubError } from '../infrastructure/githubClient.js';
import { resolveTheme } from '../presentation/theme/themes.js';
import { renderWidgets, type WidgetFile } from '../presentation/widgets/index.js';
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

  console.log(`Awakening ${config.username} (theme ${config.theme}, activity ${config.activity}, motion ${config.motion})`);
  const raw = await fetchRawProfile(config.username, token!, { timeZone: config.timezone, commitHours: config.hours });
  const player = buildPlayer(raw, config.title);
  if (config.title !== 'auto' && player.equippedTitle?.id !== config.title) {
    console.log(`::warning::Title "${config.title}" is not earned yet; showing "${player.equippedTitle?.title ?? 'none'}" instead.`);
  }

  const theme = resolveTheme(config.theme);
  const hasLight = theme.light !== theme.dark;
  const modes = hasLight ? (['dark', 'light'] as const) : (['dark'] as const);

  await mkdir(config.outDir, { recursive: true });
  let darkFiles: WidgetFile[] = [];
  for (const mode of modes) {
    const files = renderWidgets(player, config, mode);
    if (mode === 'dark') darkFiles = files;
    await Promise.all(files.map(async (f) => writeFile(join(config.outDir, `${f.name}-${mode}.svg`), await embedFonts(f.svg))));
  }

  const summary = {
    login: raw.login, level: player.level, overall: player.overall, class: player.jobClass,
    title: player.equippedTitle?.title ?? null,
    stats: player.stats.map(({ code, value, rank }) => ({ code, value, rank })),
    achievements: player.achievements.map(({ id, tier, value }) => ({ id, tier, value })),
    syncedAt: raw.fetchedAt,
  };
  await writeFile(join(config.outDir, 'player.json'), JSON.stringify(summary, null, 2) + '\n');

  if (config.readme) {
    const titles = new Map(darkFiles.map((f) => [f.name, /<title id="t">([^<]*)<\/title>/.exec(f.svg)?.[1] ?? f.name]));
    const block = buildBlock(darkFiles, config.outDir.replace(/\\/g, '/'), hasLight, (f) => titles.get(f.name) ?? f.name);
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
