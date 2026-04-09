import type { RawGithubData, CombinedGithubData } from '../domain/types.js';

const API_TIMEOUT_MS = 6_000;
const PROFILE_CACHE_TTL_MS = 5 * 60 * 1_000;
const COMMIT_COUNT_CACHE_TTL_MS = 60 * 60 * 1_000;
const REFRESH_THROTTLE_MS = 5_000;
const MAX_CACHE_ENTRIES = 500;
const RETRY_DELAY_MS = 600;
const RETRY_STATUS_CODES = new Set([502, 503, 504]);

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

const parseApiError = (status: number): string => {
  if (status === 401) return 'Invalid GitHub token. Check GITHUB_TOKEN configuration.';
  if (status === 403) return 'GitHub API rate limit exceeded. Retry in a few minutes.';
  if (status >= 500) return `GitHub server error (${status}). Retry shortly.`;
  return `GitHub API responded with status ${status}.`;
};

const fetchGraphqlProfile = async (username: string, token: string, attempt = 0): Promise<RawGithubData> => {
  let response: Response;

  try {
    response = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(buildUserProfileQuery(username)),
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'TimeoutError') {
      throw new Error('GitHub API is responding slowly. Please retry in a moment.');
    }
    throw err;
  }

  if (!response.ok) {
    if (attempt === 0 && RETRY_STATUS_CODES.has(response.status)) {
      await delay(RETRY_DELAY_MS);
      return fetchGraphqlProfile(username, token, 1);
    }
    throw new Error(parseApiError(response.status));
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
        signal: AbortSignal.timeout(API_TIMEOUT_MS),
      },
    );
    if (!response.ok) return 0;
    const data = await response.json();
    return data.total_count || 0;
  } catch {
    return 0;
  }
};

interface TimedEntry<T> {
  data: T;
  createdAt: number;
}

const profileCache = new Map<string, TimedEntry<CombinedGithubData>>();
const commitCountCache = new Map<string, TimedEntry<number>>();
const pendingFetches = new Map<string, Promise<CombinedGithubData>>();

const evictMap = <T>(map: Map<string, TimedEntry<T>>, ttl: number): void => {
  if (map.size <= MAX_CACHE_ENTRIES) return;

  const now = Date.now();
  const staleKeys: string[] = [];

  for (const [key, entry] of map) {
    if (now - entry.createdAt > ttl) {
      staleKeys.push(key);
    }
  }

  for (const key of staleKeys) {
    map.delete(key);
  }

  if (map.size > MAX_CACHE_ENTRIES) {
    const sortedEntries = Array.from(map.entries()).sort((a, b) => a[1].createdAt - b[1].createdAt);
    const removeCount = map.size - MAX_CACHE_ENTRIES;
    for (let i = 0; i < removeCount; i++) {
      map.delete(sortedEntries[i]![0]);
    }
  }
};

const getCachedCommitCount = (username: string): number | null => {
  const cached = commitCountCache.get(username);
  if (!cached) return null;
  if (Date.now() - cached.createdAt > COMMIT_COUNT_CACHE_TTL_MS) return null;
  return cached.data;
};

const executeFetch = async (username: string, token: string): Promise<CombinedGithubData> => {
  const cachedCommits = getCachedCommitCount(username);

  if (cachedCommits !== null) {
    const graphql = await fetchGraphqlProfile(username, token);
    const graphqlTotal = graphql.user.contributionsCollection.contributionCalendar.totalContributions;
    return { graphql, allTimeCommits: Math.max(cachedCommits, graphqlTotal) };
  }

  const [graphqlResult, restResult] = await Promise.allSettled([
    fetchGraphqlProfile(username, token),
    fetchLifetimeCommitCount(username, token),
  ]);

  if (graphqlResult.status === 'rejected') {
    throw graphqlResult.reason instanceof Error
      ? graphqlResult.reason
      : new Error(String(graphqlResult.reason));
  }

  const graphql = graphqlResult.value;
  const restCount = restResult.status === 'fulfilled' ? restResult.value : 0;
  const graphqlTotal = graphql.user.contributionsCollection.contributionCalendar.totalContributions;

  if (restCount > 0) {
    evictMap(commitCountCache, COMMIT_COUNT_CACHE_TTL_MS);
    commitCountCache.set(username, { data: restCount, createdAt: Date.now() });
  }

  const allTimeCommits = restCount > 0 ? restCount : graphqlTotal;

  return { graphql, allTimeCommits };
};

export const fetchGithubData = (
  username: string,
  token: string,
  forceRefresh: boolean = false,
): Promise<CombinedGithubData> => {
  const now = Date.now();
  const cached = profileCache.get(username);

  if (cached) {
    const age = now - cached.createdAt;
    if (!forceRefresh && age < PROFILE_CACHE_TTL_MS) return Promise.resolve(cached.data);
    if (forceRefresh && age < REFRESH_THROTTLE_MS) return Promise.resolve(cached.data);
  }

  const pending = pendingFetches.get(username);
  if (pending) return pending;

  const promise = executeFetch(username, token)
    .then((result) => {
      evictMap(profileCache, PROFILE_CACHE_TTL_MS);
      profileCache.set(username, { data: result, createdAt: Date.now() });
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