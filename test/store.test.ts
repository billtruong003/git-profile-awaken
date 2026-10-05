import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../src/infrastructure/store.js';
import { rawProfile } from './fixture.js';

test('without Redis settings the store is per-instance memory', async () => {
  const store = createStore({});
  assert.equal(store.persistent, false);
  assert.equal(await store.get('Player-One'), null);
  await store.put('Player-One', rawProfile());
  assert.equal((await store.get('player-one'))?.login, 'player-one');
  await store.touch('Player-One');
  assert.deepEqual(await store.due(60_000), ['player-one']);
});

test('the Redis store speaks the Upstash REST protocol and orders players stalest first', async (t) => {
  const sent: unknown[][] = [];
  const data: Record<string, unknown> = {
    'ZRANGE awaken:players': ['alice', 'bob', 'carol'],
    'ZRANGE awaken:refreshed': ['bob', 'alice', 'dave'],
  };
  t.mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
    assert.equal(url, 'https://redis.example');
    assert.equal((init.headers as Record<string, string>).Authorization, 'Bearer secret');
    const command = JSON.parse(String(init.body)) as unknown[];
    sent.push(command);
    const result = data[`${command[0]} ${command[1]}`] ?? (command[0] === 'GET' ? JSON.stringify(rawProfile()) : 'OK');
    return new Response(JSON.stringify({ result }));
  });

  const store = createStore({ KV_REST_API_URL: 'https://redis.example', KV_REST_API_TOKEN: 'secret' });
  assert.equal(store.persistent, true);
  assert.equal((await store.get('Alice'))?.login, 'player-one');
  assert.deepEqual(sent.at(-1), ['GET', 'awaken:raw:alice']);

  await store.put('Alice', rawProfile());
  assert.equal(sent.at(-2)![0], 'SET');
  assert.deepEqual(sent.at(-2)!.slice(3), ['EX', 14 * 24 * 3600]);
  assert.equal(sent.at(-1)![0], 'ZADD');

  // carol was never refreshed, so she goes first; dave is no longer active.
  assert.deepEqual(await store.due(1000), ['carol', 'bob', 'alice']);
});
