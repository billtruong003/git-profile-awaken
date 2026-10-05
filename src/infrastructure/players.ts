import type { RawProfile } from '../domain/types.js';
import { fetchRawProfile } from './githubClient.js';
import type { ProfileStore } from './store.js';

const MEMORY_MS = 10 * 60 * 1000;
/** A stored profile older than this is fetched again on request instead of waiting for the night. */
const STALE_MS = 3 * 24 * 3600 * 1000;
/** The nightly job refreshes anyone fetched more than this long ago. */
const REFRESH_AFTER_MS = 20 * 3600 * 1000;
const ACTIVE_MS = 30 * 24 * 3600 * 1000;

const memory = new Map<string, { at: number; raw: Promise<RawProfile> }>();

const fetchAndStore = async (login: string, token: string, store: ProfileStore): Promise<RawProfile> => {
  const raw = await fetchRawProfile(login, token, { timeZone: 'UTC', commitHours: false });
  await store.put(login, raw).catch((err) => console.error('store.put failed', err));
  return raw;
};

/**
 * Memory, then the shared store, then GitHub. A stored copy is served as is for up to three days because
 * the nightly refresh normally replaces it long before then; only a cold miss pays for a live fetch.
 */
export const rawProfileFor = (login: string, token: string, store: ProfileStore): Promise<RawProfile> => {
  const id = login.toLowerCase();
  const hit = memory.get(id);
  if (hit && Date.now() - hit.at < MEMORY_MS) return hit.raw;

  const raw = (async () => {
    store.touch(id).catch(() => undefined);
    const stored = await store.get(id).catch(() => null);
    if (stored && Date.now() - Date.parse(stored.fetchedAt) < STALE_MS) return stored;
    try {
      return await fetchAndStore(login, token, store);
    } catch (err) {
      if (stored) return stored;
      throw err;
    }
  })();
  raw.catch(() => memory.delete(id));
  if (memory.size >= 500) memory.delete(memory.keys().next().value!);
  memory.set(id, { at: Date.now(), raw });
  return raw;
};

export interface RefreshReport {
  refreshed: string[];
  failed: { login: string; error: string }[];
  remaining: number;
}

/** Refreshes active players, stalest first, until the time budget runs out. Run nightly. */
export const refreshDuePlayers = async (token: string, store: ProfileStore, budgetMs: number, concurrency = 3): Promise<RefreshReport> => {
  const deadline = Date.now() + budgetMs;
  const due: string[] = [];
  for (const login of await store.due(ACTIVE_MS)) {
    const stored = await store.get(login).catch(() => null);
    if (!stored || Date.now() - Date.parse(stored.fetchedAt) > REFRESH_AFTER_MS) due.push(login);
  }

  const report: RefreshReport = { refreshed: [], failed: [], remaining: 0 };
  let next = 0;
  const worker = async () => {
    // Each refresh takes a few seconds; stop starting new ones when one more might not finish in time.
    while (next < due.length && Date.now() < deadline - 10_000) {
      const login = due[next++]!;
      try {
        const raw = await fetchAndStore(login, token, store);
        memory.set(login, { at: Date.now(), raw: Promise.resolve(raw) });
        report.refreshed.push(login);
      } catch (err) {
        report.failed.push({ login, error: (err as Error).message });
      }
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));
  report.remaining = due.length - next;
  return report;
};
