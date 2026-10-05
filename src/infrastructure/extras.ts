import type { FeedItem, RepoCard } from '../domain/types.js';

const TIMEOUT_MS = 10_000;

type RepoNode = {
  owner: { login: string };
  name: string;
  description: string | null;
  stargazerCount: number;
  forkCount: number;
  primaryLanguage: { name: string; color: string | null } | null;
  pushedAt: string;
};

const REPO_FIELDS = 'owner { login } name description stargazerCount forkCount primaryLanguage { name color } pushedAt';

const toCard = (r: RepoNode): RepoCard => ({
  owner: r.owner.login,
  name: r.name,
  description: r.description ?? '',
  stars: r.stargazerCount,
  forks: r.forkCount,
  language: r.primaryLanguage ? { name: r.primaryLanguage.name, color: r.primaryLanguage.color ?? '#888888' } : null,
  pushedAt: r.pushedAt,
});

const graphql = async <T>(token: string, query: string, variables: Record<string, unknown>): Promise<T> => {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'git-profile-awaken' },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`GitHub answered ${res.status}`);
  return ((await res.json()) as { data: T }).data;
};

/**
 * The repositories for Repo Spotlight: the ones named in the config ("name" means one of the player's own),
 * or the player's pinned repositories when none are named. Missing repositories are skipped.
 */
export const fetchSpotlight = async (login: string, token: string, wanted: string[]): Promise<RepoCard[]> => {
  if (wanted.length === 0) {
    const data = await graphql<{ user: { pinnedItems: { nodes: (RepoNode | Record<string, never>)[] } } | null }>(
      token,
      `query($login: String!) { user(login: $login) { pinnedItems(first: 6, types: REPOSITORY) { nodes { ... on Repository { ${REPO_FIELDS} } } } } }`,
      { login },
    );
    return (data.user?.pinnedItems.nodes ?? []).filter((n): n is RepoNode => 'name' in n).map(toCard);
  }
  const refs = wanted.slice(0, 6).map((w) => (w.includes('/') ? w.split('/', 2) as [string, string] : [login, w] as [string, string]));
  const body = refs.map(([owner, name], i) => `r${i}: repository(owner: ${JSON.stringify(owner)}, name: ${JSON.stringify(name)}) { ${REPO_FIELDS} }`).join('\n');
  const data = await graphql<Record<string, RepoNode | null>>(token, `{ ${body} }`, {}).catch(() => ({}) as Record<string, RepoNode | null>);
  return refs.flatMap((_, i) => (data[`r${i}`] ? [toCard(data[`r${i}`]!)] : []));
};

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'" };
const decode = (s: string): string =>
  s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e: string) => {
      if (e[0] === '#') return String.fromCodePoint(e[1]?.toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
      return ENTITIES[e] ?? m;
    })
    .replace(/<[^>]+>/g, '')
    .trim();

const tag = (xml: string, name: string): string | null => {
  const m = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i').exec(xml);
  return m ? decode(m[1]!) : null;
};

/** Reads RSS 2.0 items or Atom entries (YouTube channel feeds are Atom). No XML library: only titles, links and dates. */
export const parseFeed = (xml: string, source: string): FeedItem[] => {
  const atom = /<feed[\s>]/i.test(xml);
  const blocks = xml.match(atom ? /<entry[\s>][\s\S]*?<\/entry>/gi : /<item[\s>][\s\S]*?<\/item>/gi) ?? [];
  const feedTitle = tag(xml.replace(/<(entry|item)[\s>][\s\S]*?<\/\1>/gi, ''), 'title') ?? source;
  return blocks.flatMap((block) => {
    const title = tag(block, 'title');
    const url = atom ? (/<link[^>]*?href="([^"]+)"/i.exec(block)?.[1] ?? null) : tag(block, 'link');
    const date = tag(block, atom ? 'published' : 'pubDate') ?? tag(block, 'updated') ?? '';
    if (!title || !url) return [];
    const parsed = Date.parse(date);
    return [{ title, url: decode(url), date: Number.isNaN(parsed) ? '' : new Date(parsed).toISOString(), source: feedTitle }];
  });
};

/** Newest items across all feeds; a feed that fails is skipped rather than failing the run. */
export const fetchFeeds = async (urls: string[], limit = 5): Promise<FeedItem[]> => {
  const lists = await Promise.all(urls.map(async (url) => {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'git-profile-awaken' }, signal: AbortSignal.timeout(TIMEOUT_MS) });
      return res.ok ? parseFeed(await res.text(), new URL(url).hostname) : [];
    } catch {
      return [];
    }
  }));
  return lists.flat().sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
};
