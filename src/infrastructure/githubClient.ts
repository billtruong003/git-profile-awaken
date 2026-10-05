import type { CalendarDay, LanguageShare, QuestInfo, Raid, RawProfile } from '../domain/types.js';

const ENDPOINT = 'https://api.github.com/graphql';
const TIMEOUT_MS = 15_000;
const MAX_REPO_PAGES = 10;
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
  if (error) {
    throw new GithubError(error.message, error.type === 'NOT_FOUND' ? 'not_found' : 'upstream');
  }
  return payload.data as T;
};

interface RepoNode {
  name: string;
  stargazerCount: number;
  pushedAt: string;
  createdAt: string;
  primaryLanguage: { name: string; color: string | null } | null;
  languages: { edges: { size: number; node: { name: string; color: string | null } }[] };
  defaultBranchRef: { target: { message?: string } } | null;
}

interface ProfileData {
  user: {
    id: string;
    login: string;
    name: string | null;
    createdAt: string;
    followers: { totalCount: number };
    organizations: { totalCount: number };
    pullRequests: { totalCount: number };
    merged: { totalCount: number };
    issues: { totalCount: number };
    repositories: { totalCount: number; pageInfo: { hasNextPage: boolean; endCursor: string | null }; nodes: RepoNode[] };
  } | null;
}

const PROFILE_QUERY = `
query($login: String!, $after: String) {
  user(login: $login) {
    id login name createdAt
    followers { totalCount }
    organizations { totalCount }
    pullRequests { totalCount }
    merged: pullRequests(states: MERGED) { totalCount }
    issues { totalCount }
    repositories(first: 100, after: $after, ownerAffiliations: OWNER, isFork: false, orderBy: { field: PUSHED_AT, direction: DESC }) {
      totalCount
      pageInfo { hasNextPage endCursor }
      nodes {
        name stargazerCount pushedAt createdAt
        primaryLanguage { name color }
        languages(first: 10, orderBy: { field: SIZE, direction: DESC }) { edges { size node { name color } } }
        defaultBranchRef { target { ... on Commit { message } } }
      }
    }
  }
}`;

interface YearTotals {
  totalCommitContributions: number;
  totalPullRequestReviewContributions: number;
}

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
  };
}

const LAST_YEAR_QUERY = `
query($login: String!) {
  user(login: $login) {
    contributionsCollection {
      totalCommitContributions totalPullRequestContributions totalPullRequestReviewContributions
      totalIssueContributions totalRepositoryContributions
      commitContributionsByRepository(maxRepositories: 100) { repository { name owner { login } } contributions { totalCount } }
      contributionCalendar { weeks { contributionDays { contributionCount date weekday } } }
    }
    raids: pullRequests(first: 100, states: MERGED, orderBy: { field: CREATED_AT, direction: DESC }) {
      nodes { repository { nameWithOwner stargazerCount owner { login } } }
    }
  }
}`;

const fetchRepos = async (login: string, token: string) => {
  let after: string | null = null;
  let first: NonNullable<ProfileData['user']> | null = null;
  const repos: RepoNode[] = [];
  for (let page = 0; page < MAX_REPO_PAGES; page++) {
    const data: ProfileData = await graphql<ProfileData>(token, PROFILE_QUERY, { login, after });
    if (!data.user) throw new GithubError(`No GitHub user named "${login}".`, 'not_found');
    first ??= data.user;
    repos.push(...data.user.repositories.nodes);
    if (!data.user.repositories.pageInfo.hasNextPage) break;
    after = data.user.repositories.pageInfo.endCursor;
  }
  return { user: first!, repos };
};

/** Every year since the account was created, one alias per year (a contributions window may not exceed a year). */
const fetchLifetime = async (login: string, token: string, createdAt: string, now: Date) => {
  const firstYear = new Date(createdAt).getUTCFullYear();
  const aliases: string[] = [];
  for (let year = firstYear; year <= now.getUTCFullYear(); year++) {
    const to = year === now.getUTCFullYear() ? now.toISOString() : `${year}-12-31T23:59:59Z`;
    aliases.push(`y${year}: contributionsCollection(from: "${year}-01-01T00:00:00Z", to: "${to}") { totalCommitContributions totalPullRequestReviewContributions }`);
  }
  const data = await graphql<{ user: Record<string, YearTotals> }>(token, `query($login: String!) { user(login: $login) { ${aliases.join('\n')} } }`, { login });
  const years = Object.values(data.user);
  return {
    commits: years.reduce((sum, y) => sum + y.totalCommitContributions, 0),
    reviews: years.reduce((sum, y) => sum + y.totalPullRequestReviewContributions, 0),
  };
};

const hourIn = (iso: string, timeZone: string): number =>
  Number(new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', hourCycle: 'h23' }).format(new Date(iso)));

/** Authored times of the player's commits in their busiest repositories over the last year. */
const fetchCommitHours = async (token: string, userId: string, repos: { owner: string; name: string }[], since: string, timeZone: string) => {
  const hours = Array<number>(24).fill(0);
  for (let i = 0; i < repos.length; i += HOUR_BATCH) {
    const batch = repos.slice(i, i + HOUR_BATCH);
    const body = batch
      .map((r, j) => `r${j}: repository(owner: ${JSON.stringify(r.owner)}, name: ${JSON.stringify(r.name)}) { defaultBranchRef { target { ... on Commit { history(first: 100, since: "${since}", author: { id: "${userId}" }) { nodes { authoredDate } } } } } }`)
      .join('\n');
    const data = await graphql<Record<string, { defaultBranchRef: { target: { history?: { nodes: { authoredDate: string }[] } } } | null } | null>>(token, `{ ${body} }`);
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
const fetchQuest = async (token: string, login: string, repo: RepoNode | undefined): Promise<QuestInfo | null> => {
  if (!repo) return null;
  const data = await graphql<{ repository: { defaultBranchRef: { target: { history?: { totalCount: number } } } | null } | null }>(
    token,
    `query($owner: String!, $name: String!, $since: GitTimestamp!) { repository(owner: $owner, name: $name) { defaultBranchRef { target { ... on Commit { history(since: $since) { totalCount } } } } } }`,
    { owner: login, name: repo.name, since: repo.createdAt },
  );
  return {
    repo: repo.name,
    language: repo.primaryLanguage ? { name: repo.primaryLanguage.name, color: repo.primaryLanguage.color ?? '#888888' } : null,
    createdAt: repo.createdAt,
    pushedAt: repo.pushedAt,
    lastMessage: repo.defaultBranchRef?.target.message?.split('\n')[0] ?? '',
    commits: data.repository?.defaultBranchRef?.target.history?.totalCount ?? 0,
  };
};

const languageShares = (repos: RepoNode[]): LanguageShare[] => {
  const totals = new Map<string, { size: number; color: string }>();
  let all = 0;
  for (const repo of repos) {
    for (const edge of repo.languages.edges) {
      const entry = totals.get(edge.node.name) ?? { size: 0, color: edge.node.color ?? '#888888' };
      entry.size += edge.size;
      totals.set(edge.node.name, entry);
      all += edge.size;
    }
  }
  return [...totals.entries()]
    .map(([name, { size, color }]) => ({ name, color, percent: all ? Math.round((size / all) * 1000) / 10 : 0 }))
    .sort((a, b) => b.percent - a.percent)
    .slice(0, 10);
};

export interface FetchOptions {
  timeZone: string;
  commitHours: boolean;
  now?: Date;
}

export const fetchRawProfile = async (login: string, token: string, options: FetchOptions): Promise<RawProfile> => {
  const now = options.now ?? new Date();
  const { user, repos } = await fetchRepos(login, token);
  const [lifetime, lastYear] = await Promise.all([
    fetchLifetime(user.login, token, user.createdAt, now),
    graphql<LastYear>(token, LAST_YEAR_QUERY, { login: user.login }),
  ]);
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

  const oneYearAgo = new Date(now.getTime() - 365 * 864e5).toISOString();
  const busiest = [...year.commitContributionsByRepository]
    .sort((a, b) => b.contributions.totalCount - a.contributions.totalCount)
    .slice(0, HOUR_REPOS)
    .map((r) => ({ owner: r.repository.owner.login, name: r.repository.name }));

  const [quest, commitHours] = await Promise.all([
    fetchQuest(token, user.login, repos[0]),
    options.commitHours ? fetchCommitHours(token, user.id, busiest, oneYearAgo, options.timeZone) : Promise.resolve(null),
  ]);

  return {
    login: user.login,
    name: user.name,
    createdAt: user.createdAt,
    followers: user.followers.totalCount,
    organizations: user.organizations.totalCount,
    ownedRepos: user.repositories.totalCount,
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
    languages: languageShares(repos),
    quest,
    raids: [...raidMap.values()],
    commitHours,
    fetchedAt: now.toISOString(),
  };
};
