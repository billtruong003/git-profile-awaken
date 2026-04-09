import type { ThemeConfig } from '../../domain/types.js';

const generateSvgId = (): string =>
  Math.random().toString(36).substring(2, 8);

export const getBaseSvgStyles = (theme: ThemeConfig) => `
  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes pulseGlow { 0% { filter: drop-shadow(0 0 5px ${theme.accent}40); } 50% { filter: drop-shadow(0 0 15px ${theme.accent}80); } 100% { filter: drop-shadow(0 0 5px ${theme.accent}40); } }
  @keyframes scanline { 0% { transform: translateY(-100%); } 100% { transform: translateY(100%); } }
  .font-main { font-family: -apple-system, 'Segoe UI', Ubuntu, sans-serif; }
  .fade-in { animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) both; }
  .glow { animation: pulseGlow 3s infinite; }
`;

const RADAR_AXIS_ANGLES = [-90, -30, 30, 90, 150, 210];

export const calculateRadarPoints = (cx: number, cy: number, radius: number, values: number[], max: number): string =>
  values
    .map((val, i) => {
      const scaledRadius = (val / max) * radius;
      const angleRad = RADAR_AXIS_ANGLES[i]! * (Math.PI / 180);
      return `${cx + scaledRadius * Math.cos(angleRad)},${cy + scaledRadius * Math.sin(angleRad)}`;
    })
    .join(' ');

export const renderRadarGrid = (cx: number, cy: number, radius: number, theme: ThemeConfig): string => {
  const fullHex = [1, 1, 1, 1, 1, 1];

  let grid = `<polygon points="${calculateRadarPoints(cx, cy, radius, fullHex, 1)}" fill="${theme.bg}" opacity="0.9" stroke="${theme.border}" stroke-width="2"/>`;

  for (let step = 0.2; step < 1; step += 0.2) {
    const scaledHex = fullHex.map((v) => v * step);
    grid += `<polygon points="${calculateRadarPoints(cx, cy, radius, scaledHex, 1)}" fill="none" stroke="${theme.border}" stroke-width="1" opacity="0.3"/>`;
  }

  RADAR_AXIS_ANGLES.forEach((angleDeg) => {
    const angleRad = angleDeg * (Math.PI / 180);
    const endX = cx + radius * Math.cos(angleRad);
    const endY = cy + radius * Math.sin(angleRad);
    grid += `<line x1="${cx}" y1="${cy}" x2="${endX}" y2="${endY}" stroke="${theme.border}" stroke-width="1" opacity="0.5"/>`;
  });

  return grid;
};

export const createSvgWrapper = (width: number, height: number, theme: ThemeConfig, content: string): string => {
  const uid = generateSvgId();
  const clipId = `c-${uid}`;
  const gradientId = `g-${uid}`;

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg" role="img">
    <style>${getBaseSvgStyles(theme)}</style>
    <rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="8" fill="${theme.bg}" stroke="${theme.border}"/>
    <g clip-path="url(#${clipId})">
      <rect x="0" y="0" width="${width}" height="${height}" fill="url(#${gradientId})" opacity="0.05" style="animation: scanline 8s linear infinite;"/>
    </g>
    <defs>
      <clipPath id="${clipId}"><rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="8"/></clipPath>
      <linearGradient id="${gradientId}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="transparent"/><stop offset="50%" stop-color="${theme.primary}"/><stop offset="100%" stop-color="transparent"/></linearGradient>
    </defs>
    <g class="font-main fade-in">${content}</g>
  </svg>`;
};