/** Common ways people write technology names, mapped to simple-icons slugs. */
const ALIASES: Record<string, string> = {
  nextjs: 'nextdotjs', next: 'nextdotjs', nodejs: 'nodedotjs', node: 'nodedotjs', vue: 'vuedotjs', vuejs: 'vuedotjs',
  threejs: 'threedotjs', three: 'threedotjs', babylonjs: 'babylondotjs', reactjs: 'react', reactnative: 'react',
  csharp: 'dotnet', 'c#': 'dotnet', net: 'dotnet', aspnet: 'dotnet', unreal: 'unrealengine', ue5: 'unrealengine',
  godot: 'godotengine', cpp: 'cplusplus', 'c++': 'cplusplus', js: 'javascript', ts: 'typescript', py: 'python',
  golang: 'go', bash: 'gnubash', shell: 'gnubash', html: 'html5', css3: 'css', tailwind: 'tailwindcss',
  postgres: 'postgresql', mongo: 'mongodb', k8s: 'kubernetes', gcp: 'googlecloud', rails: 'rubyonrails',
  sklearn: 'scikitlearn', 'scikit-learn': 'scikitlearn', torch: 'pytorch', tf: 'tensorflow', kafka: 'apachekafka',
  socketio: 'socketdotio', copilot: 'githubcopilot', nvim: 'neovim', emacs: 'gnuemacs', mac: 'macos', osx: 'macos',
  claude: 'anthropic', oculus: 'meta', quest: 'meta', c4d: 'cinema4d', tex: 'latex', maya: 'autodeskmaya',
  davinci: 'davinciresolve', resolve: 'davinciresolve', obs: 'obsstudio', echarts: 'apacheecharts', gsap: 'greensock',
  spark: 'apachespark', airflow: 'apacheairflow', maven: 'apachemaven', springboot: 'springboot', jwt: 'jsonwebtokens',
  vscode: 'visualstudiocode', intellij: 'intellijidea', drawio: 'diagramsdotnet', mui: 'mui', materialui: 'mui',
  shadcn: 'shadcnui', antd: 'antdesign', framermotion: 'framer', gemini: 'googlegemini', colab: 'googlecolab',
  hf: 'huggingface', metaquest: 'meta', shaderlab: 'unity', jupyternotebook: 'jupyter', gdscript: 'godotengine', hcl: 'terraform',
  dockerfile: 'docker', scss: 'sass', vimscript: 'vim', 'objective-c++': 'cplusplus', es: 'elasticsearch', rn: 'react', ros2: 'ros', esp32: 'espressif', stm32: 'stmicroelectronics',
};

export interface ArsenalItem {
  name: string;
  /** simple-icons slug, or null when there is no logo and the item is drawn as a monogram. */
  slug: string | null;
}

const normalize = (name: string): string => name.trim().toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9#+.-]/g, '');

/**
 * Turns what the player wrote into Arsenal items, keeping their order and dropping duplicates. A technology
 * with no logo in the catalog (Java, Photoshop…) is kept and drawn as a monogram, so nothing a player lists
 * disappears.
 */
export const resolveArsenal = (names: string[], available: (slug: string) => boolean): { items: ArsenalItem[]; monograms: string[] } => {
  const items: ArsenalItem[] = [];
  const monograms: string[] = [];
  const seen = new Set<string>();
  for (const name of names) {
    const key = normalize(name);
    const candidates = [ALIASES[key], key, key.replace(/\./g, 'dot'), key.replace(/[.-]/g, '')].filter((c): c is string => !!c);
    const slug = candidates.find(available) ?? null;
    const id = slug ?? key;
    if (seen.has(id)) continue;
    seen.add(id);
    items.push({ name: name.trim(), slug });
    if (!slug) monograms.push(name.trim());
  }
  return { items, monograms };
};

/** Two characters for a monogram tile: "Java" → "Ja", "Adobe Photoshop" → "AP", "C#" → "C#". */
export const monogram = (name: string): string => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length > 1) return (words[0]![0]! + words[1]![0]!).toUpperCase();
  const word = words[0] ?? '?';
  return word.length <= 2 ? word : word[0]!.toUpperCase() + word[1]!.toLowerCase();
};

/** Languages that stand for a product on the Arsenal shelf: ShaderLab is Unity, GDScript is Godot. */
const PRODUCT_OF: Record<string, string> = { ShaderLab: 'Unity', GDScript: 'Godot', 'Jupyter Notebook': 'Jupyter', HCL: 'Terraform', Dockerfile: 'Docker' };

/** Arsenal items for the player's languages, most used first; equipped slots show these. */
export const languageArsenal = (languages: string[], available: (slug: string) => boolean): ArsenalItem[] =>
  resolveArsenal(languages, available).items.map((item) => ({ ...item, name: PRODUCT_OF[item.name] ?? item.name }));
