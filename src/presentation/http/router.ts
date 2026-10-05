import type { IncomingMessage, ServerResponse } from 'node:http';
import { WIDGET_IDS, type Player, type WidgetId } from '../../domain/types.js';
import { buildPlayer } from '../../application/player.js';
import { resolveConfig, type FileConfig } from '../../config/config.js';
import { embedFonts } from '../../infrastructure/fonts.js';
import { fetchRawProfile, GithubError } from '../../infrastructure/githubClient.js';
import { isValidGithubUsername } from '../../infrastructure/sanitizer.js';
import { buildErrorSvg } from '../svg/errorSvg.js';
import { THEME_IDS } from '../theme/themes.js';
import { renderWidgets } from '../widgets/index.js';
import { getSystemUiHtml } from './uiView.js';

const PLAYER_TTL_MS = 10 * 60 * 1000;
const MAX_ENTRIES = 500;
const players = new Map<string, { at: number; player: Promise<Player> }>();

/**
 * The hosted endpoint skips commit hours (the most expensive query); the GitHub Action fetches them.
 * One fetch per user is shared by every widget request in the cache window.
 */
const playerFor = (username: string, token: string, title: string): Promise<Player> => {
  const key = `${username.toLowerCase()}|${title}`;
  const hit = players.get(key);
  if (hit && Date.now() - hit.at < PLAYER_TTL_MS) return hit.player;
  const player = fetchRawProfile(username, token, { timeZone: 'UTC', commitHours: false }).then((raw) => buildPlayer(raw, title));
  player.catch(() => players.delete(key));
  if (players.size >= MAX_ENTRIES) players.delete(players.keys().next().value!);
  players.set(key, { at: Date.now(), player });
  return player;
};

const send = (res: ServerResponse, status: number, type: string, body: string, maxAge: number) => {
  res.setHeader('Content-Type', type);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', `public, max-age=${Math.min(maxAge, 300)}`);
  res.setHeader('CDN-Cache-Control', `public, s-maxage=${maxAge}, stale-while-revalidate=86400`);
  res.writeHead(status);
  res.end(body);
};

const sendError = (res: ServerResponse, status: number, title: string, detail: string) =>
  send(res, 200, 'image/svg+xml; charset=utf-8', buildErrorSvg(status, title, detail), 60);

/** v1 URLs (widget=stat&target=STR, widget=skill) keep working in READMEs that still use them. */
export const legacyWidget = (widget: string, target: string | null): string => {
  if (widget === 'skill') return 'skills';
  if (widget === 'stat') return `rune-${(target ?? 'str').toLowerCase()}`;
  return widget;
};

const handleApi = async (res: ServerResponse, url: URL): Promise<void> => {
  const q = url.searchParams;
  const token = process.env.GITHUB_TOKEN;
  if (!token) return sendError(res, 500, 'System token missing', 'GITHUB_TOKEN is not set on this server.');

  const username = q.get('username') ?? '';
  if (!isValidGithubUsername(username)) return sendError(res, 400, 'Invalid player ID', 'Pass ?username= with a GitHub username.');

  const widgetParam = legacyWidget(q.get('widget') ?? 'status', q.get('target'));
  const rune = /^rune-(str|agi|int|vit|luk|cha)$/.exec(widgetParam);
  const widget = (rune ? 'runes' : widgetParam) as WidgetId;
  if (!(WIDGET_IDS as readonly string[]).includes(widget)) return sendError(res, 400, 'Unknown widget', `Use one of: ${WIDGET_IDS.join(', ')}, rune-str…rune-cha.`);

  const options = Object.fromEntries(
    ['theme', 'title', 'activity', 'icons', 'motion', 'timezone'].flatMap((k) => (q.get(k) ? [[k, q.get(k)]] : [])),
  ) as FileConfig;
  const { config } = resolveConfig({ ...options, username });
  const mode = q.get('mode') === 'light' ? 'light' : 'dark';

  try {
    const player = await playerFor(username, token, config.title);
    const files = renderWidgets(player, config, mode, [widget]);
    const file = rune ? files.find((f) => f.name === widgetParam) : files[0];
    if (!file) return sendError(res, 400, 'Unknown widget', widgetParam);
    send(res, 200, 'image/svg+xml; charset=utf-8', await embedFonts(file.svg), 1800);
  } catch (err) {
    if (err instanceof GithubError) {
      const status = { not_found: 404, auth: 401, rate_limit: 429, upstream: 500 }[err.code];
      return sendError(res, status, err.code === 'not_found' ? 'Hunter not found' : 'System anomaly', err.message);
    }
    console.error(err);
    sendError(res, 500, 'System anomaly', 'Something failed while drawing this widget.');
  }
};

export const handleRequest = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  switch (url.pathname) {
    case '/':
      return send(res, 200, 'text/html; charset=utf-8', getSystemUiHtml(), 300);
    case '/health':
      return send(res, 200, 'application/json', JSON.stringify({ status: 'operational', themes: THEME_IDS.length }), 0);
    case '/themes':
      return send(res, 200, 'application/json', JSON.stringify({ themes: THEME_IDS }), 3600);
    case '/api':
      return handleApi(res, url);
    default:
      return send(res, 404, 'application/json', JSON.stringify({ error: 'Not found', routes: ['/', '/api', '/health', '/themes'] }), 60);
  }
};
