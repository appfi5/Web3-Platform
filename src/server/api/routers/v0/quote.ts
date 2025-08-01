import { TRPCError } from '@trpc/server';
import { and, eq, gte, sql } from 'drizzle-orm';
import { omit } from 'remeda';
import { z } from 'zod';

import { historyPrice, lastestMarket } from '~/server/db/schema';

import { createTRPCRouter, publicProcedure } from '../../trpc';
import { assetIdInput, assetIdOutput, dateOutput, digitStringOutput } from '../zod-helper/basic';

export const quoteRouter = createTRPCRouter({
  latest: publicProcedure
    .meta({ openapi: { path: '/v0/quote/{assetId}/latest', method: 'GET' } })
    .input(z.object({ assetId: assetIdInput }))
    .output(
      z.object({
        price: digitStringOutput.nullable(),
        totalSupply: digitStringOutput.nullable(),
        maxSupply: digitStringOutput.nullable(),
        priceChange24h: z.number().nullable(),
        marketCap: digitStringOutput.nullable(),
        tradingVolume24h: digitStringOutput.nullable(),
        txCount24h: z.number().nullable(),
      }),
    )
    // home.getLatestMarket
    .query(async ({ ctx, input }) => {
      const res = await ctx.db.query.lastestMarket.findFirst({ where: eq(lastestMarket.assetId, input.assetId) });
      if (!res) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Market data for assetId ${input.assetId} not found`,
        });
      }
      return {
        ...omit(res, ['highestPrice', 'percentChange24h', 'volume24h', 'txs24h']),
        priceChange24h: res.percentChange24h,
        tradingVolume24h: res.volume24h,
        txCount24h: res.txs24h,
      };
    }),
  last7DayPrice: publicProcedure
    .meta({ openapi: { path: '/v0/quote/{assetId}/7d-prices', method: 'GET' } })
    .input(z.object({ assetId: assetIdInput }))
    .output(
      z.array(
        z.object({
          assetId: assetIdOutput,
          price: digitStringOutput.nullable(),
          time: dateOutput,
        }),
      ),
    )
    // home.getLast7DayPrice
    .query(async ({ ctx, input }) => {
      const res = await ctx.db
        .select({
          assetId: historyPrice.assetId,
          price: historyPrice.price,
          time: historyPrice.time,
          sequence: sql`row_number() over(partition by DATE_TRUNC('hour', "time") order by time asc)`,
        })
        .from(historyPrice)
        .where(
          and(
            eq(historyPrice.assetId, input.assetId),
            gte(historyPrice.time, sql`CURRENT_TIMESTAMP::TIMESTAMP + '-7 day'`),
          ),
        );
      return res.filter((v) => v.sequence === '1');
    }),
});
