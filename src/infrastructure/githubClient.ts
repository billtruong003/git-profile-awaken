import type { RawGithubData, CombinedGithubData } from '../domain/types.js';

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
        repositoriesContributedTo(contributionTypes:[COMMIT, ISSUE, PULL_REQUEST, REPOSITORY]) { totalCount }
        contributionsCollection { contributionCalendar { totalContributions weeks { contributionDays { contributionCount date } } } }
      }
    }
  `,
  variables: { login: username },
});

const fetchGraphqlProfile = async (username: string, token: string): Promise<RawGithubData> => {
  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(buildUserProfileQuery(username)),
  });
  const payload = await response.json();
  if (payload.errors) throw new Error(payload.errors[0].message);
  return payload.data;
};

const REST_TIMEOUT_MS = 3_000;

const fetchLifetimeCommitCount = async (username: string, token: string): Promise<number> => {
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), REST_TIMEOUT_MS);
  try {
    const response = await fetch(`https://api.github.com/search/commits?q=author:${username}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.cloak-preview+json' },
      signal: abortController.signal,
    });
    clearTimeout(timeoutId);
    if (!response.ok) return 0;
    const data = await response.json();
    return data.total_count || 0;
  } catch {
    clearTimeout(timeoutId);
    return 0;
  }
};

interface CacheEntry {
  promise: Promise<CombinedGithubData>;
  createdAt: number;
}

const dataCache = new Map<string, CacheEntry>();
const CACHE_LIFETIME_MS = 5 * 60 * 1000;
const REFRESH_THROTTLE_MS = 5_000;

export const fetchGithubData = (
  username: string,
  token: string,
  forceRefresh: boolean = false,
): Promise<CombinedGithubData> => {
  const now = Date.now();
  const cached = dataCache.get(username);

  if (cached) {
    const cacheAge = now - cached.createdAt;
    if (!forceRefresh && cacheAge < CACHE_LIFETIME_MS) return cached.promise;
    if (forceRefresh && cacheAge < REFRESH_THROTTLE_MS) return cached.promise;
  }

  const fetchPromise = (async () => {
    const [graphql, restCommitCount] = await Promise.all([
      fetchGraphqlProfile(username, token),
      fetchLifetimeCommitCount(username, token),
    ]);
    const graphqlFallbackCommits = graphql.user.contributionsCollection.contributionCalendar.totalContributions;
    const allTimeCommits = restCommitCount > 0 ? restCommitCount : graphqlFallbackCommits;
    return { graphql, allTimeCommits };
  })().catch((err) => {
    dataCache.delete(username);
    throw err;
  });

  dataCache.set(username, { promise: fetchPromise, createdAt: now });
  return fetchPromise;
};