import type { RawProfile } from '../domain/types.js';

/**
 * Where fetched profiles live between requests. With Upstash Redis configured (Vercel's Redis integration
 * sets KV_REST_API_URL and KV_REST_API_TOKEN) every serverless instance shares one copy and the nightly
 * refresh can find every player; without it each instance keeps its own short-lived memory cache.
 */
export interface ProfileStore {
  readonly persistent: boolean;
  get(login: string): Promise<RawProfile | null>;
  put(login: string, raw: RawProfile): Promise<void>;
  /** Records that someone asked for this player, so the nightly refresh keeps them warm. */
  touch(login: string): Promise<void>;
  /** Players asked for within `activeMs`, least recently refreshed first. */
  due(activeMs: number): Promise<string[]>;
}

const PROFILE_TTL_S = 14 * 24 * 3600;
const PLAYERS = 'awaken:players';
const REFRESHED = 'awaken:refreshed';
const key = (login: string) => `awaken:raw:${login.toLowerCase()}`;

const redisStore = (url: string, token: string): ProfileStore => {
  const call = async <T>(...command: (string | number)[]): Promise<T> => {
    const response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(command),
      signal: AbortSignal.timeout(3000),
    });
    const payload = (await response.json()) as { result?: T; error?: string };
    if (payload.error) throw new Error(`Redis: ${payload.error}`);
    return payload.result as T;
  };
  return {
    persistent: true,
    async get(login) {
      const value = await call<string | null>('GET', key(login));
      return value ? (JSON.parse(value) as RawProfile) : null;
    },
    async put(login, raw) {
      await call('SET', key(login), JSON.stringify(raw), 'EX', PROFILE_TTL_S);
      await call('ZADD', REFRESHED, Date.parse(raw.fetchedAt), login.toLowerCase());
    },
    async touch(login) {
      await call('ZADD', PLAYERS, Date.now(), login.toLowerCase());
    },
    async due(activeMs) {
      const cutoff = Date.now() - activeMs;
      await call('ZREMRANGEBYSCORE', PLAYERS, '-inf', cutoff);
      const active = new Set(await call<string[]>('ZRANGE', PLAYERS, 0, -1));
      const byAge = await call<string[]>('ZRANGE', REFRESHED, 0, -1);
      const known = byAge.filter((login) => active.has(login));
      const never = [...active].filter((login) => !byAge.includes(login));
      return [...never, ...known];
    },
  };
};

const memoryStore = (): ProfileStore => {
  const profiles = new Map<string, RawProfile>();
  const players = new Map<string, number>();
  return {
    persistent: false,
    async get(login) {
      return profiles.get(login.toLowerCase()) ?? null;
    },
    async put(login, raw) {
      if (profiles.size >= 500) profiles.delete(profiles.keys().next().value!);
      profiles.set(login.toLowerCase(), raw);
    },
    async touch(login) {
      players.set(login.toLowerCase(), Date.now());
    },
    async due(activeMs) {
      const cutoff = Date.now() - activeMs;
      return [...players.entries()].filter(([, at]) => at >= cutoff).map(([login]) => login);
    },
  };
};

export const createStore = (env: NodeJS.ProcessEnv = process.env): ProfileStore => {
  const url = env.KV_REST_API_URL ?? env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN ?? env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? redisStore(url, token) : memoryStore();
};
