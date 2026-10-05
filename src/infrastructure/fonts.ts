import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import subsetFont from 'subset-font';

const require = createRequire(import.meta.url);

const FACES = [
  { family: 'Chakra Petch', weight: 500, pkg: 'chakra-petch' },
  { family: 'Chakra Petch', weight: 600, pkg: 'chakra-petch' },
  { family: 'Chakra Petch', weight: 700, pkg: 'chakra-petch' },
  { family: 'JetBrains Mono', weight: 500, pkg: 'jetbrains-mono' },
  { family: 'JetBrains Mono', weight: 600, pkg: 'jetbrains-mono' },
] as const;

/** Fontsource subsets. Vietnamese only travels in an SVG that draws Vietnamese letters (feed titles, bios). */
const SUBSETS = {
  latin: 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
  vietnamese: 'U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0301,U+0303-0304,U+0308-0309,U+0323,U+0329,U+1EA0-1EF9,U+20AB',
} as const;
type Subset = keyof typeof SUBSETS;

const inRange = (subset: Subset) => {
  const ranges = SUBSETS[subset].split(',').map((part) => {
    const [a, b] = part.slice(2).split('-');
    return [parseInt(a!, 16), parseInt(b ?? a!, 16)] as const;
  });
  return (ch: string) => ranges.some(([lo, hi]) => ch.codePointAt(0)! >= lo && ch.codePointAt(0)! <= hi);
};
const isVietnamese = inRange('vietnamese');

export const FONTS_PLACEHOLDER = '/*@awaken-fonts*/';

const sources = new Map<string, Promise<Buffer>>();
const load = (file: string): Promise<Buffer> => {
  let source = sources.get(file);
  if (!source) {
    source = readFile(require.resolve(file));
    sources.set(file, source);
  }
  return source;
};

const ENTITIES: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" };

const textOf = (svg: string): string => {
  const drawn = svg.replace(/<(style|title|desc|defs)[\s\S]*?<\/\1>/g, '');
  const chunks = drawn.match(/>[^<>]+</g) ?? [];
  const text = chunks.map((c) => c.slice(1, -1).replace(/&(amp|lt|gt|quot|#39);/g, (e) => ENTITIES[e] ?? e)).join('');
  return [...new Set(text)].join('');
};

/**
 * Replaces the placeholder in the SVG's <style> with @font-face rules whose fonts are cut down to the
 * characters this SVG actually draws. GitHub's image proxy cannot load web fonts, so they travel inside the file.
 */
export const embedFonts = async (svg: string): Promise<string> => {
  if (!svg.includes(FONTS_PLACEHOLDER)) return svg;
  const glyphs = textOf(svg);
  const vietnamese = [...glyphs].filter(isVietnamese).join('');
  const subsets: [Subset, string][] = [['latin', glyphs || ' '], ...(vietnamese ? [['vietnamese', vietnamese] as [Subset, string]] : [])];
  const rules = await Promise.all(
    FACES.flatMap((face) => subsets.map(async ([subset, chars]) => {
      const file = `@fontsource/${face.pkg}/files/${face.pkg}-${subset}-${face.weight}-normal.woff2`;
      const cut = await subsetFont(await load(file), chars, { targetFormat: 'woff2' });
      return `@font-face{font-family:'${face.family}';font-weight:${face.weight};src:url(data:font/woff2;base64,${cut.toString('base64')}) format('woff2');unicode-range:${SUBSETS[subset]}}`;
    })),
  );
  return svg.replace(FONTS_PLACEHOLDER, rules.join(''));
};
