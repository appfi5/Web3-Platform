import { createEnv } from '@t3-oss/env-nextjs';
import { config } from 'dotenv';
import { z } from 'zod';

config();

/**
 *
 * @param {String} path
 * @returns
 */
const getFileContents = (path) => {
  // Only attempt to read files on the server
  if (typeof window === 'undefined' && typeof require === 'function' && path) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { readFileSync } = require('fs');
    return readFileSync(path).toString();
  }
  return undefined;
};

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    DATABASE_URL: z.string().url(),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    COINMARKET_API_PREFIX: z.string().url().optional(),
    COINMARKET_API_KEY: z.string().optional(),
    UTXO_SWAP_API_PREFIX: z.string().url().optional(),
    OMIGA_API_PREFIX: z.string().url().optional(),
    CKB_EXPLORER_API_PREFIX: z.string().url().optional(),
    TOKEN_SECRET_KEY: z.string().optional(),
    CKB_RPC_URL: z.string().url().optional(),
    PROB_NODE: z.string().url().optional().default('https://api-nodes.magickbase.com'),
    AGGREGATOR_LOG_LEVEL: z.string().default('info'),
    AGGREGATOR_PREPARATION_TIMEOUT: z.number().default(60000),
    AGGREGATOR_PREPARATION_CONCURRENCY: z.number().optional(),
    AGGREGATOR_PREPARATION_BUFFER_SIZE: z.number().optional(),
    API_BUILD: z.boolean().default(false),
    OKX_URL: z.string().url().default('https://www.okx.com'),
    OKX_API_KEY: z.string().optional(),
    OKX_SECRET_KEY: z.string().optional(),
    OKX_PASSPHRASE: z.string().optional(),
    HIRO_API: z.string().url().default('https://api.hiro.so'),

    // export the external API only
    EXPORT_EXTERNAL_API_ONLY: z.boolean().default(false),

    REDIS_URL: z.string().url().optional(),
    CLICKHOUSE_URL: z.string().url().optional(),
    DATABASE_CA_FILE: z.string().optional(),

    BTC_RPC_URL: z.string().url(),
    BTC_RPC_USERNAME: z.string().optional(),
    BTC_RPC_PASSWORD: z.string().optional(),

    PAYMENT_SERVICE_URL: z.string().url().optional(),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    NEXT_PUBLIC_IS_MAINNET: z.boolean().default(false),
    NEXT_PUBLIC_TRPC_API: z.string().url().optional(),
    NEXT_PUBLIC_NEWS_CONFIG: z.string().optional(),
    NEXT_PUBLIC_PROB_NODE: z.string().optional().default('https://api-nodes.magickbase.com'),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    COINMARKET_API_PREFIX: process.env.COINMARKET_API_PREFIX,
    COINMARKET_API_KEY: process.env.COINMARKET_API_KEY,
    UTXO_SWAP_API_PREFIX: process.env.UTXO_SWAP_API_PREFIX,
    OMIGA_API_PREFIX: process.env.OMIGA_API_PREFIX,
    NEXT_PUBLIC_IS_MAINNET: process.env.NEXT_PUBLIC_IS_MAINNET === 'true',
    NEXT_PUBLIC_NEWS_CONFIG: process.env.NEXT_PUBLIC_NEWS_CONFIG,
    NEXT_PUBLIC_PROB_NODE: process.env.NEXT_PUBLIC_PROB_NODE,
    CKB_EXPLORER_API_PREFIX: process.env.CKB_EXPLORER_API_PREFIX,
    CKB_RPC_URL: process.env.CKB_RPC_URL,
    PROB_NODE: process.env.PROB_NODE,
    NEXT_PUBLIC_TRPC_API: process.env.NEXT_PUBLIC_TRPC_API,
    AGGREGATOR_LOG_LEVEL: process.env.AGGREGATOR_LOG_LEVEL,
    AGGREGATOR_PREPARATION_TIMEOUT: process.env.AGGREGATOR_PREPARATION_TIMEOUT
      ? +process.env.AGGREGATOR_PREPARATION_TIMEOUT
      : undefined,
    AGGREGATOR_PREPARATION_CONCURRENCY:
      process.env.AGGREGATOR_PREPARATION_CONCURRENCY && Number(process.env.AGGREGATOR_PREPARATION_CONCURRENCY),
    AGGREGATOR_PREPARATION_BUFFER_SIZE:
      process.env.AGGREGATOR_PREPARATION_BUFFER_SIZE && Number(process.env.AGGREGATOR_PREPARATION_BUFFER_SIZE),
    // NEXT_PUBLIC_CLIENTVAR: process.env.NEXT_PUBLIC_CLIENTVAR,
    TOKEN_SECRET_KEY: process.env.TOKEN_SECRET_KEY,
    EXPORT_EXTERNAL_API_ONLY: process.env.EXPORT_EXTERNAL_API_ONLY === 'true',
    API_BUILD: process.env.API_BUILD === 'true',
    OKX_URL: process.env.OKX_URL,
    OKX_API_KEY: process.env.OKX_API_KEY,
    OKX_SECRET_KEY: process.env.OKX_SECRET_KEY,
    OKX_PASSPHRASE: process.env.OKX_PASSPHRASE,
    HIRO_API: process.env.HIRO_API,

    REDIS_URL: process.env.REDIS_URL,
    CLICKHOUSE_URL: process.env.CLICKHOUSE_URL,
    DATABASE_CA_FILE: process.env.DATABASE_CA_FILE ? getFileContents(process.env.DATABASE_CA_FILE) : undefined,
    BTC_RPC_URL: process.env.BTC_RPC_URL,
    BTC_RPC_USERNAME: process.env.BTC_RPC_USERNAME,
    BTC_RPC_PASSWORD: process.env.BTC_RPC_PASSWORD,
    PAYMENT_SERVICE_URL: process.env.PAYMENT_SERVICE_URL,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
