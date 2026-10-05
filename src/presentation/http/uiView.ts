import { THEMES } from '../theme/themes.js';

const WIDGETS = ['hunter', 'status', 'achievements', 'quest', 'skills', 'contribution', 'combat', 'hours', 'activity', 'daily', 'rune-str', 'rune-agi', 'rune-vit', 'rune-luk'];

/** A small previewer for the hosted endpoint: pick a player and options, see every widget, copy the URL. */
export const getSystemUiHtml = (): string => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Git Profile Awaken</title>
<style>
:root{--bg:#060a14;--panel:#0b1426;--line:#1c2c4f;--ink:#e6edf7;--muted:#8a9bc0;--sys:#3d8bff}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.5 system-ui,sans-serif}
main{max-width:900px;margin:0 auto;padding:24px 16px;display:flex;flex-direction:column;gap:20px}
h1{margin:0;font-size:22px;letter-spacing:2px;color:var(--sys)}
form{display:flex;flex-wrap:wrap;gap:12px;padding:16px;background:var(--panel);border:1px solid var(--line)}
label{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--muted);letter-spacing:1px;text-transform:uppercase}
input,select,button{font:inherit;padding:8px 10px;background:var(--bg);color:var(--ink);border:1px solid var(--line)}
button{align-self:flex-end;background:var(--sys);color:var(--bg);border:0;font-weight:700;cursor:pointer}
button:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid var(--sys);outline-offset:2px}
.grid{display:flex;flex-direction:column;gap:12px}figure{margin:0;display:flex;flex-direction:column;gap:6px}
figure img{max-width:100%;height:auto}code{font-size:12px;color:var(--muted);word-break:break-all}
</style>
</head>
<body>
<main>
<h1>[ GIT PROFILE AWAKEN ]</h1>
<form id="f">
<label for="u">Username<input id="u" value="billtruong003" required></label>
<label for="t">Theme<select id="t">${THEMES.map((t) => `<option value="${t.id}">${t.name}</option>`).join('')}</select></label>
<label for="m">Mode<select id="m"><option>dark</option><option>light</option></select></label>
<label for="a">Activity<select id="a"><option>arise</option><option>raid</option></select></label>
<label for="i">Icons<select id="i"><option>rune</option><option>brand</option></select></label>
<label for="mo">Motion<select id="mo"><option>full</option><option>calm</option><option>none</option></select></label>
<button>Summon</button>
</form>
<div class="grid" id="out"></div>
</main>
<script>
const widgets = ${JSON.stringify(WIDGETS)};
const f = document.getElementById('f');
const out = document.getElementById('out');
const v = (id) => document.getElementById(id).value;
const draw = (e) => {
  e && e.preventDefault();
  out.replaceChildren(...widgets.map((w) => {
    const url = location.origin + '/api?' + new URLSearchParams({ username: v('u'), widget: w, theme: v('t'), mode: v('m'), activity: v('a'), icons: v('i'), motion: v('mo') });
    const fig = document.createElement('figure');
    const img = document.createElement('img');
    img.src = url; img.alt = w; img.loading = 'lazy';
    const code = document.createElement('code');
    code.textContent = url;
    fig.append(img, code);
    return fig;
  }));
};
f.addEventListener('submit', draw);
draw();
</script>
</body>
</html>`;
