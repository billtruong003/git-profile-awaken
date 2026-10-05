import { readFile } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { join, normalize } from 'node:path';
import { LAYOUT_IDS, WIDGET_IDS, type WidgetId } from '../../domain/types.js';
import { buildPlayer } from '../../application/player.js';
import { resolveConfig, type FileConfig } from '../../config/config.js';
import { embedFonts } from '../../infrastructure/fonts.js';
import { GithubError } from '../../infrastructure/githubClient.js';
import { rawProfileFor, refreshDuePlayers } from '../../infrastructure/players.js';
import { isValidGithubUsername } from '../../infrastructure/sanitizer.js';
import { createStore } from '../../infrastructure/store.js';
import { buildErrorSvg } from '../svg/errorSvg.js';
import { THEME_IDS, THEME_PACKS } from '../theme/themes.js';
import { docsPage, isDocPath } from '../web/docs.js';
import { homePage } from '../web/home.js';
import { renderBento } from '../layouts.js';
import { renderWidgets } from '../widgets/index.js';

const store = createStore();
/** Widgets that draw awaken.json data or run history, which the public server does not have. */
const ACTION_ONLY = new Set<string>(['levelup', 'spotlight', 'contacts', 'bio', 'career', 'cv', 'board']);
const CRON_BUDGET_MS = 50_000;

const send = (res: ServerResponse, status: number, type: string, body: string | Buffer, maxAge: number) => {
  res.setHeader('Content-Type', type);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', maxAge ? `public, max-age=${Math.min(maxAge, 300)}` : 'no-store');
  if (maxAge) res.setHeader('CDN-Cache-Control', `public, s-maxage=${maxAge}, stale-while-revalidate=86400`);
  res.writeHead(status);
  res.end(body);
};

/**
 * Error images must never be cached: GitHub's image proxy would keep showing a transient failure (a cold
 * timeout, a deploy in progress) long after it is fixed. `no-cache` makes the proxy revalidate every time.
 */
const sendError = (res: ServerResponse, status: number, title: string, detail: string) => {
  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
  res.setHeader('CDN-Cache-Control', 'no-store');
  res.writeHead(200);
  res.end(buildErrorSvg(status, title, detail));
};

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
  const widget = (rune ? 'runes' : widgetParam) as WidgetId | 'bento';
  if (widget !== 'bento' && !(WIDGET_IDS as readonly string[]).includes(widget)) return sendError(res, 400, 'Unknown widget', `Use one of: ${WIDGET_IDS.join(', ')}, bento, rune-str…rune-cha.`);

  const options = Object.fromEntries(
    ['theme', 'title', 'activity', 'icons', 'motion', 'timezone'].flatMap((k) => (q.get(k) ? [[k, q.get(k)]] : [])),
  ) as FileConfig;
  const layout = q.get('layout') === 'bento_compact' ? 'bento_compact' : 'bento';
  const { config } = resolveConfig({ ...options, username, layout });
  const mode = q.get('mode') === 'light' ? 'light' : 'dark';

  try {
    const player = buildPlayer(await rawProfileFor(username, token, store), config.title);
    if (widget === 'bento') return send(res, 200, 'image/svg+xml; charset=utf-8', await embedFonts(renderBento(player, config, mode).svg), 1800);
    const files = renderWidgets(player, config, mode, [widget]);
    const file = rune ? files.find((f) => f.name === widgetParam) : files[0];
    if (!file && ACTION_ONLY.has(widget)) return sendError(res, 400, 'Needs the GitHub Action', `"${widget}" draws what you put in awaken.json or what changed since the last run. Add it through the Action.`);
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

/** Nightly: Vercel Cron calls this with the CRON_SECRET bearer token. */
const handleCron = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
  const secret = process.env.CRON_SECRET;
  const token = process.env.GITHUB_TOKEN;
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) return send(res, 401, 'application/json', JSON.stringify({ error: 'Unauthorized' }), 0);
  if (!token) return send(res, 500, 'application/json', JSON.stringify({ error: 'GITHUB_TOKEN is not set' }), 0);
  const report = await refreshDuePlayers(token, store, CRON_BUDGET_MS);
  console.log(`refresh: ${report.refreshed.length} refreshed, ${report.failed.length} failed, ${report.remaining} remaining`);
  send(res, 200, 'application/json', JSON.stringify({ ...report, persistent: store.persistent }), 0);
};

/** The README and the website show pre-rendered demo images from the repository. */
const handleDemo = async (res: ServerResponse, path: string): Promise<void> => {
  const relative = normalize(path.slice(1));
  if (!/^demo[\\/][\w\-\\/]+\.svg$/.test(relative) || relative.includes('..')) return send(res, 404, 'text/plain', 'Not found', 60);
  try {
    send(res, 200, 'image/svg+xml; charset=utf-8', await readFile(join(process.cwd(), relative)), 3600);
  } catch {
    send(res, 404, 'text/plain', 'Not found', 60);
  }
};

export const handleRequest = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const path = url.pathname.replace(/\/+$/, '') || '/';
  if (path === '/') return send(res, 200, 'text/html; charset=utf-8', homePage(), 600);
  if (isDocPath(path)) return send(res, 200, 'text/html; charset=utf-8', await docsPage(path), 600);
  if (path.startsWith('/demo/')) return handleDemo(res, path);
  if (path === '/api') return handleApi(res, url);
  if (path === '/api/cron/refresh') return handleCron(req, res);
  if (path === '/health') return send(res, 200, 'application/json', JSON.stringify({ status: 'operational', themes: THEME_IDS.length, sharedCache: store.persistent }), 0);
  if (path === '/themes') return send(res, 200, 'application/json', JSON.stringify({ themes: THEME_IDS, packs: THEME_PACKS }), 3600);
  if (path === '/layouts') return send(res, 200, 'application/json', JSON.stringify({ layouts: LAYOUT_IDS }), 3600);
  send(res, 404, 'text/html; charset=utf-8', '<!doctype html><title>Not found</title><p style="font-family:system-ui;padding:40px">Nothing here. <a href="/">Back to the System</a>.</p>', 60);
};
