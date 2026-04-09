import type { IncomingMessage, ServerResponse } from 'node:http';
import { fetchGithubData } from '../../infrastructure/githubClient.js';
import { isValidGithubUsername } from '../../infrastructure/sanitizer.js';
import { processProfileData } from '../../application/dataProcessor.js';
import { resolveTheme, AVAILABLE_THEME_NAMES } from '../theme/themes.js';
import { buildStatusWindow, buildQuestWidget, buildSkillWidget, buildSingleStatWidget, buildContributionWidget } from '../svg/widgetBuilders.js';
import { buildErrorSvg } from '../svg/errorSvg.js';
import { getSystemUiHtml } from './uiView.js';

const VALID_WIDGETS = ['status', 'quest', 'skill', 'stat', 'contribution'] as const;
type WidgetType = (typeof VALID_WIDGETS)[number];

const SVG_CACHE_SECONDS = 300;
const STALE_WHILE_REVALIDATE_SECONDS = 60;

const buildCacheHeader = (seconds: number): string =>
  seconds > 0
    ? `public, max-age=${seconds}, s-maxage=${seconds}, stale-while-revalidate=${STALE_WHILE_REVALIDATE_SECONDS}`
    : 'no-cache, no-store';

const sendSvg = (res: ServerResponse, svg: string, cacheSeconds: number): void => {
  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
  res.setHeader('Cache-Control', buildCacheHeader(cacheSeconds));
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Vary', 'Accept-Encoding');
  res.writeHead(200);
  res.end(svg);
};

const sendErrorSvg = (res: ServerResponse, errorCode: number, title: string, detail: string): void => {
  sendSvg(res, buildErrorSvg(errorCode, title, detail), 0);
};

const sendJson = (res: ServerResponse, statusCode: number, data: unknown): void => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.writeHead(statusCode);
  res.end(JSON.stringify(data));
};

const handleUI = (_req: IncomingMessage, res: ServerResponse): void => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.writeHead(200);
  res.end(getSystemUiHtml());
};

const handleHealthCheck = (_req: IncomingMessage, res: ServerResponse): void => {
  sendJson(res, 200, {
    status: 'operational',
    system: 'Git Profile Awaken',
    timestamp: new Date().toISOString(),
    availableThemes: AVAILABLE_THEME_NAMES.length,
  });
};

const handleThemeList = (_req: IncomingMessage, res: ServerResponse): void => {
  sendJson(res, 200, { themes: AVAILABLE_THEME_NAMES });
};

const WIDGET_BUILDERS: Record<WidgetType, (profile: any, theme: any, target?: string | null) => string> = {
  status: (profile, theme) => buildStatusWindow(profile, theme),
  quest: (profile, theme) => buildQuestWidget(profile, theme),
  skill: (profile, theme) => buildSkillWidget(profile, theme),
  stat: (profile, theme, target) => buildSingleStatWidget(profile, theme, target ?? null),
  contribution: (profile, theme) => buildContributionWidget(profile, theme),
};

const handleApiRequest = async (_req: IncomingMessage, res: ServerResponse, url: URL): Promise<void> => {
  const username = url.searchParams.get('username');
  const themeName = url.searchParams.get('theme');
  const widgetParam = url.searchParams.get('widget') || 'status';
  const target = url.searchParams.get('target');
  const mode = url.searchParams.get('mode');
  const forceRefresh = url.searchParams.get('refresh') === 'true';
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    sendErrorSvg(res, 500, 'System Token Missing', 'GITHUB_TOKEN environment variable is not configured.');
    return;
  }

  if (!username) {
    sendErrorSvg(res, 400, 'Player ID Required', 'Provide ?username=<github_username> to summon a hunter.');
    return;
  }

  if (!isValidGithubUsername(username)) {
    sendErrorSvg(res, 400, 'Invalid Player ID', `"${username.substring(0, 20)}" is not a valid GitHub username format.`);
    return;
  }

  const widget: WidgetType = VALID_WIDGETS.includes(widgetParam as WidgetType)
    ? (widgetParam as WidgetType)
    : 'status';

  try {
    const theme = resolveTheme(themeName);
    const rawData = await fetchGithubData(username, token, forceRefresh);
    const profile = processProfileData(rawData, mode, theme);

    const builder = WIDGET_BUILDERS[widget];
    const svgOutput = builder(profile, theme, target);

    sendSvg(res, svgOutput, forceRefresh ? 0 : SVG_CACHE_SECONDS);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown system failure';

    if (message.includes('Could not resolve to a User')) {
      sendErrorSvg(res, 404, 'Hunter Not Found', `No hunter registered under "${username}" in the System.`);
      return;
    }

    if (message.includes('rate limit')) {
      sendErrorSvg(res, 429, 'Mana Depleted', message.substring(0, 120));
      return;
    }

    sendErrorSvg(res, 500, 'System Anomaly Detected', message.substring(0, 120));
  }
};

const handleNotFound = (_req: IncomingMessage, res: ServerResponse): void => {
  sendJson(res, 404, {
    error: 'Route not found',
    availableRoutes: ['GET /', 'GET /api', 'GET /health', 'GET /themes'],
  });
};

export const handleRequest = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
  if (!req.url) return;

  try {
    const url = new URL(req.url, 'http://localhost');
    const pathname = url.pathname;

    if (pathname === '/') return handleUI(req, res);
    if (pathname === '/health' || pathname === '/ping') return handleHealthCheck(req, res);
    if (pathname === '/themes') return handleThemeList(req, res);
    if (pathname === '/api') return handleApiRequest(req, res, url);

    return handleNotFound(req, res);
  } catch {
    sendErrorSvg(res, 500, 'Gateway Collapse', 'An unexpected system failure occurred.');
  }
};