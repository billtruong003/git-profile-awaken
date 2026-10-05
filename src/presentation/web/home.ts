import { ACHIEVEMENTS } from '../../application/achievements.js';
import { DEFAULTS } from '../../config/config.js';
import { THEMES } from '../theme/themes.js';
import { escapeHtml, page } from './layout.js';

const DEMO_USER = 'billtruong003';

const CSS = `
section{padding-block:88px 0}
.section-head{display:flex;flex-direction:column;gap:14px;max-width:680px;margin-bottom:36px}
.section-head h2{font:700 clamp(28px,4vw,40px)/1.08 var(--fd);letter-spacing:.5px}
.section-head p{color:var(--muted);font-size:17px}

/* Hero */
.hero{padding-block:72px 0;position:relative;overflow:hidden}
.hero::before{content:"";position:absolute;inset:0;background:
  linear-gradient(var(--void),transparent 30%,transparent 70%,var(--void)),
  repeating-linear-gradient(90deg,transparent 0 59px,rgba(53,102,184,.14) 59px 60px),
  repeating-linear-gradient(0deg,transparent 0 59px,rgba(53,102,184,.14) 59px 60px);pointer-events:none}
.hero .wrap{position:relative;display:grid;grid-template-columns:minmax(0,5fr) minmax(0,6fr);gap:56px;align-items:center}
.hero h1{font:700 clamp(40px,6vw,72px)/.98 var(--fd);letter-spacing:.5px;margin-top:18px}
.hero h1 em{font-style:normal;color:var(--system);text-shadow:0 0 24px rgba(61,139,255,.5)}
.hero .lede{margin-top:22px;color:var(--muted);font-size:18px;max-width:520px}
.hero .ctas{display:flex;flex-wrap:wrap;gap:12px;margin-top:32px}
.hero .facts{display:flex;flex-wrap:wrap;gap:24px;margin-top:36px;padding-top:24px;border-top:1px solid var(--line)}
.hero .facts div{display:flex;flex-direction:column;gap:4px}
.hero .facts b{font:600 22px/1 var(--fm);color:var(--ink)}
.stage{display:flex;flex-direction:column;gap:14px;position:relative}
.toast{position:absolute;top:-22px;right:12px;z-index:2;display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--panel);box-shadow:inset 0 0 0 1px var(--frame);clip-path:var(--cut-sm);font:600 13px/1 var(--fd);animation:toast 6s ease-in-out infinite}
.toast i{display:grid;place-items:center;width:20px;height:20px;background:var(--system);color:var(--void);font:700 13px/1 var(--fd);font-style:normal}
@keyframes toast{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@media (max-width:900px){.hero .wrap{grid-template-columns:1fr}.toast{display:none}}

/* Feature rows */
.feature{display:grid;grid-template-columns:minmax(0,4fr) minmax(0,7fr);gap:48px;align-items:center;margin-bottom:72px}
.feature.flip{grid-template-columns:minmax(0,7fr) minmax(0,4fr)}
.feature.flip .copy{order:2}
.feature .copy{display:flex;flex-direction:column;gap:14px}
.feature h3{font:700 28px/1.1 var(--fd)}
.feature p{color:var(--muted)}
.feature ul{margin:4px 0 0;padding:0;list-style:none;display:flex;flex-direction:column;gap:8px}
.feature li{display:flex;gap:10px;color:var(--ink);font-size:15px}
.feature li::before{content:"";flex:none;width:7px;height:7px;margin-top:9px;background:var(--system);transform:rotate(45deg)}
@media (max-width:900px){.feature,.feature.flip{grid-template-columns:1fr;gap:20px}.feature.flip .copy{order:0}}
.switch{display:inline-flex;padding:3px;background:var(--raised);box-shadow:inset 0 0 0 1px var(--line);clip-path:var(--cut-sm);width:max-content}
.switch button{min-height:38px;padding:0 16px;border:0;background:transparent;color:var(--muted);font:700 13px/1 var(--fd);letter-spacing:1.5px;text-transform:uppercase;cursor:pointer;clip-path:var(--cut-sm)}
.switch button[aria-pressed=true]{background:var(--system);color:var(--void)}
.halves{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
.halves figure{margin:0;display:flex;flex-direction:column;gap:8px}
.halves figcaption{font-size:14px;color:var(--muted)}
.halves figcaption b{color:var(--ink);font-weight:600}
@media (max-width:700px){.halves{grid-template-columns:1fr}}

/* Themes */
.themes{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:14px}
.theme{display:flex;flex-direction:column;gap:8px;padding:0;border:0;background:none;color:var(--ink);text-align:left;cursor:pointer;font:600 14px/1.2 var(--fd)}
.theme img{transition:transform .2s ease}
.theme:hover img{transform:translateY(-3px)}
.theme span{display:flex;justify-content:space-between;color:var(--muted)}
.theme span b{color:var(--ink);font-weight:600}

/* Steps */
.steps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;counter-reset:step}
.step .inner{padding:24px;display:flex;flex-direction:column;gap:10px}
.step .num{font:600 13px/1 var(--fm);color:var(--system)}
.step h3{font:700 20px/1.2 var(--fd)}
.step p{color:var(--muted);font-size:15px}
@media (max-width:800px){.steps{grid-template-columns:1fr}}

/* Configurator */
.config{display:grid;grid-template-columns:minmax(0,4fr) minmax(0,6fr);gap:20px;align-items:start}
@media (max-width:960px){.config{grid-template-columns:1fr}}
.config form .inner{padding:24px;display:flex;flex-direction:column;gap:20px}
.field{display:flex;flex-direction:column;gap:8px}
.field input,.field select{min-height:44px;padding:0 12px;background:var(--void);color:var(--ink);border:1px solid var(--line);font:500 15px/1 var(--fd)}
.field input:focus,.field select:focus{border-color:var(--system)}
.row{display:flex;gap:8px}
.row input{flex:1;min-width:0}
.hint{font-size:13px;color:var(--muted)}
.chips{display:flex;flex-wrap:wrap;gap:6px}
.chips label{position:relative}
.chips input{position:absolute;opacity:0;inset:0}
.chips span{display:inline-block;padding:7px 10px;font:600 12px/1 var(--fm);color:var(--muted);background:var(--void);box-shadow:inset 0 0 0 1px var(--line);cursor:pointer}
.chips input:checked+span{color:var(--ink);box-shadow:inset 0 0 0 1px var(--system);background:var(--raised)}
.chips input:focus-visible+span{outline:2px solid var(--system);outline-offset:2px}
.out .inner{display:flex;flex-direction:column}
.tabs{display:flex;border-bottom:1px solid var(--line);overflow-x:auto}
.tabs button{flex:none;min-height:48px;padding:0 18px;border:0;border-bottom:2px solid transparent;background:none;color:var(--muted);font:600 14px/1 var(--fd);cursor:pointer}
.tabs button[aria-selected=true]{color:var(--ink);border-bottom-color:var(--system)}
.tabs button b{font:600 12px/1 var(--fm);color:var(--system);margin-right:8px}
.panel{display:flex;flex-direction:column;gap:12px;padding:20px}
.panel[hidden]{display:none}
.panel p{color:var(--muted);font-size:14px}
.code{position:relative}
.code pre{margin:0;padding:16px;max-height:340px;overflow:auto;background:var(--void);border:1px solid var(--line);font-size:13px;line-height:1.55;color:var(--ink)}
.code button{position:absolute;top:8px;right:8px;min-height:32px;padding:0 12px;border:0;background:var(--raised);color:var(--ink);box-shadow:inset 0 0 0 1px var(--frame);font:700 12px/1 var(--fd);letter-spacing:1px;text-transform:uppercase;cursor:pointer}
.preview{display:flex;flex-direction:column;gap:12px;padding:20px;border-top:1px solid var(--line)}
.preview .status{font:500 13px/1.4 var(--fm);color:var(--muted)}
`;

const featureList = (items: string[]) => `<ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>`;

const themeCards = THEMES.map((t) => `<button class="theme" type="button" data-theme="${t.id}" aria-label="Use the ${escapeHtml(t.name)} theme">
<img src="/demo/themes/${t.id}.svg" width="840" height="232" alt="" loading="lazy">
<span><b>${escapeHtml(t.name)}</b><code>${t.id}</code></span></button>`).join('');

const select = (id: string, options: [string, string][], selected: string) =>
  `<select id="${id}" name="${id}">${options.map(([v, l]) => `<option value="${v}"${v === selected ? ' selected' : ''}>${escapeHtml(l)}</option>`).join('')}</select>`;

const segmented = (name: string, options: [string, string][], selected: string) =>
  `<div class="switch" role="radiogroup" aria-label="${name}">${options.map(([v, l]) => `<button type="button" role="radio" data-group="${name}" data-value="${v}" aria-pressed="${v === selected}" aria-checked="${v === selected}">${l}</button>`).join('')}</div>`;

const body = `
<main>
<section class="hero">
<div class="wrap">
<div>
<p class="eyebrow">[ System notification ]</p>
<h1>Your GitHub profile, <em>awakened.</em></h1>
<p class="lede">Ranks from E to EX, a job class, titles you earn, and a year of commits that rises as a shadow army. Drawn as SVG for your profile README and refreshed every night by a GitHub Action.</p>
<div class="ctas"><a class="btn btn-primary" href="#setup">Set up in 3 steps</a><a class="btn btn-ghost" href="/docs">Read the guide</a></div>
<div class="facts">
<div><span class="label">Widgets</span><b>11</b></div>
<div><span class="label">Achievements</span><b>16</b></div>
<div><span class="label">Themes</span><b>${THEMES.length}</b></div>
<div><span class="label">Fake numbers</span><b>0</b></div>
</div>
</div>
<div class="stage">
<div class="toast" aria-hidden="true"><i>!</i>You have reached Rank C.</div>
<img src="/demo/hunter-dark.svg" width="840" height="232" alt="Hunter license of ${DEMO_USER}: rank C, level 14, Holy Knight, title Night Owl">
<img src="/demo/activity-dark.svg" width="840" height="268" alt="ARISE: every active day of the last year rises as a shadow knight">
</div>
</div>
</section>

<section id="widgets">
<div class="wrap">
<div class="section-head"><p class="eyebrow">[ What the System shows ]</p><h2>Eleven widgets, every number real.</h2><p>Each image below is ${DEMO_USER}'s real profile, regenerated every night.</p></div>

<div class="feature">
<div class="copy"><h3>A status window, not a stats card</h3><p>Six stats with a rank each, a level that climbs with every kind of contribution, and a class awakened from your top language.</p>
${featureList(['STR, AGI, INT, VIT, LUK and CHA, each with its real source', 'Progress to the next rank under every stat', 'Ranks drawn as sigils whose frame grows with the tier'])}</div>
<div class="ticks"><img src="/demo/status-dark.svg" width="840" height="540" alt="Status window" loading="lazy"></div>
</div>

<div class="feature flip">
<div class="copy"><h3>Your year, played as a game</h3><p>Pick how your contribution calendar comes to life.</p>
${segmented('Activity preview', [['arise', 'ARISE'], ['raid', 'Dungeon Raid']], 'arise')}
<p id="activity-copy">A violet wave sweeps the year. Every active day rises as a shadow knight; days with ten or more contributions become glowing marshals.</p></div>
<div class="ticks"><img id="activity-img" src="/demo/activity-dark.svg" width="840" height="268" alt="Activity widget" loading="lazy"></div>
</div>

<div class="feature">
<div class="copy"><h3>Sixteen achievements, a title to wear</h3><p>Three tiers each, from Night Owl to Raider. Reach tier I and the title is yours to show under your name.</p>
${featureList(['Earned from real behaviour: commit hours, streaks, merged pull requests', 'Locked badges show exactly how far away they are', 'Choose your title in one line of config'])}</div>
<div class="ticks"><img src="/demo/achievements-dark.svg" width="840" height="444" alt="Achievements" loading="lazy"></div>
</div>

<div class="halves">
<figure><img src="/demo/quest-dark.svg" width="420" height="280" alt="" loading="lazy"><figcaption><b>Active quest.</b> Your latest repository as a dungeon to clear.</figcaption></figure>
<figure><img src="/demo/skills-dark.svg" width="420" height="280" alt="" loading="lazy"><figcaption><b>Passive skills.</b> Top languages, with a rune for each class.</figcaption></figure>
<figure><img src="/demo/contribution-dark.svg" width="420" height="280" alt="" loading="lazy"><figcaption><b>Contribution log.</b> Streaks that do not break before the day ends.</figcaption></figure>
<figure><img src="/demo/combat-dark.svg" width="420" height="280" alt="" loading="lazy"><figcaption><b>Combat record.</b> Raids into other people's repositories and more.</figcaption></figure>
<figure><img src="/demo/hours-dark.svg" width="420" height="280" alt="" loading="lazy"><figcaption><b>Hunting hours.</b> When you actually commit, on a 24-hour clock.</figcaption></figure>
<figure><img src="/demo/daily-dark.svg" width="420" height="280" alt="" loading="lazy"><figcaption><b>Daily quest.</b> Miss a day and you land in the Penalty Zone.</figcaption></figure>
</div>
</div>
</section>

<section id="themes">
<div class="wrap">
<div class="section-head"><p class="eyebrow">[ Dimensions ]</p><h2>${THEMES.length} themes, all readable.</h2><p>Every theme is held to the same contrast rules in dark and light. Rank colors never change, so an S is gold everywhere. Pick one to try it below.</p></div>
<div class="themes">${themeCards}</div>
</div>
</section>

<section id="how">
<div class="wrap">
<div class="section-head"><p class="eyebrow">[ How it runs ]</p><h2>Set it once. The System updates at midnight.</h2></div>
<div class="steps">
<div class="step frame"><div class="inner"><span class="num">01</span><h3>You add a config</h3><p><code>awaken.json</code> holds your theme, title, activity style and timezone.</p></div></div>
<div class="step frame"><div class="inner"><span class="num">02</span><h3>The Action runs nightly</h3><p>Just after midnight in your timezone it reads your GitHub data and draws every widget, dark and light.</p></div></div>
<div class="step frame"><div class="inner"><span class="num">03</span><h3>Your README updates itself</h3><p>The SVGs are committed and one marked block of your README is rewritten. Nothing else is touched.</p></div></div>
</div>
</div>
</section>

<section id="setup">
<div class="wrap">
<div class="section-head"><p class="eyebrow">[ Configurator ]</p><h2>Awaken your profile.</h2><p>Fill this in, preview it with your own data, and copy three snippets into your profile repository.</p></div>
<div class="config">
<form class="frame" id="cfg" novalidate><div class="inner">
<div class="field"><label class="label" for="username">GitHub username</label>
<div class="row"><input id="username" name="username" value="${DEMO_USER}" autocomplete="username" spellcheck="false" required pattern="[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}"><button class="btn btn-primary" type="submit">Preview</button></div>
<p class="hint" id="username-hint">The preview uses your public data.</p></div>
<div class="field"><label class="label" for="theme">Theme</label>${select('theme', THEMES.map((t) => [t.id, t.name]), DEFAULTS.theme)}</div>
<div class="field"><span class="label" id="activity-label">Activity</span>${segmented('activity', [['arise', 'ARISE'], ['raid', 'Dungeon Raid']], 'arise')}</div>
<div class="field"><label class="label" for="title">Title</label>${select('title', [['auto', 'Best earned title'], ...ACHIEVEMENTS.map((a): [string, string] => [a.id, a.title])], 'auto')}<p class="hint">Shown only once you reach tier I of it.</p></div>
<div class="field"><span class="label">Skill icons</span>${segmented('icons', [['rune', 'Runes'], ['brand', 'Logos']], 'rune')}</div>
<div class="field"><span class="label">Motion</span>${segmented('motion', [['full', 'Full'], ['calm', 'Calm'], ['none', 'Still']], 'full')}</div>
<div class="field"><label class="label" for="timezone">Timezone</label><select id="timezone" name="timezone"></select><p class="hint">The workflow runs at 00:10 in this zone.</p></div>
<fieldset class="field" style="border:0;padding:0;margin:0"><legend class="label" style="margin-bottom:8px">Widgets</legend>
<div class="chips">${DEFAULTS.widgets.map((w) => `<label><input type="checkbox" name="widgets" value="${w}" checked><span>${w}</span></label>`).join('')}</div></fieldset>
</div></form>

<div class="out frame"><div class="inner">
<div class="tabs" role="tablist" aria-label="Files to add">
<button role="tab" id="tab-json" aria-controls="panel-json" aria-selected="true"><b>01</b>awaken.json</button>
<button role="tab" id="tab-wf" aria-controls="panel-wf" aria-selected="false" tabindex="-1"><b>02</b>Workflow</button>
<button role="tab" id="tab-readme" aria-controls="panel-readme" aria-selected="false" tabindex="-1"><b>03</b>README</button>
<button role="tab" id="tab-url" aria-controls="panel-url" aria-selected="false" tabindex="-1">Hosted URL</button>
</div>
<div class="panel" role="tabpanel" id="panel-json" aria-labelledby="tab-json"><p>Save at the root of your profile repository (the one named after your username).</p><div class="code"><pre id="out-json"></pre><button type="button" data-copy="out-json">Copy</button></div></div>
<div class="panel" role="tabpanel" id="panel-wf" aria-labelledby="tab-wf" hidden><p>Save as <code>.github/workflows/awaken.yml</code>. It runs at <span id="cron-local">00:10</span> every night, when you change <code>awaken.json</code>, and on demand.</p><div class="code"><pre id="out-wf"></pre><button type="button" data-copy="out-wf">Copy</button></div></div>
<div class="panel" role="tabpanel" id="panel-readme" aria-labelledby="tab-readme" hidden><p>Put these two lines where the widgets should appear in your <code>README.md</code>, then run the workflow once from the Actions tab.</p><div class="code"><pre id="out-readme"></pre><button type="button" data-copy="out-readme">Copy</button></div></div>
<div class="panel" role="tabpanel" id="panel-url" aria-labelledby="tab-url" hidden><p>No Action: paste image links instead. Commit hours and the nightly snapshot are not available this way.</p><div class="code"><pre id="out-url"></pre><button type="button" data-copy="out-url">Copy</button></div></div>
<div class="preview" aria-live="polite">
<p class="status" id="preview-status">Preview of ${DEMO_USER}.</p>
<img id="pv-hunter" alt="Hunter card preview" width="840" height="232">
<img id="pv-activity" alt="Activity preview" width="840" height="268">
</div>
</div></div>
</div>
</div>
</section>
</main>`;

const script = `
const $ = (id) => document.getElementById(id);
const form = $('cfg');
const state = { activity: 'arise', icons: 'rune', motion: 'full' };
const ALL_WIDGETS = ${JSON.stringify(DEFAULTS.widgets)};

// Timezones: the browser's own list, the visitor's zone selected.
const here = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
const zones = (Intl.supportedValuesOf ? Intl.supportedValuesOf('timeZone') : [here, 'UTC']);
$('timezone').replaceChildren(...zones.map((z) => new Option(z.replace(/_/g, ' '), z, false, z === here)));

const offsetMinutes = (zone) => {
  const name = new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'longOffset' }).formatToParts(new Date()).find((p) => p.type === 'timeZoneName').value;
  const m = /GMT([+-])(\\d{2}):(\\d{2})/.exec(name);
  return m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0;
};
// 00:10 local time, expressed in UTC for GitHub's scheduler.
const nightlyCron = (zone) => {
  const utc = (((10 - offsetMinutes(zone)) % 1440) + 1440) % 1440;
  return (utc % 60) + ' ' + Math.floor(utc / 60) + ' * * *';
};

const values = () => ({
  username: $('username').value.trim() || 'YOUR_USERNAME',
  theme: $('theme').value,
  title: $('title').value,
  timezone: $('timezone').value,
  widgets: [...form.querySelectorAll('input[name=widgets]:checked')].map((i) => i.value),
  ...state,
});

const render = () => {
  const v = values();
  const json = { username: v.username, theme: v.theme, title: v.title, activity: v.activity, icons: v.icons, motion: v.motion, timezone: v.timezone };
  if (v.widgets.length !== ALL_WIDGETS.length) json.widgets = v.widgets;
  $('out-json').textContent = JSON.stringify(json, null, 2);
  const cron = nightlyCron(v.timezone);
  $('cron-local').textContent = '00:10 ' + v.timezone.replace(/_/g, ' ');
  $('out-wf').textContent = [
    'name: Awaken', '', 'on:', '  schedule:', '    - cron: "' + cron + '"   # 00:10 in ' + v.timezone, '  workflow_dispatch:', '  push:', '    branches: [main]', '    paths: [awaken.json]', '',
    'permissions:', '  contents: write', '', 'concurrency:', '  group: awaken', '  cancel-in-progress: true', '',
    'jobs:', '  awaken:', '    runs-on: ubuntu-latest', '    steps:', '      - uses: actions/checkout@v4', '      - uses: billtruong003/git-profile-awaken@main',
  ].join('\\n');
  $('out-readme').textContent = '<!-- AWAKEN:START -->\\n<!-- AWAKEN:END -->';
  const base = location.origin + '/api?' ;
  const q = (w) => base + new URLSearchParams({ username: v.username, widget: w, theme: v.theme, activity: v.activity, icons: v.icons, motion: v.motion, title: v.title, timezone: v.timezone });
  $('out-url').textContent = v.widgets.filter((w) => w !== 'runes').map((w) => '![' + w + '](' + q(w) + ')').join('\\n');
};

let previewTimer;
const preview = () => {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(() => {
    const v = values();
    if (!$('username').checkValidity()) { $('preview-status').textContent = 'That is not a GitHub username.'; return; }
    const params = { username: v.username, theme: v.theme, activity: v.activity, icons: v.icons, motion: v.motion, title: v.title, timezone: v.timezone };
    $('preview-status').textContent = 'Summoning ' + v.username + '… the first look at a new profile takes a few seconds.';
    let pending = 2;
    for (const [id, widget] of [['pv-hunter', 'hunter'], ['pv-activity', 'activity']]) {
      const img = $(id);
      img.onload = img.onerror = () => { if (--pending === 0) $('preview-status').textContent = 'Preview of ' + v.username + '.'; };
      img.src = '/api?' + new URLSearchParams({ ...params, widget });
    }
  }, 250);
};

// Segmented controls behave like radio groups.
document.querySelectorAll('[data-group]').forEach((b) => b.addEventListener('click', () => {
  const group = b.dataset.group;
  document.querySelectorAll('[data-group="' + group + '"]').forEach((x) => { x.setAttribute('aria-pressed', x === b); x.setAttribute('aria-checked', x === b); });
  if (group === 'Activity preview') {
    $('activity-img').src = b.dataset.value === 'raid' ? '/demo/raid-dark.svg' : '/demo/activity-dark.svg';
    $('activity-copy').textContent = b.dataset.value === 'raid'
      ? 'The hunter clears your year week by week. Busier days hold stronger monsters, and your busiest week is the boss.'
      : 'A violet wave sweeps the year. Every active day rises as a shadow knight; days with ten or more contributions become glowing marshals.';
    return;
  }
  state[group] = b.dataset.value;
  render(); preview();
}));

form.addEventListener('change', (e) => { render(); if (e.target.id !== 'username') preview(); });
form.addEventListener('input', render);
form.addEventListener('submit', (e) => { e.preventDefault(); render(); preview(); });

// Theme gallery fills the configurator.
document.querySelectorAll('.theme').forEach((card) => card.addEventListener('click', () => {
  $('theme').value = card.dataset.theme;
  render(); preview();
  $('setup').scrollIntoView();
}));

// Tabs with arrow-key support.
const tabs = [...document.querySelectorAll('[role=tab]')];
const select = (tab) => {
  tabs.forEach((t) => { const on = t === tab; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; $(t.getAttribute('aria-controls')).hidden = !on; });
  tab.focus();
};
tabs.forEach((t, i) => {
  t.addEventListener('click', () => select(t));
  t.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') select(tabs[(i + 1) % tabs.length]);
    if (e.key === 'ArrowLeft') select(tabs[(i - 1 + tabs.length) % tabs.length]);
  });
});

document.querySelectorAll('[data-copy]').forEach((b) => b.addEventListener('click', async () => {
  const text = $(b.dataset.copy).textContent;
  try { await navigator.clipboard.writeText(text); b.textContent = 'Copied'; }
  catch { const r = document.createRange(); r.selectNodeContents($(b.dataset.copy)); getSelection().removeAllRanges(); getSelection().addRange(r); b.textContent = 'Press Ctrl+C'; }
  setTimeout(() => (b.textContent = 'Copy'), 1600);
}));

render(); preview();
`;

export const homePage = (): string =>
  page({
    title: 'Git Profile Awaken',
    description: 'Turn your GitHub profile README into a LitRPG System window: ranks, achievements, titles and an animated shadow army, refreshed every night.',
    path: '/',
    css: CSS,
    body,
    script,
  });

