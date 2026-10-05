export const REPO_URL = 'https://github.com/billtruong003/git-profile-awaken';

const escapeHtml = (s: string): string => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
export { escapeHtml };

/**
 * The site follows the Awaken System: the System's dark ground, chamfered panels instead of rounded cards,
 * Chakra Petch for words and JetBrains Mono for numbers and code. One look on purpose, no light theme.
 */
const CSS = `
:root{
  --void:#060a14;--panel:#0b1426;--raised:#111d36;--line:#1c2c4f;--frame:#3566b8;
  --ink:#e6edf7;--muted:#8a9bc0;--system:#3d8bff;--mana:#3fd6f0;--shadow:#9d7bff;--alert:#ff5c74;--gold:#ffc53d;
  --fd:'Chakra Petch','Segoe UI',system-ui,sans-serif;--fm:'JetBrains Mono',ui-monospace,Consolas,monospace;
  --cut-lg:polygon(14px 0,100% 0,100% calc(100% - 14px),calc(100% - 14px) 100%,0 100%,0 14px);
  --cut-sm:polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px);
  color-scheme:dark;
}
*,*::before,*::after{box-sizing:border-box}
html{scroll-behavior:smooth;scroll-padding-top:72px}
body{margin:0;background:var(--void);color:var(--ink);font:500 16px/1.6 var(--fd);-webkit-font-smoothing:antialiased}
img{max-width:100%;height:auto;display:block}
a{color:var(--system);text-underline-offset:3px}
a:hover{color:var(--ink)}
:focus-visible{outline:2px solid var(--system);outline-offset:3px}
code,pre,kbd{font-family:var(--fm)}
h1,h2,h3{line-height:1.1;text-wrap:balance;margin:0}
p{margin:0}
.wrap{width:100%;max-width:1160px;margin:0 auto;padding-inline:20px}
.eyebrow{font:700 13px/1 var(--fd);letter-spacing:3px;text-transform:uppercase;color:var(--system)}
.label{font:600 12px/1.3 var(--fd);letter-spacing:1.5px;text-transform:uppercase;color:var(--muted)}
.mono{font-family:var(--fm);font-variant-numeric:tabular-nums}

/* Chamfered panel with a 1px frame: outer layer is the frame color, inner layer the panel. */
.frame{position:relative;background:var(--frame);clip-path:var(--cut-lg);padding:1px}
.frame>.inner{background:var(--panel);clip-path:polygon(13.6px 0,100% 0,100% calc(100% - 13.6px),calc(100% - 13.6px) 100%,0 100%,0 13.6px);height:100%}
.ticks{position:relative}
.ticks::before,.ticks::after{content:"";position:absolute;width:16px;height:16px;border:2px solid var(--system);pointer-events:none}
.ticks::before{top:-6px;right:-6px;border-left:0;border-bottom:0}
.ticks::after{bottom:-6px;left:-6px;border-right:0;border-top:0}

/* Navigation */
.nav{position:sticky;top:0;z-index:10;background:color-mix(in srgb,var(--void) 86%,transparent);backdrop-filter:blur(10px);border-bottom:1px solid var(--line)}
.nav .wrap{display:flex;align-items:center;gap:24px;height:60px}
.brand{display:flex;align-items:center;gap:10px;color:var(--ink);text-decoration:none;font:700 15px/1 var(--fd);letter-spacing:2px;text-transform:uppercase}
.brand svg{flex:none}
.nav ul{display:flex;gap:4px;list-style:none;margin:0 0 0 auto;padding:0}
.nav ul a{display:block;padding:8px 12px;color:var(--muted);text-decoration:none;font:600 14px/1 var(--fd);letter-spacing:.5px}
.nav ul a:hover,.nav ul a[aria-current=page]{color:var(--ink)}
.nav .gh{color:var(--ink);border:1px solid var(--line)}
@media (max-width:640px){.nav ul li.hide-sm{display:none}.brand span{display:none}}

/* Buttons */
.btn{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 20px;font:700 14px/1 var(--fd);letter-spacing:1.5px;text-transform:uppercase;text-decoration:none;border:0;cursor:pointer;clip-path:var(--cut-sm)}
.btn-primary{background:var(--system);color:var(--void)}
.btn-primary:hover{background:#6aa6ff;color:var(--void)}
.btn-ghost{background:var(--raised);color:var(--ink);box-shadow:inset 0 0 0 1px var(--frame)}
.btn-ghost:hover{background:var(--line);color:var(--ink)}

/* Footer */
.footer{border-top:1px solid var(--line);margin-top:96px;padding-block:32px 48px;color:var(--muted);font-size:14px}
.footer .wrap{display:flex;flex-wrap:wrap;gap:16px 32px;justify-content:space-between}
.footer nav{display:flex;gap:20px;flex-wrap:wrap}
.footer a{color:var(--muted)}
.footer a:hover{color:var(--ink)}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}*{animation:none!important;transition:none!important}}
`;

const LOGO = `<svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true"><path d="M6 0H26V20L20 26H0V6Z" fill="#3d8bff"/><path d="M7.5 2.5H23.5V19L19 23.5H2.5V7Z" fill="#060a14"/><path d="M13 6L19 20H16.6L15.4 17H10.6L9.4 20H7L13 6ZM11.4 15H14.6L13 10.8Z" fill="#3d8bff"/></svg>`;

export interface PageOptions {
  title: string;
  description: string;
  path: '/' | '/docs' | '/docs/development';
  body: string;
  css?: string;
  script?: string;
}

export const page = (o: PageOptions): string => {
  const link = (href: string, text: string, cls = '') => `<li${cls ? ` class="${cls}"` : ''}><a href="${href}"${o.path === href ? ' aria-current="page"' : ''}>${text}</a></li>`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(o.title)}</title>
<meta name="description" content="${escapeHtml(o.description)}">
<meta property="og:title" content="${escapeHtml(o.title)}">
<meta property="og:description" content="${escapeHtml(o.description)}">
<meta property="og:image" content="/demo/hunter-dark.svg">
<meta name="theme-color" content="#060a14">
<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(LOGO.replace('aria-hidden="true"', 'xmlns="http://www.w3.org/2000/svg"'))}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;600;700&family=JetBrains+Mono:wght@500;600&display=swap">
<style>${CSS}${o.css ?? ''}</style>
</head>
<body>
<header class="nav">
<div class="wrap">
<a class="brand" href="/">${LOGO}<span>Git Profile Awaken</span></a>
<nav aria-label="Main"><ul>
${link('/#setup', 'Set up', 'hide-sm')}${link('/docs', 'Guide')}${link('/docs/development', 'Developers')}
<li><a class="gh" href="${REPO_URL}">GitHub</a></li>
</ul></nav>
</div>
</header>
${o.body}
<footer class="footer">
<div class="wrap">
<p>Git Profile Awaken · MIT · inspired by the System in <i>Solo Leveling</i>, not affiliated with it.</p>
<nav aria-label="Footer"><a href="/docs">User guide</a><a href="/docs/development">Developer guide</a><a href="${REPO_URL}">Source</a><a href="${REPO_URL}/issues">Report an issue</a></nav>
</div>
</footer>
${o.script ? `<script>${o.script}</script>` : ''}
</body>
</html>`;
};
