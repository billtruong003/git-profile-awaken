// Renders the images the project README shows, from one real profile. Run: npm run demo
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { buildPlayer } from '../src/application/player.js';
import { resolveConfig } from '../src/config/config.js';
import { embedFonts } from '../src/infrastructure/fonts.js';
import { fetchRawProfile } from '../src/infrastructure/githubClient.js';
import { THEMES } from '../src/presentation/theme/themes.js';
import { renderWidgets } from '../src/presentation/widgets/index.js';

const username = process.env.DEMO_USER ?? 'billtruong003';
const token = process.env.GITHUB_TOKEN;
if (!token) throw new Error('Set GITHUB_TOKEN.');

const out = 'demo';
await mkdir(join(out, 'themes'), { recursive: true });

const { config } = resolveConfig({ username, title: 'night-owl', timezone: 'Asia/Ho_Chi_Minh', icons: 'rune' });
const raw = await fetchRawProfile(username, token, { timeZone: config.timezone, commitHours: true });
const player = buildPlayer(raw, config.title);

const write = async (name: string, svg: string) => writeFile(join(out, name), await embedFonts(svg));

for (const mode of ['dark', 'light'] as const) {
  for (const file of renderWidgets(player, config, mode)) await write(`${file.name}-${mode}.svg`, file.svg);
}
const raid = renderWidgets(player, { ...config, activity: 'raid' }, 'dark', ['activity'])[0]!;
await write('raid-dark.svg', raid.svg);
const brand = renderWidgets(player, { ...config, icons: 'brand' }, 'dark', ['skills'])[0]!;
await write('skills-brand-dark.svg', brand.svg);

for (const theme of THEMES) {
  const card = renderWidgets(player, { ...config, theme: theme.id }, 'dark', ['hunter'])[0]!;
  await write(`themes/${theme.id}.svg`, card.svg);
}
console.log(`Demo images for ${username} written to ${out}/`);

// Hall of Hunters: well-known developers, drawn from their public data with each one's own theme.
export const HUNTERS = [
  { login: 'torvalds', theme: 'solo_leveling', activity: 'raid' },
  { login: 'gaearon', theme: 'frost_elf', activity: 'arise' },
  { login: 'sindresorhus', theme: 'hunter_association', activity: 'arise' },
  { login: 'yyx990803', theme: 'genshin_anemo', activity: 'raid' },
  { login: 'karpathy', theme: 'shadow_monarch', activity: 'arise' },
  { login: 'antfu', theme: 'red_gate', activity: 'arise' },
] as const;

await mkdir(join(out, 'hunters'), { recursive: true });
for (const hunter of HUNTERS) {
  const { config: c } = resolveConfig({ username: hunter.login, theme: hunter.theme, activity: hunter.activity, motion: 'full' });
  const hero = buildPlayer(await fetchRawProfile(hunter.login, token, { timeZone: 'UTC', commitHours: false }), 'auto');
  for (const file of renderWidgets(hero, c, 'dark', ['hunter', 'activity'])) await write(`hunters/${hunter.login}-${file.name}.svg`, file.svg);
  console.log(`  ${hunter.login}: LV ${hero.level}, rank ${hero.overall}, ${hero.jobClass.name}, title ${hero.equippedTitle?.title ?? 'none'}`);
}
