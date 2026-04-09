import type { RawGithubData, CombinedGithubData } from '../domain/types.js';

const FETCH_TIMEOUT_MS = 8_000;
const CACHE_LIFETIME_MS = 5 * 60 * 1_000;
const REFRESH_THROTTLE_MS = 5_000;
const RETRY_STATUS_CODES = new Set([502, 503, 504]);
const RETRY_DELAY_MS = 800;

const buildUserProfileQuery = (username: string) => ({
  query: `
    query userInfo($login: String!) {
      user(login: $login) {
        login
        followers { totalCount }
        pullRequests(first: 1) { totalCount }
        issues(first: 1) { totalCount }
        repositories(first: 100, ownerAffiliations: OWNER, isFork: false, orderBy: {field: PUSHED_AT, direction: DESC}) {
          totalCount
          nodes {
            name
            stargazerCount
            pushedAt
            diskUsage
            defaultBranchRef { target { ... on Commit { message } } }
            languages(first: 10, orderBy: {field: SIZE, direction: DESC}) { edges { size node { name color } } }
          }
        }
        repositoriesContributedTo(contributionTypes: [COMMIT, ISSUE, PULL_REQUEST, REPOSITORY]) { totalCount }
        contributionsCollection { contributionCalendar { totalContributions weeks { contributionDays { contributionCount date } } } }
      }
    }
  `,
  variables: { login: username },
});

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const parseGithubError = (status: number, fallback: string): string => {
  if (status === 401) return 'Invalid GitHub token. Check your GITHUB_TOKEN.';
  if (status === 403) return 'GitHub API rate limit exceeded. Retry in a few minutes.';
  if (status >= 500) return `GitHub server error (${status}). Retry shortly.`;
  return `GitHub API responded with ${status}: ${fallback}`;
};

const fetchGraphqlProfile = async (username: string, token: string, attempt = 0): Promise<RawGithubData> => {
  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(buildUserProfileQuery(username)),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    if (attempt === 0 && RETRY_STATUS_CODES.has(response.status)) {
      await delay(RETRY_DELAY_MS);
      return fetchGraphqlProfile(username, token, 1);
    }
    throw new Error(parseGithubError(response.status, response.statusText));
  }

  const payload = await response.json();

  if (payload.errors) {
    throw new Error(payload.errors[0]?.message ?? 'Unknown GraphQL error');
  }

  return payload.data;
};

const fetchLifetimeCommitCount = async (username: string, token: string): Promise<number> => {
  try {
    const response = await fetch(
      `https://api.github.com/search/commits?q=author:${encodeURIComponent(username)}`,
      {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.cloak-preview+json' },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      },
    );
    if (!response.ok) return 0;
    const data = await response.json();
    return data.total_count || 0;
  } catch {
    return 0;
  }
};

interface CacheEntry {
  data: CombinedGithubData;
  createdAt: number;
}

const dataCache = new Map<string, CacheEntry>();
const pendingFetches = new Map<string, Promise<CombinedGithubData>>();

const executeFetch = async (username: string, token: string): Promise<CombinedGithubData> => {
  const [graphql, restCommitCount] = await Promise.all([
    fetchGraphqlProfile(username, token),
    fetchLifetimeCommitCount(username, token),
  ]);

  const graphqlFallbackCommits = graphql.user.contributionsCollection.contributionCalendar.totalContributions;
  const allTimeCommits = restCommitCount > 0 ? restCommitCount : graphqlFallbackCommits;

  return { graphql, allTimeCommits };
};

export const fetchGithubData = (
  username: string,
  token: string,
  forceRefresh: boolean = false,
): Promise<CombinedGithubData> => {
  const now = Date.now();
  const cached = dataCache.get(username);

  if (cached) {
    const age = now - cached.createdAt;
    if (!forceRefresh && age < CACHE_LIFETIME_MS) return Promise.resolve(cached.data);
    if (forceRefresh && age < REFRESH_THROTTLE_MS) return Promise.resolve(cached.data);
  }

  const pending = pendingFetches.get(username);
  if (pending) return pending;

  const promise = executeFetch(username, token)
    .then((result) => {
      dataCache.set(username, { data: result, createdAt: Date.now() });
      pendingFetches.delete(username);
      return result;
    })
    .catch((err) => {
      pendingFetches.delete(username);
      throw err;
    });

  pendingFetches.set(username, promise);
  return promise;
};