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

const sendSvg = (res: ServerResponse, svg: string, cacheSeconds: number): void => {
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', cacheSeconds > 0 ? `public, max-age=${cacheSeconds}` : 'no-cache');
  res.setHeader('Access-Control-Allow-Origin', '*');
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

const handleApiRequest = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
  const url = new URL(req.url!, 'http://localhost');
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

  const widget = VALID_WIDGETS.includes(widgetParam as WidgetType) ? (widgetParam as WidgetType) : 'status';

  try {
    const theme = resolveTheme(themeName);
    const rawData = await fetchGithubData(username, token, forceRefresh);
    const profile = processProfileData(rawData, mode, theme);

    let svgOutput: string;
    switch (widget) {
      case 'quest':
        svgOutput = buildQuestWidget(profile, theme);
        break;
      case 'skill':
        svgOutput = buildSkillWidget(profile, theme);
        break;
      case 'stat':
        svgOutput = buildSingleStatWidget(profile, theme, target);
        break;
      case 'contribution':
        svgOutput = buildContributionWidget(profile, theme);
        break;
      case 'status':
      default:
        svgOutput = buildStatusWindow(profile, theme);
        break;
    }

    const cacheSeconds = forceRefresh ? 0 : 300;
    sendSvg(res, svgOutput, cacheSeconds);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown system failure';

    if (message.includes('Could not resolve to a User')) {
      sendErrorSvg(res, 404, 'Hunter Not Found', `No hunter registered under "${username}" in the System.`);
      return;
    }

    sendErrorSvg(res, 500, 'System Anomaly Detected', message.substring(0, 80));
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
    if (pathname === '/api') return handleApiRequest(req, res);

    return handleNotFound(req, res);
  } catch {
    sendErrorSvg(res, 500, 'Gateway Collapse', 'An unexpected system failure occurred.');
  }
};