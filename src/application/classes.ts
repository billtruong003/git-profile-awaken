interface JobClass {
  name: string;
  element: string;
  languages: readonly string[];
}

const CLASSES: readonly JobClass[] = [
  { name: 'Blade Master', element: 'Lightning', languages: ['TypeScript', 'JavaScript', 'CoffeeScript'] },
  { name: 'Grand Magus', element: 'Arcane', languages: ['Python', 'Jupyter Notebook', 'R', 'Julia'] },
  { name: 'Holy Knight', element: 'Light', languages: ['C#', 'Java', 'Kotlin', 'Scala', 'Groovy'] },
  { name: 'Necromancer', element: 'Darkness', languages: ['C', 'C++', 'Rust', 'Go', 'Zig', 'Assembly', 'Nim'] },
  { name: 'Illusionist', element: 'Wind', languages: ['HTML', 'CSS', 'SCSS', 'Sass', 'Less', 'Vue', 'Svelte', 'Astro', 'MDX'] },
  { name: 'Alchemist', element: 'Fire', languages: ['PHP', 'Ruby', 'Perl', 'Blade'] },
  { name: 'Ranger', element: 'Wind', languages: ['Swift', 'Dart', 'Objective-C', 'Objective-C++'] },
  { name: 'Runesmith', element: 'Light', languages: ['ShaderLab', 'HLSL', 'GLSL', 'WGSL', 'Metal'] },
  { name: 'Summoner', element: 'Spirit', languages: ['GDScript', 'Lua', 'Luau'] },
  { name: 'Warden', element: 'Earth', languages: ['Shell', 'PowerShell', 'Dockerfile', 'HCL', 'Nix', 'Makefile', 'Batchfile'] },
  { name: 'Oracle', element: 'Time', languages: ['Haskell', 'Elixir', 'Erlang', 'Clojure', 'OCaml', 'F#', 'Elm', 'Gleam'] },
  { name: 'Arbiter', element: 'Law', languages: ['Solidity', 'Move', 'Cairo'] },
];

/** Exact language match, so "CSS" no longer falls into the "C" class. */
export const awakenClass = (topLanguage: string | undefined): { name: string; element: string; from: string | null } => {
  const match = topLanguage ? CLASSES.find((c) => c.languages.includes(topLanguage)) : undefined;
  return match
    ? { name: match.name, element: match.element, from: topLanguage ?? null }
    : { name: 'Novice', element: 'Neutral', from: topLanguage ?? null };
};
