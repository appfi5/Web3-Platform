import BigNumber from 'bignumber.js';
import { gte, sql } from 'drizzle-orm';
import { type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { z, type ZodLiteral } from 'zod';

import { NATIVE_ASSETS } from '~/constants';
import { createTRPCRouter, publicProcedure } from '~/server/api/trpc';
import type * as schema from '~/server/db/schema';
import { assetIdToDriver, historyPrice, lastestMarket, tx } from '~/server/db/schema';
import { CoinMarketAssetId, type CoinMarketAssetType, MarketSource } from '~/utils/const';
import { latestQuotes } from '~/utils/third-api/coinmarket';
import { getDobSellOrders, getNftList, xudtTokenList } from '~/utils/third-api/omiga';
import { sequencerPools } from '~/utils/third-api/uxto-swap';

import { getHistoryPrice } from '../comm';

const highestPrices: Record<string, number> = {
  [NATIVE_ASSETS.BTC]: 73750.07,
  [NATIVE_ASSETS.CKB]: 0.04412,
};

const insertMarket = async (market: typeof lastestMarket.$inferInsert, db: PostgresJsDatabase<typeof schema>) => {
  // TODO: use the market that volumn is bigger when source is omiga or uxtoswap
  return db
    .insert(lastestMarket)
    .values(market)
    .onConflictDoUpdate({
      target: [lastestMarket.assetId],
      set: {
        price: market.price,
        highestPrice: sql`(select GREATEST(${market.highestPrice},${lastestMarket.highestPrice}) from ${lastestMarket} where ${lastestMarket.assetId}=${assetIdToDriver(market.assetId)})`,
        totalSupply: market.totalSupply,
        maxSupply: market.maxSupply,
        percentChange24h: market.percentChange24h,
        marketCap: market.marketCap,
        volume24h: market.volume24h,
        txs24h: market.txs24h,
        dataSource: market.dataSource,
      },
    });
};

const insertPrice = (price: typeof historyPrice.$inferInsert, db: PostgresJsDatabase<typeof schema>) => {
  // TODO: use the market that volume is bigger when source is omiga or uxtoswap
  return db.insert(historyPrice).values(price).onConflictDoNothing();
};

export async function syncFromCoinmarket(
  assets: (keyof typeof CoinMarketAssetId)[],
  db: PostgresJsDatabase<typeof schema>,
) {
  const coinmarketAssetIds = assets.map((v) => +CoinMarketAssetId[v]);
  const { data, status } = await latestQuotes({ id: coinmarketAssetIds.join(',') });
  if (status.error_code !== 0) throw new Error(status.error_message);
  const txCounts = await db
    .select({
      assetId: tx.assetId,
      count: sql<number>`count(*) as count`,
    })
    .from(tx)
    .where(gte(tx.committedTime, new Date(Date.now() - 24 * 3600_000)))
    .groupBy(tx.assetId);
  const list: ({ market: typeof lastestMarket.$inferInsert; price: typeof historyPrice.$inferInsert } | undefined)[] =
    assets.map((v) => {
      const assetId = NATIVE_ASSETS[v];
      const assetInfo = data[+CoinMarketAssetId[v]];
      const USDQuote = assetInfo?.quote.USD;
      if (!assetInfo || !USDQuote?.price) return;
      return {
        market: {
          assetId,
          price: USDQuote.price.toString(),
          highestPrice: Math.max(USDQuote.price ?? 0, highestPrices[assetId] ?? 0).toString(),
          totalSupply: assetInfo.total_supply.toString(),
          maxSupply: assetInfo.max_supply?.toString(),
          percentChange24h: USDQuote.percent_change_24h,
          marketCap: USDQuote.market_cap?.toString(),
          volume24h: USDQuote.volume_24h.toString(),
          txs24h: txCounts.find((v) => v.assetId === assetId)?.count,
          dataSource: MarketSource.CoinMarket,
        },
        price: {
          assetId,
          price: USDQuote.price.toString(),
          time: new Date(assetInfo.last_updated),
          dataSource: MarketSource.CoinMarket,
        },
      };
    });
  const market = list[0]?.market;
  if (!market) return;
  await Promise.all(list.flatMap((v) => (v ? [insertMarket(v.market, db), insertPrice(v.price, db)] : undefined)));
  return true;
}

export async function syncFromUTXOSwap(
  params: { pageNo: number; pageSize: number; searchKey: string },
  db: PostgresJsDatabase<typeof schema>,
) {
  const assetsInfo = await db.query.assetInfo.findMany();
  const historyPrices = await getHistoryPrice(
    Date.now() - 24 * 3600_000,
    assetsInfo.map((v) => v.id),
  );
  const result = await sequencerPools(params);
  if (result.code !== 0) throw new Error(result.message);
  const marketList: (typeof lastestMarket.$inferInsert | undefined)[] = result.data.list.map((v) => {
    const asset = assetsInfo.find(
      (a) => a.id === v.assetY.typeHash || (a.meta as { typeHash: string })?.typeHash === v.assetY.typeHash,
    );
    if (!asset) return;
    const price24HoursAgo = historyPrices[asset.id];
    return {
      assetId: asset.id,
      price: v.assetY.price,
      highestPrice: Math.max(+v.assetY.price, highestPrices[asset.id] ?? 0).toString(),
      totalSupply: '0', // get from chain
      maxSupply: null,
      percentChange24h: price24HoursAgo
        ? BigNumber(v.assetY.price).minus(price24HoursAgo).dividedBy(price24HoursAgo).toNumber()
        : null,
      marketCap: '0', // totalSupply * price
      volume24h: v.dayVolume,
      txs24h: Number(v.dayTxsCount),
      dataSource: MarketSource.UTXOSwap,
    };
  });
  await Promise.all(
    marketList.flatMap((v) =>
      v
        ? [
            insertMarket(v, db),
            insertPrice(
              {
                assetId: v.assetId,
                price: v.price,
                time: new Date(),
                dataSource: v.dataSource,
              },
              db,
            ),
          ]
        : undefined,
    ),
  );
}

export async function syncXudtFromOmiga(
  params: { pageNo: number; pageSize: number; sort: string },
  db: PostgresJsDatabase<typeof schema>,
) {
  const assetsInfo = await db.query.assetInfo.findMany();
  const result = await xudtTokenList({ page_index: params.pageNo, limit: params.pageSize, sort: params.sort });
  if (result.code !== 0) throw new Error(result.message);
  const marketList: (typeof lastestMarket.$inferInsert | undefined)[] = result.data.details.map((v) => {
    const asset = assetsInfo.find(
      (a) => (a.meta as { typeHash: string })?.typeHash === v.type_hash || a.id === v.type_hash,
    );
    if (!asset) return;
    const price = BigNumber(v.floor_price).multipliedBy(BigNumber(v.ckb_usd)).toString();
    return {
      assetId: asset.id,
      price: price,
      highestPrice: Math.max(+price, highestPrices[asset.id] ?? 0).toString(),
      totalSupply: v.rebase_supply.toString(),
      maxSupply: v.rebase_supply.toString(),
      percentChange24h: +v.change_24h,
      marketCap: BigNumber(price).multipliedBy(v.rebase_supply).toString(),
      volume24h: v.volume_24h.toString(),
      txs24h: v.count_24h,
      dataSource: MarketSource.Omiga,
    };
  });
  await Promise.all(
    marketList.flatMap((v) =>
      v
        ? [
            insertMarket(v, db),
            insertPrice(
              {
                assetId: v.assetId,
                price: v.price,
                time: new Date(),
                dataSource: v.dataSource,
              },
              db,
            ),
          ]
        : undefined,
    ),
  );
  return result;
}

async function getAllDobOrders(typeHash: string) {
  let page = 1;
  let res = await getDobSellOrders({ page_index: page, limit: 100, type_hash: typeHash });
  let code = res.code;
  const details = res.data.details;
  if (code !== 0) throw new Error(res.message);
  while (code === 0 && details.length < res.data.page_count) {
    page += 1;
    res = await getDobSellOrders({ page_index: page, limit: 100, type_hash: typeHash });
    code = res.code;
    details.push(...res.data.details);
  }
  return details;
}

async function insertDOB(
  details: Awaited<ReturnType<typeof getNftList>>['data']['details'],
  assetsInfo: (typeof schema.assetInfo.$inferSelect)[],
  db: PostgresJsDatabase<typeof schema>,
) {
  const marketList: (typeof lastestMarket.$inferInsert | undefined)[] = details.map((v) => {
    const asset = assetsInfo.find(
      (a) => a.id === v.type_hash || (a.meta as { typeHash: string })?.typeHash === v.type_hash,
    );
    if (!asset) return;
    const price = BigNumber(v.floor_price).multipliedBy(BigNumber(v.ckb_usd)).toString();
    return {
      assetId: asset.id,
      price: price,
      highestPrice: Math.max(+price, highestPrices[asset.id] ?? 0).toString(),
      totalSupply: v.items_count.toString(),
      maxSupply: null,
      percentChange24h: +v.change_24h,
      marketCap: v.market_cap.toString(),
      volume24h: v.volume_24h.toString(),
      txs24h: v.count_24h,
      dataSource: MarketSource.Omiga,
    };
  });
  await Promise.all(
    marketList.flatMap((v) =>
      v
        ? [
            insertMarket(v, db),
            insertPrice(
              {
                assetId: v.assetId,
                price: v.price,
                time: new Date(),
                dataSource: v.dataSource,
              },
              db,
            ),
          ]
        : undefined,
    ),
  );
}

async function insertDOBOrders(
  details: Awaited<ReturnType<typeof getDobSellOrders>>['data']['details'],
  assetsInfo: (typeof schema.assetInfo.$inferSelect)[],
  db: PostgresJsDatabase<typeof schema>,
) {
  const marketList: (typeof lastestMarket.$inferInsert | undefined)[] = details.map((v) => {
    const asset = assetsInfo.find(
      (a) => (a.meta as { typeHash: string })?.typeHash === v.type_hash || a.id === v.type_hash,
    );
    if (!asset) return;
    const price = BigNumber(v.price).multipliedBy(BigNumber(v.ckb_usd)).toString();
    return {
      assetId: asset.id,
      price: price,
      highestPrice: Math.max(+price, highestPrices[asset.id] ?? 0).toString(),
      totalSupply: null,
      maxSupply: null,
      percentChange24h: 0,
      dataSource: MarketSource.Omiga,
    };
  });
  await Promise.all(
    marketList.flatMap((v) =>
      v
        ? [
            insertMarket(v, db),
            insertPrice(
              {
                assetId: v.assetId,
                price: v.price,
                time: new Date(),
                dataSource: v.dataSource,
              },
              db,
            ),
          ]
        : undefined,
    ),
  );
}

export async function syncDobFromOmiga(db: PostgresJsDatabase<typeof schema>) {
  const {
    code,
    message,
    data: { details },
  } = await getNftList({ page_index: 1, limit: 100, sort: 'volume_24h', udt_type: 'spore_cluster' });
  if (code !== 0) throw new Error(message);
  const assetsInfo = await db.query.assetInfo.findMany();
  await insertDOB(details, assetsInfo, db);
  for (const item of details) {
    const dobOrders = await getAllDobOrders(item.type_hash);
    await insertDOBOrders(dobOrders, assetsInfo, db);
  }
}

export const marketRouter = createTRPCRouter({
  syncFromCoinmarket: publicProcedure
    .input(
      z.array(
        z.union(
          Object.keys(CoinMarketAssetId).map((v) => z.literal(v)) as [
            ZodLiteral<CoinMarketAssetType>,
            ZodLiteral<CoinMarketAssetType>,
            ...ZodLiteral<CoinMarketAssetType>[],
          ],
        ),
      ),
    )
    .mutation(async ({ ctx, input }) => {
      return syncFromCoinmarket(input, ctx.db);
    }),
  syncFromUTXOSwap: publicProcedure
    .input(
      z
        .object({
          pageNo: z.number().default(0),
          pageSize: z.number().default(200),
          searchKey: z.string().default('0x0000000000000000000000000000000000000000000000000000000000000000'),
        })
        .default({}),
    )
    .mutation(async ({ ctx, input }) => {
      return syncFromUTXOSwap(input, ctx.db);
    }),
  syncFromOmiga: publicProcedure
    .input(
      z
        .object({
          pageNo: z.number().default(0),
          pageSize: z.number().default(200),
          sort: z.string().default('volume_24h'),
        })
        .default({}),
    )
    .mutation(async ({ ctx, input }) => {
      return syncXudtFromOmiga(input, ctx.db);
    }),
});
