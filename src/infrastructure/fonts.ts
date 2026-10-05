import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import subsetFont from 'subset-font';

const require = createRequire(import.meta.url);

const FACES = [
  { family: 'Chakra Petch', weight: 500, file: '@fontsource/chakra-petch/files/chakra-petch-latin-500-normal.woff2' },
  { family: 'Chakra Petch', weight: 600, file: '@fontsource/chakra-petch/files/chakra-petch-latin-600-normal.woff2' },
  { family: 'Chakra Petch', weight: 700, file: '@fontsource/chakra-petch/files/chakra-petch-latin-700-normal.woff2' },
  { family: 'JetBrains Mono', weight: 500, file: '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-500-normal.woff2' },
  { family: 'JetBrains Mono', weight: 600, file: '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-600-normal.woff2' },
] as const;

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
  const rules = await Promise.all(
    FACES.map(async (face) => {
      const subset = await subsetFont(await load(face.file), glyphs || ' ', { targetFormat: 'woff2' });
      return `@font-face{font-family:'${face.family}';font-weight:${face.weight};src:url(data:font/woff2;base64,${subset.toString('base64')}) format('woff2')}`;
    }),
  );
  return svg.replace(FONTS_PLACEHOLDER, rules.join(''));
};
