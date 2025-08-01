/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1).
 * 2. You want to create a new middleware or type of procedure (see Part 3).
 *
 * TL;DR - This is where all the tRPC server stuff is created and plugged in. The pieces you will
 * need to use are documented accordingly near the end.
 */
import type { SignedInAuthObject } from '@clerk/backend/internal';
import { getAuth } from '@clerk/nextjs/server';
import { initTRPC, TRPCError } from '@trpc/server';
import type { NextRequest } from 'next/server';
import superjson from 'superjson';
import { type OpenApiMeta } from 'trpc-to-openapi';
import { ZodError } from 'zod';

import { createSourceService } from '~/aggregator/ckb/source-service';
import { createMarketService } from '~/aggregator/services/market-service';
import { airtable } from '~/clients';
import { env } from '~/env';
import { db } from '~/server/db';
import { nonNullable } from '~/utils/asserts';
import logger from '~/utils/logger';

import { ch } from '../ch';
import { clickhouse } from '../clickhouse';
import { createPaymentService } from './middlewares/payment';
import { tryCatchTRPC } from './utils';

const paymentService = createPaymentService({ logger: logger, paymentServiceUrl: env.PAYMENT_SERVICE_URL });

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the database, the session, etc.
 *
 * This helper generates the "internals" for a tRPC context. The API handler and RSC clients each
 * wrap this and provides the required context.
 *
 * @see https://trpc.io/docs/server/context
 */
export const createTRPCContext = async (opts: { req: NextRequest }) => {
  const dataSource = createSourceService({ rpcUrl: nonNullable(env.CKB_RPC_URL, 'env.CKB_RPC_URL') });
  const marketService = createMarketService();
  const auth = getAuth(opts.req);
  return {
    dataSource,
    marketService,
    db,
    airtable,
    auth,
    headers: opts.req.headers,
    clickhouse,
    ch,
    paymentService,
    ...opts,
  };
};

/**
 * 2. INITIALIZATION
 *
 * This is where the tRPC API is initialized, connecting the context and transformer. We also parse
 * ZodErrors so that you get typesafety on the frontend if your procedure fails due to validation
 * errors on the backend.
 */
const t = initTRPC
  .meta<OpenApiMeta>()
  .context<typeof createTRPCContext>()
  .create({
    transformer: superjson,
    errorFormatter({ shape, error }) {
      return {
        ...shape,
        data: {
          ...shape.data,
          zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
        },
      };
    },
  });

/**
 * Create a server-side caller.
 *
 * @see https://trpc.io/docs/server/server-side-calls
 */
export const createCallerFactory = t.createCallerFactory;

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import these a lot in the
 * "/src/server/api/routers" directory.
 */

/**
 * This is how you create new routers and sub-routers in your tRPC API.
 *
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router;

/**
 * Middleware for timing procedure execution and adding an artificial delay in development.
 *
 * You can remove this if you don't like it, but it can help catch unwanted waterfalls by simulating
 * network latency that would occur in production but not in local development.
 */
const timingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now();

  if (t._config.isDev) {
    // artificial delay in dev
    const waitMs = Math.floor(Math.random() * 400) + 100;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  const result = await next();

  const end = Date.now();
  console.log(`[TRPC] ${path} took ${end - start}ms to execute`);

  return result;
});

const paymentMiddleware = t.middleware(async ({ meta, ctx, next, getRawInput }) => {
  const openapiMeta = meta?.openapi;
  // Only for APIs with OpenAPI meta
  if (!openapiMeta) {
    return next();
  }

  const apiKey = ctx.req.headers.get('Authorization')?.split(' ')[1];
  const paymentService = ctx.paymentService;
  const inputData = await getRawInput();
  const route = openapiMeta.path;

  if (paymentService.isValidApiKeyFormat(apiKey)) {
    const reportApiCall = await tryCatchTRPC(() => paymentService.startReportApiCall({ apiKey, route, inputData }), {
      code: 'UNAUTHORIZED',
    });

    const result = await next();
    await reportApiCall();
    return result;
  }

  // TODO limit for free users
  return next();
});

/**
 * Public (unauthenticated) procedure
 *
 * This is the base piece you use to build new queries and mutations on your tRPC API. It does not
 * guarantee that a user querying is authorized, but you can still access user session data if they
 * are logged in.
 */
export const publicProcedure = t.procedure.use(timingMiddleware).use(paymentMiddleware);

export const protectProcedure = t.procedure
  .use(timingMiddleware)
  .use(paymentMiddleware)
  .use<{ auth: SignedInAuthObject }>(async ({ ctx, next }) => {
    if (!ctx.auth.userId) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to access this resource.',
      });
    }

    return next({ ctx });
  });
