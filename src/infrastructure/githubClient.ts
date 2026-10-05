import type { CalendarDay, DayLog, LanguageShare, QuestInfo, Raid, RawProfile } from '../domain/types.js';

const ENDPOINT = 'https://api.github.com/graphql';
const TIMEOUT_MS = 15_000;
/** Stars and languages come from the 300 most-starred repositories; the long tail adds almost nothing. */
const MAX_REPO_PAGES = 3;
const LANGUAGE_BATCH = 10;
const PARALLEL = 10;
const YEARS_PER_QUERY = 3;
const HOUR_REPOS = 25;
const HOUR_BATCH = 5;

export class GithubError extends Error {
  constructor(message: string, readonly code: 'not_found' | 'auth' | 'rate_limit' | 'upstream') {
    super(message);
  }
}

const graphql = async <T>(token: string, query: string, variables: Record<string, unknown> = {}, attempt = 0): Promise<T> => {
  let response: Response;
  try {
    response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'git-profile-awaken' },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    if (attempt < 2) return graphql(token, query, variables, attempt + 1);
    throw new GithubError(`GitHub did not answer: ${(err as Error).message}`, 'upstream');
  }

  if (response.status === 401) throw new GithubError('The GitHub token was rejected. Check the token you passed in.', 'auth');
  if (response.status === 403 || response.status === 429) throw new GithubError('GitHub rate limit reached. Try again later.', 'rate_limit');
  if (response.status >= 500 && attempt < 2) return graphql(token, query, variables, attempt + 1);
  if (!response.ok) throw new GithubError(`GitHub answered ${response.status}.`, 'upstream');

  const payload = (await response.json()) as { data?: T; errors?: { type?: string; message: string }[] };
  const error = payload.errors?.[0];
  if (error) throw new GithubError(error.message, error.type === 'NOT_FOUND' ? 'not_found' : 'upstream');
  return payload.data as T;
};

/** Runs `tasks` with at most `limit` in flight. */
const pooled = async <T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> => {
  const results: T[] = new Array(tasks.length);
  let next = 0;
  const worker = async () => {
    while (next < tasks.length) {
      const i = next++;
      results[i] = await tasks[i]!();
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
};

const chunk = <T>(items: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
};

// ---------- identity and counters: one cheap query ----------
interface Identity {
  id: string;
  login: string;
  name: string | null;
  createdAt: string;
  followers: { totalCount: number };
  organizations: { totalCount: number };
  pullRequests: { totalCount: number };
  merged: { totalCount: number };
  issues: { totalCount: number };
}

const fetchIdentity = async (login: string, token: string): Promise<Identity> => {
  const data = await graphql<{ user: Identity | null }>(token, `query($login: String!) { user(login: $login) {
    id login name createdAt
    followers { totalCount } organizations { totalCount }
    pullRequests { totalCount } merged: pullRequests(states: MERGED) { totalCount } issues { totalCount }
  } }`, { login });
  if (!data.user) throw new GithubError(`No GitHub user named "${login}".`, 'not_found');
  return data.user;
};

// ---------- repositories: the list is cheap, languages are not ----------
interface RepoNode {
  name: string;
  stargazerCount: number;
  pushedAt: string;
  createdAt: string;
}

interface RepoPage {
  user: { repositories: { totalCount: number; pageInfo: { hasNextPage: boolean; endCursor: string | null }; nodes: RepoNode[] } } | null;
}

const REPO_PAGE_QUERY = `query($login: String!, $after: String) { user(login: $login) {
  repositories(first: 100, after: $after, ownerAffiliations: OWNER, isFork: false, orderBy: { field: STARGAZERS, direction: DESC }) {
    totalCount pageInfo { hasNextPage endCursor }
    nodes { name stargazerCount pushedAt createdAt }
  }
} }`;

/**
 * Pages through the repository list with only cheap fields; asking for languages or commit messages here
 * costs 3–9 s per page. `onPage` lets the caller start work on a page while the next one loads.
 */
const fetchRepoList = async (login: string, token: string, onPage: (page: RepoNode[]) => void) => {
  let after: string | null = null;
  let total = 0;
  const repos: RepoNode[] = [];
  for (let index = 0; index < MAX_REPO_PAGES; index++) {
    const data: RepoPage = await graphql<RepoPage>(token, REPO_PAGE_QUERY, { login, after });
    if (!data.user) throw new GithubError(`No GitHub user named "${login}".`, 'not_found');
    total = data.user.repositories.totalCount;
    repos.push(...data.user.repositories.nodes);
    onPage(data.user.repositories.nodes);
    if (!data.user.repositories.pageInfo.hasNextPage) break;
    after = data.user.repositories.pageInfo.endCursor;
  }
  return { repos, total };
};

type LanguageBatch = Record<string, { languages: { edges: { size: number; node: { name: string; color: string | null } }[] } } | null>;

/** Languages for one page of repositories, by alias, in small batches that run side by side. */
const fetchLanguages = (login: string, token: string, names: string[]): Promise<LanguageBatch[]> =>
  pooled(chunk(names, LANGUAGE_BATCH).map((batch) => () => {
    const body = batch
      .map((name, j) => `r${j}: repository(owner: ${JSON.stringify(login)}, name: ${JSON.stringify(name)}) { languages(first: 10, orderBy: { field: SIZE, direction: DESC }) { edges { size node { name color } } } }`)
      .join('\n');
    return graphql<LanguageBatch>(token, `{ ${body} }`);
  }), PARALLEL);

const languageShares = (results: LanguageBatch[]): LanguageShare[] => {
  const totals = new Map<string, { size: number; color: string }>();
  let all = 0;
  for (const data of results) {
    for (const repo of Object.values(data)) {
      for (const edge of repo?.languages.edges ?? []) {
        const entry = totals.get(edge.node.name) ?? { size: 0, color: edge.node.color ?? '#888888' };
        entry.size += edge.size;
        totals.set(edge.node.name, entry);
        all += edge.size;
      }
    }
  }
  return [...totals.entries()]
    .map(([name, { size, color }]) => ({ name, color, percent: all ? Math.round((size / all) * 1000) / 10 : 0 }))
    .sort((a, b) => b.percent - a.percent)
    .slice(0, 10);
};

// ---------- contributions ----------
interface YearTotals {
  totalCommitContributions: number;
  totalPullRequestReviewContributions: number;
}

const fetchYears = async (login: string, token: string, years: number[], now: Date): Promise<YearTotals[]> => {
  const aliases = years.map((year) => {
    const to = year === now.getUTCFullYear() ? now.toISOString() : `${year}-12-31T23:59:59Z`;
    return `y${year}: contributionsCollection(from: "${year}-01-01T00:00:00Z", to: "${to}") { totalCommitContributions totalPullRequestReviewContributions }`;
  });
  const data = await graphql<{ user: Record<string, YearTotals> }>(token, `query($login: String!) { user(login: $login) { ${aliases.join('\n')} } }`, { login });
  return Object.values(data.user);
};

/**
 * One contributions window may not exceed a year, so every year is its own alias. Long-lived accounts are
 * split into groups of three years that run in parallel; a group GitHub fails on is retried year by year.
 */
const fetchLifetime = async (login: string, token: string, createdAt: string, now: Date) => {
  const years: number[] = [];
  for (let year = new Date(createdAt).getUTCFullYear(); year <= now.getUTCFullYear(); year++) years.push(year);
  const groups = await pooled(chunk(years, YEARS_PER_QUERY).map((group) => async () => {
    try {
      return await fetchYears(login, token, group, now);
    } catch {
      return (await Promise.all(group.map((year) => fetchYears(login, token, [year], now)))).flat();
    }
  }), PARALLEL);
  const totals = groups.flat();
  return {
    commits: totals.reduce((sum, y) => sum + y.totalCommitContributions, 0),
    reviews: totals.reduce((sum, y) => sum + y.totalPullRequestReviewContributions, 0),
  };
};

interface LastYear {
  user: {
    contributionsCollection: {
      totalCommitContributions: number;
      totalPullRequestContributions: number;
      totalPullRequestReviewContributions: number;
      totalIssueContributions: number;
      totalRepositoryContributions: number;
      commitContributionsByRepository: { repository: { name: string; owner: { login: string } }; contributions: { totalCount: number } }[];
      contributionCalendar: { weeks: { contributionDays: { contributionCount: number; date: string; weekday: number }[] }[] };
    };
    raids: { nodes: { repository: { nameWithOwner: string; stargazerCount: number; owner: { login: string } } }[] };
  } | null;
}

const LAST_YEAR_QUERY = `query($login: String!) { user(login: $login) {
  contributionsCollection {
    totalCommitContributions totalPullRequestContributions totalPullRequestReviewContributions
    totalIssueContributions totalRepositoryContributions
    commitContributionsByRepository(maxRepositories: 100) { repository { name owner { login } } contributions { totalCount } }
    contributionCalendar { weeks { contributionDays { contributionCount date weekday } } }
  }
  raids: pullRequests(first: 100, states: MERGED, orderBy: { field: CREATED_AT, direction: DESC }) {
    nodes { repository { nameWithOwner stargazerCount owner { login } } }
  }
} }`;

const hourIn = (iso: string, timeZone: string): number =>
  Number(new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', hourCycle: 'h23' }).format(new Date(iso)));

type HistoryBatch = Record<string, { defaultBranchRef: { target: { history?: { nodes: { authoredDate: string }[] } } } | null } | null>;

/** Authored times of the player's commits in their busiest repositories over the last year. */
const fetchCommitHours = async (token: string, userId: string, repos: { owner: string; name: string }[], since: string, timeZone: string) => {
  const results = await pooled(chunk(repos, HOUR_BATCH).map((batch) => () => {
    const body = batch
      .map((r, j) => `r${j}: repository(owner: ${JSON.stringify(r.owner)}, name: ${JSON.stringify(r.name)}) { defaultBranchRef { target { ... on Commit { history(first: 100, since: "${since}", author: { id: "${userId}" }) { nodes { authoredDate } } } } } }`)
      .join('\n');
    return graphql<HistoryBatch>(token, `{ ${body} }`);
  }), PARALLEL);
  const hours = Array<number>(24).fill(0);
  for (const data of results) {
    for (const repo of Object.values(data)) {
      for (const commit of repo?.defaultBranchRef?.target.history?.nodes ?? []) hours[hourIn(commit.authoredDate, timeZone)]!++;
    }
  }
  return hours;
};

/**
 * The quest is the player's own most recently pushed repository, so every commit on it counts, even ones
 * authored under an email that is not linked to the account.
 */
const fetchQuest = async (token: string, login: string): Promise<QuestInfo | null> => {
  type QuestRepo = RepoNode & {
    primaryLanguage: { name: string; color: string | null } | null;
    defaultBranchRef: { target: { message?: string; history?: { totalCount: number } } } | null;
  };
  const data = await graphql<{ user: { repositories: { nodes: QuestRepo[] } } | null }>(
    token,
    `query($login: String!) { user(login: $login) { repositories(first: 1, ownerAffiliations: OWNER, isFork: false, orderBy: { field: PUSHED_AT, direction: DESC }) { nodes {
      name stargazerCount pushedAt createdAt primaryLanguage { name color }
      defaultBranchRef { target { ... on Commit { message history { totalCount } } } }
    } } } }`,
    { login },
  );
  const r = data.user?.repositories.nodes[0];
  if (!r) return null;
  const repo = r;
  return {
    repo: repo.name,
    language: r?.primaryLanguage ? { name: r.primaryLanguage.name, color: r.primaryLanguage.color ?? '#888888' } : null,
    createdAt: repo.createdAt,
    pushedAt: repo.pushedAt,
    lastMessage: r?.defaultBranchRef?.target.message?.split('\n')[0] ?? '',
    commits: r?.defaultBranchRef?.target.history?.totalCount ?? 0,
  };
};

// ---------- day by day, for the daily quests ----------
const DAY_COUNT = 9;

const offsetMinutes = (timeZone: string, at: Date): number => {
  const name = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' }).formatToParts(at).find((p) => p.type === 'timeZoneName')?.value ?? 'GMT';
  const m = /GMT([+-])(\d{2}):(\d{2})/.exec(name);
  return m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0;
};

export const localDate = (at: Date, timeZone: string): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(at);

/** Today and the eight days before it in `timeZone`, as [date, start, end] with UTC instants. */
export const dayWindows = (now: Date, timeZone: string): [string, string, string][] => {
  const today = localDate(now, timeZone);
  return Array.from({ length: DAY_COUNT }, (_, i) => {
    const date = new Date(Date.parse(`${today}T00:00:00Z`) - i * 864e5).toISOString().slice(0, 10);
    const startGuess = Date.parse(`${date}T00:00:00Z`);
    const start = startGuess - offsetMinutes(timeZone, new Date(startGuess)) * 60_000;
    const end = Math.min(start + 864e5 - 1000, now.getTime());
    return [date, new Date(start).toISOString(), new Date(Math.max(start, end)).toISOString()];
  });
};

type DayWindow = {
  totalCommitContributions: number;
  totalIssueContributions: number;
  commitContributionsByRepository: { contributions: { totalCount: number } }[];
  contributionCalendar: { totalContributions: number };
};

const fetchDays = async (login: string, token: string, timeZone: string, now: Date): Promise<DayLog[]> => {
  const windows = dayWindows(now, timeZone);
  const aliases = windows.map(([, from, to], i) => `d${i}: contributionsCollection(from: "${from}", to: "${to}") { totalCommitContributions totalIssueContributions commitContributionsByRepository(maxRepositories: 10) { contributions { totalCount } } contributionCalendar { totalContributions } }`);
  const data = await graphql<{ user: (Record<string, DayWindow> & { starredRepositories: { edges: { starredAt: string }[] } }) | null }>(
    token,
    `query($login: String!) { user(login: $login) { ${aliases.join('\n')} starredRepositories(first: 50, orderBy: { field: STARRED_AT, direction: DESC }) { edges { starredAt } } } }`,
    { login },
  );
  if (!data.user) return [];
  const starDays = data.user.starredRepositories.edges.map((e) => localDate(new Date(e.starredAt), timeZone));
  return windows.map(([date], i) => {
    const w = data.user![`d${i}`] as DayWindow;
    return {
      date,
      weekday: new Date(`${date}T00:00:00Z`).getUTCDay(),
      contributions: w.contributionCalendar.totalContributions,
      commits: w.totalCommitContributions,
      repos: w.commitContributionsByRepository.filter((r) => r.contributions.totalCount > 0).length,
      issues: w.totalIssueContributions,
      stars: starDays.filter((d) => d === date).length,
    };
  });
};

/** Pull requests and issues closed within five minutes, and pull requests merged without a review, among the last 100 of each. */
const fetchCloses = async (login: string, token: string) => {
  type Node = { createdAt: string; closedAt: string | null; reviews?: { totalCount: number } };
  const data = await graphql<{ user: { pullRequests: { nodes: Node[] }; issues: { nodes: Node[] } } | null }>(
    token,
    `query($login: String!) { user(login: $login) {
      pullRequests(first: 100, states: MERGED, orderBy: { field: CREATED_AT, direction: DESC }) { nodes { createdAt closedAt reviews(first: 1) { totalCount } } }
      issues(first: 100, states: CLOSED, orderBy: { field: CREATED_AT, direction: DESC }) { nodes { createdAt closedAt } }
    } }`,
    { login },
  );
  if (!data.user) return null;
  const quick = (n: Node) => !!n.closedAt && Date.parse(n.closedAt) - Date.parse(n.createdAt) <= 5 * 60_000;
  const prs = data.user.pullRequests.nodes;
  const issues = data.user.issues.nodes;
  return { quickdraws: prs.filter(quick).length + issues.filter(quick).length, unreviewedMerges: prs.filter((n) => (n.reviews?.totalCount ?? 0) === 0).length, sampled: prs.length + issues.length };
};

export interface FetchOptions {
  timeZone: string;
  commitHours: boolean;
  now?: Date;
}

/**
 * Everything independent runs at once. The critical path is the repository list (about 2 s per 100
 * repositories, at most three pages), with each page's language batches starting as soon as that page arrives.
 */
export const fetchRawProfile = async (login: string, token: string, options: FetchOptions): Promise<RawProfile> => {
  const now = options.now ?? new Date();
  const identityP = fetchIdentity(login, token);
  const lastYearP = graphql<LastYear>(token, LAST_YEAR_QUERY, { login });
  const questP = fetchQuest(token, login);
  // Extras for the daily quests and the PR badges: a failure here leaves them out instead of failing the profile.
  const daysP = fetchDays(login, token, options.timeZone, now).catch(() => null);
  const closesP = fetchCloses(login, token).catch(() => null);
  const languagePages: Promise<LanguageBatch[]>[] = [];
  const listP = fetchRepoList(login, token, (page) => {
    languagePages.push(fetchLanguages(login, token, page.map((r) => r.name)));
  });
  const languagesP = listP.then(async () => languageShares((await Promise.all(languagePages)).flat()));
  const lifetimeP = identityP.then((user) => fetchLifetime(login, token, user.createdAt, now));
  const hoursP = options.commitHours
    ? Promise.all([identityP, lastYearP]).then(([user, last]) => {
      const busiest = [...(last.user?.contributionsCollection.commitContributionsByRepository ?? [])]
        .sort((a, b) => b.contributions.totalCount - a.contributions.totalCount)
        .slice(0, HOUR_REPOS)
        .map((r) => ({ owner: r.repository.owner.login, name: r.repository.name }));
      return fetchCommitHours(token, user.id, busiest, new Date(now.getTime() - 365 * 864e5).toISOString(), options.timeZone);
    })
    : Promise.resolve(null);

  const [user, lastYear, { repos, total }, languages, lifetime, commitHours, quest, days, closes] = await Promise.all([identityP, lastYearP, listP, languagesP, lifetimeP, hoursP, questP, daysP, closesP]);
  if (!lastYear.user) throw new GithubError(`No GitHub user named "${login}".`, 'not_found');

  const year = lastYear.user.contributionsCollection;
  const calendar: CalendarDay[] = year.contributionCalendar.weeks.flatMap((w) =>
    w.contributionDays.map((d) => ({ date: d.date, count: d.contributionCount, weekday: d.weekday })),
  );
  const raidMap = new Map<string, Raid>();
  for (const pr of lastYear.user.raids.nodes) {
    if (pr.repository.owner.login.toLowerCase() === user.login.toLowerCase()) continue;
    const raid = raidMap.get(pr.repository.nameWithOwner) ?? { repo: pr.repository.nameWithOwner, stars: pr.repository.stargazerCount, merged: 0 };
    raid.merged++;
    raidMap.set(raid.repo, raid);
  }

  return {
    login: user.login,
    name: user.name,
    createdAt: user.createdAt,
    followers: user.followers.totalCount,
    organizations: user.organizations.totalCount,
    ownedRepos: total,
    stars: repos.reduce((sum, r) => sum + r.stargazerCount, 0),
    pullRequests: user.pullRequests.totalCount,
    mergedPullRequests: user.merged.totalCount,
    issues: user.issues.totalCount,
    lifetimeCommits: lifetime.commits,
    lifetimeReviews: lifetime.reviews,
    year: {
      commits: year.totalCommitContributions,
      pullRequests: year.totalPullRequestContributions,
      reviews: year.totalPullRequestReviewContributions,
      issues: year.totalIssueContributions,
      newRepos: year.totalRepositoryContributions,
      activeRepos: year.commitContributionsByRepository.length,
      calendar,
    },
    languages,
    quest,
    raids: [...raidMap.values()],
    commitHours,
    days: days?.length ? days : null,
    closes,
    fetchedAt: now.toISOString(),
  };
};
