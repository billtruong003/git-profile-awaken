import type { RankGrade, ThemeMode } from '../../domain/types.js';
import { contrast, ensureContrast, mix } from './color.js';

export interface Tokens {
  void: string;
  panel: string;
  raised: string;
  line: string;
  frame: string;
  ink: string;
  muted: string;
  system: string;
  onSystem: string;
  mana: string;
  alert: string;
  shadow: string;
  rank: Record<RankGrade, string>;
  /** Dark grounds glow; light grounds never do. */
  glow: boolean;
}

export interface Theme {
  id: string;
  name: string;
  dark: Tokens;
  light: Tokens;
}

/** Awaken System v2, dark. */
const SYSTEM_DARK: Tokens = {
  void: '#060a14', panel: '#0b1426', raised: '#111d36', line: '#1c2c4f', frame: '#3566b8',
  ink: '#e6edf7', muted: '#8a9bc0', system: '#3d8bff', onSystem: '#060a14',
  mana: '#3fd6f0', alert: '#ff5c74', shadow: '#9d7bff',
  rank: { E: '#7b8496', D: '#a8b6cc', C: '#3ecf8e', B: '#8a86ff', A: '#d77bff', S: '#ffc53d', SS: '#ff8a3d', SSS: '#ff3d5e', EX: '#f2fbff' },
  glow: true,
};

/** Awaken System v2, light (Daylight). */
const SYSTEM_LIGHT: Tokens = {
  void: '#f4f7fc', panel: '#ffffff', raised: '#eef3fb', line: '#d5deee', frame: '#6f8fc4',
  ink: '#0d1830', muted: '#4a5a7c', system: '#1f5fd6', onSystem: '#ffffff',
  mana: '#00788f', alert: '#c8213f', shadow: '#6a45d6',
  rank: { E: '#7a8292', D: '#4f6d8f', C: '#16975a', B: '#4b48e0', A: '#a23cd6', S: '#a67800', SS: '#d45d0c', SSS: '#d61f45', EX: '#111827' },
  glow: false,
};

interface Seed {
  bg: string;
  panel: string;
  ink: string;
  muted: string;
  system: string;
  border: string;
}

/**
 * Derives a full token set from six seed colors and enforces the design rules:
 * ink-muted and system 4.5:1 on the panel, frame 3:1, rank colors 3:1 (they only appear at 20px bold or as marks).
 */
const derive = (seed: Seed, base: Tokens): Tokens => {
  const panel = seed.panel;
  const ink = ensureContrast(seed.ink, panel, 7);
  const raised = mix(panel, ink, 0.05);
  const isDark = contrast(panel, '#000000') < contrast(panel, '#ffffff');
  const rank = Object.fromEntries(
    Object.entries(base.rank).map(([grade, color]) => [grade, ensureContrast(color, raised, 3)]),
  ) as Record<RankGrade, string>;
  const system = ensureContrast(seed.system, raised, 4.5);
  return {
    void: seed.bg,
    panel,
    raised,
    line: mix(panel, ink, 0.12),
    frame: ensureContrast(seed.border, panel, 3),
    ink,
    muted: ensureContrast(seed.muted, raised, 4.5),
    system,
    onSystem: contrast(system, '#ffffff') >= contrast(system, '#000000') ? '#ffffff' : '#000000',
    mana: ensureContrast(base.mana, raised, 4.5),
    alert: ensureContrast(base.alert, raised, 4.5),
    shadow: ensureContrast(base.shadow, raised, 4.5),
    rank,
    glow: isDark,
  };
};

const fromSeed = (id: string, name: string, dark: Seed, light?: Seed): Theme => {
  const darkTokens = derive(dark, SYSTEM_DARK);
  return { id, name, dark: darkTokens, light: light ? derive(light, SYSTEM_LIGHT) : darkTokens };
};

const seed = (bg: string, panel: string, ink: string, muted: string, system: string, border: string): Seed =>
  ({ bg, panel, ink, muted, system, border });

const DAYLIGHT_SEED = seed(SYSTEM_LIGHT.void, SYSTEM_LIGHT.panel, SYSTEM_LIGHT.ink, SYSTEM_LIGHT.muted, SYSTEM_LIGHT.system, SYSTEM_LIGHT.frame);

export const THEMES: Theme[] = [
  { id: 'solo_leveling', name: 'Solo Leveling (System)', dark: SYSTEM_DARK, light: SYSTEM_LIGHT },
  fromSeed('shadow_monarch', 'Shadow Monarch', seed('#07050f', '#100b1f', '#ece6ff', '#a397c7', '#9d7bff', '#4a3a8a'),
    seed('#f6f3fd', '#ffffff', '#1a1033', '#5b4e80', '#6a45d6', '#9c8bd6')),
  fromSeed('red_gate', 'Red Gate', seed('#0f0507', '#1a0a0d', '#ffe9ec', '#c48f97', '#ff5a5f', '#7a2630'),
    seed('#fdf4f5', '#ffffff', '#2a0b10', '#7a4a52', '#c2273a', '#e0a3ab')),
  fromSeed('frost_elf', 'Frost Elf', seed('#04121a', '#0a1d29', '#e8f8ff', '#8fb6c9', '#5fd4ff', '#2a5a73'),
    seed('#f2fafd', '#ffffff', '#08303f', '#456b7b', '#0a7ea8', '#94c6d9')),
  fromSeed('demon_castle', 'Demon Castle', seed('#0a0606', '#150c0b', '#f3e4dc', '#b0948a', '#ff7a3d', '#5a2e22')),
  fromSeed('hunter_association', 'Hunter Association', seed('#05090f', '#0c1420', '#eef2f7', '#98a6b8', '#d9b45a', '#3a4a60'),
    seed('#f7f8fa', '#ffffff', '#111a26', '#4d5b6d', '#8a6a12', '#b9c3d0')),
  fromSeed('daylight', 'Daylight', DAYLIGHT_SEED, DAYLIGHT_SEED),
  fromSeed('cyberpunk', 'Cyberpunk', seed('#0b0f19', '#151b2b', '#ffffff', '#6e7a9e', '#00f0ff', '#252e46')),
  fromSeed('dracula', 'Dracula', seed('#282a36', '#2f3142', '#f8f8f2', '#6272a4', '#bd93f9', '#44475a')),
  fromSeed('tokyonight', 'Tokyo Night', seed('#1a1b26', '#1f2335', '#c0caf5', '#565f89', '#7aa2f7', '#414868'),
    seed('#e1e2e7', '#f4f4f8', '#3760bf', '#6172b0', '#2e7de9', '#a8aecb')),
  fromSeed('monokai', 'Monokai', seed('#2d2a2e', '#363337', '#fcfcfa', '#939293', '#ffd866', '#5b595c')),
  fromSeed('gruvbox', 'Gruvbox', seed('#282828', '#32302f', '#ebdbb2', '#a89984', '#fe8019', '#504945'),
    seed('#fbf1c7', '#fffaf0', '#3c3836', '#7c6f64', '#af3a03', '#d5c4a1')),
  fromSeed('nord', 'Nord', seed('#2e3440', '#3b4252', '#eceff4', '#d8dee9', '#88c0d0', '#4c566a'),
    seed('#eceff4', '#ffffff', '#2e3440', '#4c566a', '#5e81ac', '#a3b1c6')),
  fromSeed('synthwave', 'Synthwave', seed('#262335', '#2d2843', '#f0f0f0', '#8a889d', '#ff7edb', '#493e6f')),
  fromSeed('matrix', 'Matrix', seed('#000000', '#020a02', '#c8ffc8', '#3fa34d', '#00ff41', '#0a3a12')),
  fromSeed('hollow_knight', 'Hollow Knight', seed('#1a1c23', '#20232b', '#d8d9da', '#747781', '#9ab3c5', '#313642')),
  fromSeed('genshin_anemo', 'Genshin · Anemo', seed('#1c2e36', '#22363f', '#f0f5f5', '#87a8a6', '#69e1c3', '#3a545e')),
  fromSeed('genshin_geo', 'Genshin · Geo', seed('#2b251f', '#332c25', '#f5ebd9', '#a3937d', '#fec75a', '#5c4e40')),
  fromSeed('genshin_electro', 'Genshin · Electro', seed('#211930', '#291f3b', '#efeaf5', '#8c7d9c', '#c780ff', '#4b3a69')),
  fromSeed('elden_ring', 'Elden Ring', seed('#14120f', '#1b1814', '#dfd3c3', '#857b6f', '#cda662', '#3b342b')),
  fromSeed('nier', 'NieR', seed('#2b2a28', '#33322f', '#e3e0db', '#a8a49d', '#d1c7a8', '#56544f'),
    seed('#d1cdc7', '#e3e0db', '#2e2d2b', '#5e5c58', '#6b5d3f', '#9a958c')),
  fromSeed('bloodborne', 'Bloodborne', seed('#100b0b', '#171010', '#d4c4c4', '#756363', '#c43a3a', '#332626')),
  fromSeed('valorant', 'Valorant', seed('#0f1923', '#16222e', '#ece8e1', '#76808c', '#ff4655', '#2b3947'),
    seed('#ece8e1', '#f7f5f1', '#0f1923', '#4e5864', '#d4202f', '#b8b2a8')),
  fromSeed('hextech', 'Hextech', seed('#091428', '#0a1a35', '#f0e6d2', '#8b9bb4', '#c89b3c', '#1e3656')),
  fromSeed('retrowave', 'Retrowave', seed('#190724', '#220a33', '#ffe6ff', '#a472ba', '#05d9e8', '#4d206b')),
  fromSeed('abyssal', 'Abyssal', seed('#030b14', '#06121f', '#c2d1e0', '#42678c', '#00b4d8', '#132b45')),
  fromSeed('infernal', 'Infernal', seed('#120404', '#1a0808', '#ffcccc', '#994c4c', '#ff3333', '#3d1414')),
];

export const THEME_IDS = THEMES.map((t) => t.id);

export const resolveTheme = (id: string | null | undefined): Theme =>
  THEMES.find((t) => t.id === id) ?? THEMES[0]!;

export const tokensFor = (theme: Theme, mode: ThemeMode): Tokens => theme[mode];
