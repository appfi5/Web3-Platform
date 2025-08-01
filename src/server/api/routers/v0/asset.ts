import BigNumber from 'bignumber.js';
import { and, count, eq, inArray, isNull, or, sql } from 'drizzle-orm';
import * as R from 'remeda';
import { z } from 'zod';

import { NATIVE_ASSETS } from '~/constants';
import { PROTOCOLS } from '~/lib/constant';
import { assetInfo, assetStats, assetTag, assetToProtocol, assetToTag, lastestMarket } from '~/server/db/schema';

import { queryAssetHolders, queryAssetTotalSupply } from '../../clickhouse';
import { createTRPCRouter, publicProcedure } from '../../trpc';
import { USDollar } from '../../utils';
import { paginationInput, wrapPaginationOutput } from '../zod-helper';
import {
  addressOutput,
  assetIdInput,
  assetIdOutput,
  dateOutput,
  digitStringOutput,
  zArray,
  zodStringArray,
} from '../zod-helper/basic';

const protocolEnum = z.enum(PROTOCOLS);

export const assetRouter = createTRPCRouter({
  list: publicProcedure
    .meta({ openapi: { method: 'GET', path: '/v0/assets' } })
    .input(
      z
        .object({
          tags: zodStringArray.optional(),
          protocols: zArray(protocolEnum).optional(),
          orderKey: z
            .enum(['price', 'priceChange24h', 'marketCap', 'tradingVolume24h', 'transactionCount', 'holderCount'])
            .optional(),
          orderDirection: z.enum(['asc', 'desc']).optional(),
        })
        .merge(paginationInput),
    )
    .output(
      wrapPaginationOutput(
        z.object({
          id: assetIdOutput,
          name: z.string().optional(),
          icon: z.string().nullable(),
          tags: z.array(z.object({ id: z.number(), style: z.string().nullable(), label: z.string() })),
          protocols: z.array(z.enum(PROTOCOLS)),

          price: digitStringOutput.optional(),
          marketCap: digitStringOutput.optional(),
          priceChange24h: z.number().optional(),

          // original volume24h
          tradingVolume24h: digitStringOutput.optional(),

          // transactions: item.asset_stats?.transactionCount ?? 0,
          transactionCount: z.number(),
          // holzers: item.asset_stats?.holderCount ?? 0,
          holderCount: z.number(),
          // firstMintAt: item.asset_info.firstMintAt ? +item.asset_info.firstMintAt : undefined,
          firstFoundTime: dateOutput.optional(),
        }),
      ),
    )
    .query(async ({ ctx, input }) => {
      const orderBy = (() => {
        const [field, order] = input.orderKey
          ? [input.orderKey, input.orderDirection ?? 'desc']
          : ['marketCap', 'desc'];
        const tableField = (() => {
          switch (field) {
            case 'holderCount':
              return assetStats.holderCount;
            case 'price':
              return lastestMarket.price;
            case 'priceChange24h':
              return lastestMarket.percentChange24h;
            case 'transactionCount':
              return assetStats.transactionCount;
            case 'tradingVolume24h':
              return lastestMarket.volume24h;
            default:
              return lastestMarket.marketCap;
          }
        })();

        return sql`${tableField} ${sql.raw(order)} NULLS LAST`;
      })();

      // filter the asset that is not layer 1 or layer 2, for example a spore token
      const parentIdCondition = or(
        isNull(assetInfo.parentId),
        inArray(assetInfo.parentId, [NATIVE_ASSETS.BTC, NATIVE_ASSETS.CKB]),
      );
      const containTags = (tags: string[]) =>
        ctx.db
          .select({ id: assetInfo.id })
          .from(assetInfo)
          .leftJoin(assetToTag, eq(assetInfo.id, assetToTag.assetId))
          .leftJoin(assetTag, eq(assetToTag.assetTagLabel, assetTag.label))
          .groupBy(assetInfo.id)
          .having(eq(count(assetInfo.id), tags.length))
          .where(and(inArray(assetTag.label, tags), eq(assetInfo.public, true)));

      const containProtocols = (protocols: z.infer<typeof protocolEnum>[]) =>
        ctx.db
          .select({ id: assetInfo.id })
          .from(assetInfo)
          .leftJoin(assetToProtocol, eq(assetInfo.id, assetToProtocol.assetId))
          .groupBy(assetInfo.id)
          .having(eq(count(assetInfo.id), protocols.length))
          .where(and(inArray(assetToProtocol.protocol, protocols)));

      const whereCondition = and(
        input.tags ? inArray(assetInfo.id, containTags(input.tags)) : undefined,
        input.protocols ? inArray(assetInfo.id, containProtocols(input.protocols)) : undefined,
        !input.tags && !input.protocols ? parentIdCondition : undefined,
      );

      const assetInfos = await ctx.db
        .select()
        .from(assetInfo)
        .leftJoin(assetStats, eq(assetInfo.id, assetStats.assetId))
        .leftJoin(lastestMarket, eq(assetInfo.id, lastestMarket.assetId))
        .orderBy(orderBy)
        .where(and(whereCondition, eq(assetInfo.public, true)))
        .limit(input.pageSize)
        .offset((input.page - 1) * input.pageSize);

      const total = await ctx.db.$count(
        ctx.db
          .select()
          .from(assetInfo)
          .where(and(whereCondition, eq(assetInfo.public, true))),
      );
      const matchedAssetInfoIds = assetInfos.map((item) => item.asset_info.id);

      const infoWithTags = await ctx.db.query.assetInfo.findMany({
        with: { assetToTag: { with: { assetTag: true } } },
        where: (t, { inArray }) => inArray(t.id, matchedAssetInfoIds),
      });

      const groupedTags = R.pipe(
        infoWithTags,
        R.indexBy((item) => item.id),
        R.mapValues((item) => item.assetToTag.map((tag) => tag.assetTag)),
      );

      const infoWithProtocols = await ctx.db
        .select()
        .from(assetToProtocol)
        .where(inArray(assetToProtocol.assetId, matchedAssetInfoIds));

      const groupedProtocols = R.pipe(
        infoWithProtocols,
        R.groupBy((item) => item.assetId),
        R.mapValues((item) => item.map((protocol) => protocol.protocol)),
      );

      const result = assetInfos.map((item) => ({
        id: item.asset_info.id,
        name: item.asset_info.name,
        icon: item.asset_info.icon,
        tags: groupedTags[item.asset_info.id] ?? [],
        protocols: groupedProtocols[item.asset_info.id] ?? [],

        price: item.latest_market?.price ?? undefined,
        marketCap: item.latest_market?.marketCap ?? undefined,
        priceChange24h: item.latest_market?.percentChange24h ?? undefined,
        tradingVolume24h: item.latest_market?.volume24h ?? undefined,

        transactionCount: item.asset_stats?.transactionCount ?? 0,
        holderCount: item.asset_stats?.holderCount ?? 0,
        firstFoundTime: item.asset_info.firstMintAt ? +item.asset_info.firstMintAt : undefined,
      }));

      return {
        result,
        total,
      };
    }),

  detail: publicProcedure
    .meta({ openapi: { method: 'GET', path: '/v0/assets/{assetId}' } })
    .input(z.object({ assetId: assetIdInput }))
    .output(
      z
        .object({
          id: assetIdOutput,
          name: z.string().optional(),
          icon: z.string().nullable(),
          symbol: z.string().nullable(),
          description: z.string().nullable(),
          tags: z.array(
            z.object({
              id: z.number(),
              style: z.string().nullable(),
              label: z.string(),
            }),
          ),

          price: digitStringOutput.optional(),
          marketCap: digitStringOutput.optional(),
          priceChange24h: z.number().optional(),
          // original volume
          tradingVolume24h: digitStringOutput.nullable(),

          // original transactions
          transactionCount: z.number(),
          // original holders
          holderCount: z.number(),
          // original firstMintAt
          firstFoundTime: dateOutput.optional(),

          circulatingSupply: digitStringOutput.nullable().describe('The amount of the asset that is unlocked or mined'),

          maxSupply: digitStringOutput.nullable().describe('The maximum amount of the asset'),
        })
        .nullable(),
    )
    .query(async ({ ctx, input }) => {
      const res = await ctx.db.query.assetInfo.findFirst({
        where: eq(assetInfo.id, input.assetId),
        with: {
          assetToTag: { with: { assetTag: true } },
          assetInfoStats: true,
        },
      });

      if (!res) {
        return null;
      }

      const marketData = await ctx.marketService.getLatestMarketData({
        assetId: input.assetId,
      });

      return {
        id: res.id,
        name: res.name,
        icon: res.icon,
        symbol: res.symbol,
        description: res.description,
        tags: res.assetToTag.map((item) => item.assetTag),
        decimals: res.decimals,
        price: marketData?.price ?? undefined,
        marketCap: marketData?.marketCap ?? undefined,
        priceChange24h: marketData?.percentChange24h ?? undefined,
        tradingVolume24h: marketData?.volume24h ?? null,
        transactionCount: res.assetInfoStats?.transactionCount ?? 0,
        holderCount: res.assetInfoStats?.holderCount ?? 0,
        firstFoundTime: res.firstMintAt ? +res.firstMintAt : undefined,
        circulatingSupply: res.totalSupply,
        maxSupply: marketData?.maxSupply ?? null,
      };
    }),

  holders: publicProcedure
    .meta({ openapi: { method: 'GET', path: '/v0/assets/{assetId}/holders' } })
    .input(z.object({ assetId: assetIdInput }).merge(paginationInput))
    .output(
      wrapPaginationOutput(
        z.object({
          address: addressOutput,
          amount: digitStringOutput,
          amountUsd: digitStringOutput,
          percentage: z.number(),
        }),
      ),
    )
    .query(async ({ ctx, input }) => {
      const res = await queryAssetHolders(input.assetId);

      const timestamp = Date.now();
      const calculator = await ctx.marketService.createCalculator([{ assetId: input.assetId, timestamp }]);

      const totalSupply = BigNumber((await queryAssetTotalSupply(input.assetId))[0]?.value ?? '0');

      const offset = input.pageSize * (input.page - 1);
      const result = res.slice(offset, offset + input.pageSize).map((item) => {
        const amountWithDecimals = calculator.getAmountWithDecimals({ assetId: input.assetId, value: item.amount });
        const usdValue = Number(calculator.getVolume({ assetId: input.assetId, value: item.amount, timestamp }));

        return {
          address: item.address,
          amount: amountWithDecimals,
          amountUsd: usdValue ? USDollar.format(usdValue) : '-',
          // TODO: the total supply has deicimal info, and we need to remove it
          percentage: totalSupply.isZero() ? 0 : BigNumber(item.amount).div(totalSupply).toNumber(),
        };
      });

      return { result, total: res.length };
    }),
});
