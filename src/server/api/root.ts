import { createCallerFactory, createTRPCRouter } from '~/server/api/trpc';

import { accountRouter } from './routers/account';
import { addressRouter } from './routers/address';
import { assetRouter } from './routers/asset';
import { blockRouter } from './routers/block';
import { btcRouter } from './routers/external/btc';
import { explorerRouter } from './routers/external/explorer';
import { rgbppRouter } from './routers/external/rgbpp';
import { homeRouter } from './routers/home';
import { statisticsRouter } from './routers/statistics';
import { txRouter } from './routers/tx';
import { v0 } from './routers/v0';

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  home: homeRouter,
  account: accountRouter,
  block: blockRouter,
  tx: txRouter,
  address: addressRouter,
  asset: assetRouter,
  rgbpp: rgbppRouter,
  explorer: explorerRouter,
  temp: {
    btc: btcRouter,
  },
  statistics: statisticsRouter,
  v0: v0,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
