import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Marked } from 'marked';
import { escapeHtml, page, REPO_URL } from './layout.js';

const DOCS = {
  '/docs': { file: 'guide.md', title: 'User guide' },
  '/docs/development': { file: 'development.md', title: 'Developer guide' },
} as const;
export type DocPath = keyof typeof DOCS;
export const isDocPath = (path: string): path is DocPath => path in DOCS;

const slug = (text: string): string => text.toLowerCase().replace(/<[^>]+>/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const CSS = `
.docs{display:grid;grid-template-columns:240px minmax(0,1fr);gap:56px;padding-block:48px 0}
@media (max-width:900px){.docs{grid-template-columns:1fr;gap:24px}.toc{position:static!important;max-height:none!important}}
.toc{position:sticky;top:84px;align-self:start;max-height:calc(100vh - 100px);overflow:auto;display:flex;flex-direction:column;gap:12px}
.toc summary{cursor:pointer;list-style:none;padding:4px 0}.toc summary::-webkit-details-marker{display:none}.toc summary::after{content:' +';color:var(--system)}.toc details[open] summary::after{content:' −'}
.toc ol{list-style:none;margin-top:10px!important;margin:0;padding:0;display:flex;flex-direction:column;border-left:1px solid var(--line)}
.toc a{display:block;padding:6px 0 6px 14px;margin-left:-1px;border-left:1px solid transparent;color:var(--muted);text-decoration:none;font-size:14px;line-height:1.35}
.toc a:hover{color:var(--ink);border-left-color:var(--frame)}
.toc .other{margin-top:8px;font-size:14px}
.prose{max-width:760px;min-width:0}
.prose h1{font:700 clamp(34px,5vw,48px)/1.05 var(--fd);margin-bottom:18px}
.prose h1+p{font-size:18px;color:var(--muted)}
.prose h2{font:700 26px/1.15 var(--fd);margin:56px 0 14px;padding-top:20px;border-top:1px solid var(--line)}
.prose h3{font:700 19px/1.2 var(--fd);margin:32px 0 10px}
.prose p,.prose li{color:#c9d3e6}
.prose p{margin:0 0 14px}
.prose ul,.prose ol{margin:0 0 16px;padding-left:22px;display:flex;flex-direction:column;gap:6px}
.prose strong{color:var(--ink)}
.prose code{font-size:.88em;padding:2px 6px;background:var(--raised);border:1px solid var(--line);color:var(--ink)}
.prose pre{margin:0 0 18px;padding:16px;overflow:auto;background:var(--panel);border:1px solid var(--line);border-left:2px solid var(--system);font-size:13.5px;line-height:1.6}
.prose pre code{padding:0;background:none;border:0;font-size:inherit}
.prose .table{overflow-x:auto;margin:0 0 20px;border:1px solid var(--line)}
.prose table{border-collapse:collapse;width:100%;font-size:14.5px}
.prose th{text-align:left;font:600 12px/1.3 var(--fd);letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);background:var(--panel)}
.prose th,.prose td{padding:10px 14px;border-bottom:1px solid var(--line);vertical-align:top}
.prose tr:last-child td{border-bottom:0}
.prose h2 a.anchor,.prose h3 a.anchor{color:var(--line);text-decoration:none;margin-left:8px;font-weight:500}
.prose h2:hover a.anchor,.prose h3:hover a.anchor{color:var(--system)}
.edit{display:inline-block;margin-top:40px;font-size:14px;color:var(--muted)}
`;

const render = (markdown: string) => {
  const toc: { id: string; text: string }[] = [];
  const marked = new Marked({
    gfm: true,
    renderer: {
      heading({ tokens, depth }) {
        const html = this.parser.parseInline(tokens);
        if (depth === 1) return `<h1>${html}</h1>`;
        const id = slug(html);
        if (depth === 2) toc.push({ id, text: html.replace(/<[^>]+>/g, '') });
        return `<h${depth} id="${id}">${html}<a class="anchor" href="#${id}" aria-label="Link to this section">#</a></h${depth}>`;
      },
      table(token) {
        const head = `<tr>${token.header.map((c) => `<th>${this.parser.parseInline(c.tokens)}</th>`).join('')}</tr>`;
        const rows = token.rows.map((row) => `<tr>${row.map((c) => `<td>${this.parser.parseInline(c.tokens)}</td>`).join('')}</tr>`).join('');
        return `<div class="table"><table><thead>${head}</thead><tbody>${rows}</tbody></table></div>`;
      },
    },
  });
  const html = marked.parse(markdown, { async: false });
  return { html, toc };
};

const cache = new Map<DocPath, string>();

export const docsPage = async (path: DocPath): Promise<string> => {
  const hit = cache.get(path);
  if (hit) return hit;
  const doc = DOCS[path];
  const markdown = await readFile(join(process.cwd(), 'docs', doc.file), 'utf8');
  const { html, toc } = render(markdown);
  const other = path === '/docs' ? ['/docs/development', 'Developer guide'] : ['/docs', 'User guide'];
  const result = page({
    title: `${doc.title} · Git Profile Awaken`,
    description: doc.title === 'User guide' ? 'Set up Git Profile Awaken, every option, and troubleshooting.' : 'Architecture, local development, and how to add themes, widgets and achievements.',
    path,
    css: CSS,
    script: "if (matchMedia('(max-width: 900px)').matches) document.querySelector('.toc details').open = false;",
    body: `<main class="wrap docs">
<nav class="toc" aria-label="On this page"><details open><summary class="label">On this page</summary><ol>${toc.map((t) => `<li><a href="#${t.id}">${escapeHtml(t.text)}</a></li>`).join('')}</ol></details>
<a class="other" href="${other[0]}">${other[1]} →</a></nav>
<article class="prose">${html}<a class="edit" href="${REPO_URL}/edit/main/docs/${doc.file}">Edit this page on GitHub</a></article>
</main>`,
  });
  cache.set(path, result);
  return result;
};
