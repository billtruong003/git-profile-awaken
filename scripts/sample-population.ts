// Samples random GitHub accounts and measures the six stats, so ranks can be percentiles of real players.
// Run: GITHUB_TOKEN=… npx tsx scripts/sample-population.ts [targetRegular=1000]
// A "regular" player has at least REGULAR contributions in the past year; ranks compare against them.
// Output: data/population-sample.jsonl (appended, so a stopped run can continue), then `npm run fit-population`.
import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const token = process.env.GITHUB_TOKEN;
if (!token) throw new Error('Set GITHUB_TOKEN.');
const TARGET = Number(process.argv[2] ?? 1000);
const REGULAR = 10;
const OUT = 'data/population-sample.jsonl';
const BATCH = 20;

const rest = async <T>(path: string): Promise<T> => {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`https://api.github.com${path}`, { headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'git-profile-awaken-sampler' } });
    if (res.ok) return (await res.json()) as T;
    if (attempt >= 3) throw new Error(`${path}: ${res.status}`);
    await new Promise((r) => setTimeout(r, 5000 * (attempt + 1)));
  }
};

const graphql = async <T>(query: string): Promise<T> => {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch('https://api.github.com/graphql', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ query }) });
    const remaining = Number(res.headers.get('x-ratelimit-remaining') ?? 1000);
    if (remaining < 50) {
      const reset = Number(res.headers.get('x-ratelimit-reset') ?? 0) * 1000;
      console.log(`rate limit low, sleeping until ${new Date(reset).toISOString()}`);
      await new Promise((r) => setTimeout(r, Math.max(0, reset - Date.now()) + 2000));
    }
    if (res.ok) return ((await res.json()) as { data: T }).data;
    if (attempt >= 3) throw new Error(`graphql: ${res.status}`);
    await new Promise((r) => setTimeout(r, 5000 * (attempt + 1)));
  }
};

/** Highest user id, found by binary search over `GET /users?since=`. */
const maxUserId = async (): Promise<number> => {
  let lo = 1, hi = 1_000_000_000;
  while (hi - lo > 1000) {
    const mid = Math.floor((lo + hi) / 2);
    const page = await rest<{ id: number }[]>(`/users?since=${mid}&per_page=1`);
    if (page.length) lo = mid; else hi = mid;
  }
  return lo;
};

interface Measured {
  login: string;
  createdAt: string;
  yearContributions: number;
  STR: number;
  AGI: number;
  INT: number;
  VIT: number;
  LUK: number;
  CHA: number;
}

type UserNode = {
  login: string;
  createdAt: string;
  followers: { totalCount: number };
  pullRequests: { totalCount: number };
  issues: { totalCount: number };
  repositories: { nodes: { stargazerCount: number }[] };
  contributionsCollection: { contributionCalendar: { totalContributions: number }; commitContributionsByRepository: unknown[] };
} | null;

const measureBatch = async (logins: string[]): Promise<Measured[]> => {
  const body = logins.map((login, i) => `u${i}: user(login: ${JSON.stringify(login)}) {
    login createdAt followers { totalCount } pullRequests { totalCount } issues { totalCount }
    repositories(first: 100, ownerAffiliations: OWNER, isFork: false, orderBy: { field: STARGAZERS, direction: DESC }) { nodes { stargazerCount } }
    contributionsCollection { contributionCalendar { totalContributions } commitContributionsByRepository(maxRepositories: 100) { contributions { totalCount } } }
  }`).join('\n');
  const data = await graphql<Record<string, UserNode>>(`{ ${body} }`);
  const active = Object.values(data).filter((u): u is NonNullable<UserNode> => !!u && u.contributionsCollection.contributionCalendar.totalContributions > 0);
  if (active.length === 0) return [];

  // Lifetime commits for the active ones, year by year like the real widget, several players per query.
  const now = new Date();
  const lifetime = new Map<string, number>();
  for (let i = 0; i < active.length; i += 5) {
    const group = active.slice(i, i + 5);
    const body = group.map((user, j) => {
      const aliases: string[] = [];
      for (let y = new Date(user.createdAt).getUTCFullYear(); y <= now.getUTCFullYear(); y++) {
        aliases.push(`y${y}: contributionsCollection(from: "${y}-01-01T00:00:00Z", to: "${y === now.getUTCFullYear() ? now.toISOString() : `${y}-12-31T23:59:59Z`}") { totalCommitContributions }`);
      }
      return `p${j}: user(login: ${JSON.stringify(user.login)}) { login ${aliases.join(' ')} }`;
    }).join(' ');
    const data = await graphql<Record<string, (Record<string, { totalCommitContributions: number }> & { login: string }) | null>>(`{ ${body} }`).catch(() => ({}));
    for (const entry of Object.values(data)) {
      if (!entry) continue;
      const { login, ...years } = entry;
      lifetime.set(login, Object.values(years).reduce((s, y) => s + y.totalCommitContributions, 0));
    }
  }

  return active.map((u) => ({
    login: u.login,
    createdAt: u.createdAt,
    yearContributions: u.contributionsCollection.contributionCalendar.totalContributions,
    STR: lifetime.get(u.login) ?? 0,
    AGI: u.pullRequests.totalCount,
    INT: u.issues.totalCount,
    VIT: u.contributionsCollection.commitContributionsByRepository.length,
    LUK: u.repositories.nodes.reduce((s, r) => s + r.stargazerCount, 0),
    CHA: u.followers.totalCount,
  }));
};

await mkdir('data', { recursive: true });
const seen = new Set<string>();
let active = 0;
if (existsSync(OUT)) {
  for (const line of (await readFile(OUT, 'utf8')).split('\n').filter(Boolean)) {
    const m = JSON.parse(line) as Measured;
    seen.add(m.login);
    if (m.yearContributions >= REGULAR) active++;
  }
}
let scanned = 0;
const max = await maxUserId();
console.log(`max user id ≈ ${max}; ${active} regular players already sampled; target ${TARGET}`);

const WORKERS = 4;
const worker = async () => {
  while (active < TARGET) {
    // A random starting id, then the next 100 accounts: uniform over the id space, cheap per request.
    const since = Math.floor(Math.random() * max);
    const page = await rest<{ login: string; type: string }[]>(`/users?since=${since}&per_page=100`).catch(() => []);
    const logins = page.filter((u) => u.type === 'User' && !seen.has(u.login)).map((u) => u.login);
    for (let i = 0; i < logins.length && active < TARGET; i += BATCH) {
      const measured = await measureBatch(logins.slice(i, i + BATCH)).catch((err) => {
        console.log(`batch failed: ${(err as Error).message}`);
        return [];
      });
      for (const m of measured) {
        if (seen.has(m.login)) continue;
        seen.add(m.login);
        await appendFile(OUT, `${JSON.stringify(m)}\n`);
        if (m.yearContributions >= REGULAR) active++;
      }
    }
    scanned += logins.length;
    console.log(`scanned ${scanned} accounts, ${seen.size} active, ${active} regular`);
  }
};
await Promise.all(Array.from({ length: WORKERS }, worker));
console.log('done');
