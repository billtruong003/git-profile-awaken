type Rgb = [number, number, number];

const toRgb = (hex: string): Rgb => {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6);
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as Rgb;
};

const toHex = ([r, g, b]: Rgb): string =>
  '#' + [r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('');

export const mix = (a: string, b: string, amount: number): string => {
  const x = toRgb(a);
  const y = toRgb(b);
  return toHex([0, 1, 2].map((i) => x[i]! + (y[i]! - x[i]!) * amount) as Rgb);
};

const luminance = (hex: string): number => {
  const [r, g, b] = toRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as Rgb;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const contrast = (a: string, b: string): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((p, q) => q - p) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};

/** Moves `color` toward white or black (whichever the ground needs) until it reaches `ratio` against `ground`. */
export const ensureContrast = (color: string, ground: string, ratio: number): string => {
  if (contrast(color, ground) >= ratio) return color;
  const target = luminance(ground) < 0.5 ? '#ffffff' : '#000000';
  for (let step = 0.05; step <= 1; step += 0.05) {
    const candidate = mix(color, target, step);
    if (contrast(candidate, ground) >= ratio) return candidate;
  }
  return target;
};

export const alpha = (hex: string, opacity: number): string => {
  const [r, g, b] = toRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};
