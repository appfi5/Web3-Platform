import { and, eq, sql } from 'drizzle-orm';
import { createClient, type RedisClientType } from 'redis';
import SuperJSON from 'superjson';

import { db } from '~/server/db';
import { kv } from '~/server/db/schema';

import { type KVStorage } from '../core';
import { type Logger } from '../types';

/**
 * decorate the db as a scoped KV storage
 * @param param0
 * @returns
 */
function createPostgreKVStorage<T>({ scope }: { scope: string }): KVStorage<T> {
  return {
    keys: <K>() =>
      db.query.kv
        .findMany({ columns: { key: true }, where: eq(kv.scope, scope) })
        .then((res) => res.map((item) => item.key)) as Promise<K[]>,

    getItem: (key) =>
      db.query.kv
        .findFirst({ where: and(eq(kv.scope, scope), eq(kv.key, key)) })
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        .then((row) => (row?.value != null ? SuperJSON.parse(row.value) : null)),

    setItem: (key, val) =>
      db
        .insert(kv)
        .values({ key, scope, value: SuperJSON.stringify(val) })
        .onConflictDoUpdate({
          target: [kv.scope, kv.key],
          set: { value: sql.raw(`excluded.${kv.value.name}`) },
        })
        .then(() => void 0),

    removeItem: (key) =>
      db
        .delete(kv)
        .where(and(eq(kv.scope, scope), eq(kv.key, key)))
        .then(() => void 0),

    clear: () =>
      db
        .delete(kv)
        .where(eq(kv.scope, scope))
        .then(() => void 0),
  };
}

let innerRedisClient: RedisClientType | null = null;

/**
 * Initialize Redis client. If the option `migrateFromPostgreStorageScope` is provided,
 * it will migrate the data from the Postgre storage to Redis storage
 * @param param0
 */
export async function initializeRedisClient({
  url,
  logger,
  migrateFromPostgreStorageScope,
}: {
  url: string;
  logger: Logger;
  migrateFromPostgreStorageScope?: string;
}) {
  innerRedisClient = createClient({ url });
  await innerRedisClient.on('error', (error) => logger.error(error)).connect();

  if (migrateFromPostgreStorageScope) {
    const oldStorage = createPostgreKVStorage({ scope: migrateFromPostgreStorageScope });
    const newStorage = createRedisKVStorage({ scope: migrateFromPostgreStorageScope });

    await oldStorage.keys().then((keys) =>
      Promise.all(
        keys.map((key) =>
          oldStorage
            .getItem(key)
            .then((value) => newStorage.setItem(key, value))
            .then(() => oldStorage.removeItem(key)),
        ),
      ),
    );
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createRedisKVStorage<T extends Record<string, any>>({ scope }: { scope: string }): KVStorage<T> {
  if (!innerRedisClient) {
    throw new Error('Redis client not initialized');
  }

  const redis = innerRedisClient;

  const keys = () =>
    redis.keys(`${scope}:*`).then((res) => res.map((key) => key.substring(scope.length + 1))) as Promise<(keyof T)[]>;

  return {
    keys,
    getItem: (key) => redis.get(`${scope}:${key}`).then((value) => (value ? SuperJSON.parse(value) : null)),
    setItem: (key, val) => redis.set(`${scope}:${key}`, SuperJSON.stringify(val)).then(() => void 0),
    removeItem: (key) => redis.del(`${scope}:${key}`).then(() => void 0),

    clear: () =>
      redis
        .keys(`${scope}:*`)
        .then(async (keys) => {
          if (keys.length > 0) {
            await redis.del(keys);
          }
        })
        .then(() => void 0),
  };
}

/**
 * Check if the redis has been initialized, if so, use Redis as the KV storage, otherwise use PG as the KV storage
 * @param param0
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createKVStorage<T extends Record<string, any>>({ scope }: { scope: string }): KVStorage<T> {
  if (innerRedisClient) {
    return createRedisKVStorage<T>({ scope });
  }

  return createPostgreKVStorage<T>({ scope });
}
