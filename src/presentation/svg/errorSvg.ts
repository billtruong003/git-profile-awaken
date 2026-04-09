import { escapeSvgText } from '../../infrastructure/sanitizer.js';

const ERROR_WIDTH = 480;
const ERROR_HEIGHT = 180;
const ERROR_BG = '#0a0e1a';
const ERROR_BORDER = '#ff2244';
const ERROR_TEXT = '#e0e6ed';
const ERROR_MUTED = '#4b618f';
const ERROR_ACCENT = '#ff2244';

const SYSTEM_CODE_MAP: Record<number, string> = {
  400: 'INVALID_PARAMETER',
  401: 'AUTH_FAILURE',
  403: 'ACCESS_DENIED',
  404: 'ENTITY_NOT_FOUND',
  429: 'MANA_DEPLETED',
  500: 'SYSTEM_CRITICAL_FAILURE',
  504: 'GATEWAY_TIMEOUT',
};

export const buildErrorSvg = (statusCode: number, title: string, detail: string): string => {
  const safeTitle = escapeSvgText(title);
  const safeDetail = escapeSvgText(detail);
  const systemCode = SYSTEM_CODE_MAP[statusCode] ?? 'UNKNOWN_ANOMALY';

  return `<svg width="${ERROR_WIDTH}" height="${ERROR_HEIGHT}" viewBox="0 0 ${ERROR_WIDTH} ${ERROR_HEIGHT}" fill="none" xmlns="http://www.w3.org/2000/svg" role="img">
  <style>
    @keyframes flicker { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
    .err-font { font-family: -apple-system, 'Segoe UI', Ubuntu, sans-serif; }
    .err-flicker { animation: flicker 2s ease-in-out infinite; }
  </style>
  <rect x="0.5" y="0.5" width="${ERROR_WIDTH - 1}" height="${ERROR_HEIGHT - 1}" rx="8" fill="${ERROR_BG}" stroke="${ERROR_ACCENT}" stroke-width="1.5"/>
  <g class="err-font">
    <circle cx="35" cy="45" r="8" fill="${ERROR_ACCENT}" class="err-flicker" opacity="0.9"/>
    <text x="55" y="50" font-size="16" font-weight="900" fill="${ERROR_ACCENT}" letter-spacing="2">SYSTEM ALERT</text>
    <text x="${ERROR_WIDTH - 25}" y="50" font-size="12" font-weight="700" fill="${ERROR_MUTED}" text-anchor="end">${systemCode}</text>
    <line x1="25" y1="70" x2="${ERROR_WIDTH - 25}" y2="70" stroke="${ERROR_ACCENT}" stroke-width="0.5" opacity="0.4"/>
    <text x="35" y="100" font-size="18" font-weight="800" fill="${ERROR_TEXT}">${safeTitle}</text>
    <text x="35" y="128" font-size="13" font-weight="500" fill="${ERROR_MUTED}">${safeDetail}</text>
    <text x="35" y="158" font-size="11" font-weight="600" fill="${ERROR_MUTED}" opacity="0.6">[ The System has encountered an anomaly. Retry or check parameters. ]</text>
  </g>
</svg>`;
};