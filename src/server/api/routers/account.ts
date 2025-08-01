import { TRPCError } from '@trpc/server';
import BigNumber from 'bignumber.js';
import dayjs from 'dayjs';
import { and, count, eq, inArray } from 'drizzle-orm';
import * as R from 'remeda';
import { z } from 'zod';

import { addressConvert, getAddressNetwork } from '~/lib/address';
import {
  queryAddressesAssets,
  queryAddressTx,
  queryAddressTxCount,
  queryTotalTxCount,
  queryTxAddresses,
  queryTxAssetChanges,
} from '~/server/api/clickhouse';
import { getLatestMarket } from '~/server/api/comm';
import * as zodHelper from '~/server/api/routers/zod-helper';
import { createTRPCRouter, protectProcedure, publicProcedure } from '~/server/api/trpc';
import { watchingAddress } from '~/server/db/schema';
import { newWalletValidator } from '~/server/types/account';
import { toHexNo0x } from '~/utils/bytes';

import { zPaginationOutput } from './external/def';
import { dateOutput } from './zod-helper/basic';

export type HistoryAsset = {
  date: string;
  value: string;
};

type HistoryTransactionCount = {
  month: string;
  count: number;
};

const MAX_ADDRESSES_LIMIT = 20;

const zPlanInterval = z.enum(['month', 'year']);
const zPlanCurrency = z.enum(['usd']);

const zPrice = z.object({
  priceId: z.string().nullable(),
  interval: zPlanInterval.nullable(),
  price: z.string().nullable(),
  currency: zPlanCurrency.nullable(),
  totalCredits: z.number().nullable(),
});

const zPlan = z.object({
  productId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  prices: z.array(zPrice),
});

export const accountRouter = createTRPCRouter({
  getWatchingAddresses: protectProcedure.query(async ({ ctx }) => {
    return ctx.db.query.watchingAddress.findMany({ where: eq(watchingAddress.accountId, ctx.auth.userId) });
  }),
  addWatchingAddress: protectProcedure.input(newWalletValidator).mutation(async ({ ctx, input }) => {
    const network = getAddressNetwork(input.address);
    if (network !== input.network) throw new TRPCError({ code: 'BAD_REQUEST', message: 'address parsing failure' });

    const counts = await ctx.db
      .select({ count: count() })
      .from(ctx.db.select().from(watchingAddress).where(eq(watchingAddress.accountId, ctx.auth.userId)).as('sq'));

    if (counts[0]?.count && counts[0]?.count >= MAX_ADDRESSES_LIMIT)
      throw new TRPCError({ code: 'CONFLICT', message: 'Added addresses have reached limit' });

    await ctx.db
      .insert(watchingAddress)
      .values({
        address: input.address,
        accountId: ctx.auth.userId,
        network: input.network,
        description: input.description,
      })
      .onConflictDoUpdate({
        target: [watchingAddress.address, watchingAddress.accountId],
        set: { description: input.description },
      });
  }),
  removedWatchingAddress: protectProcedure
    .input(
      z.object({
        address: z.string(),
        network: z.enum(['CKB', 'BTC']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const network = getAddressNetwork(input.address);
      if (network !== input.network) throw new TRPCError({ code: 'BAD_REQUEST', message: 'address parsing failure' });

      await ctx.db
        .delete(watchingAddress)
        .where(and(eq(watchingAddress.network, input.network), eq(watchingAddress.address, input.address)));
    }),
  historyTransactionCount: protectProcedure
    .input(
      z.object({
        recentMonths: z.number().min(1).max(12).default(12),
      }),
    )
    .query(async ({ ctx, input }): Promise<HistoryTransactionCount[]> => {
      const addresses = (
        await ctx.db.query.watchingAddress.findMany({
          where: eq(watchingAddress.accountId, ctx.auth.userId),
        })
      ).map((d) => toHexNo0x(addressConvert.toCH(d.address, d.network === 'BTC' ? 'btc' : 'ckb')));

      const data = await queryAddressTxCount(addresses, input.recentMonths);

      const countMap = R.mapToObj(data, (i) => [i.month, Number(i.count)]);

      return R.pipe(
        R.pipe(
          new Array(input.recentMonths),
          R.mapToObj((_, index) => [dayjs().subtract(index, 'month').format('YYYY-MM'), 0]),
          R.entries(),
        ),
        R.map(([key]) => ({
          month: key,
          count: countMap[key] ?? 0,
        })),
        R.sortBy([R.prop('month'), 'asc']),
      );
    }),
  getAssets: protectProcedure.query(async ({ ctx }) => {
    const addresses = (
      await ctx.db.query.watchingAddress.findMany({
        where: eq(watchingAddress.accountId, ctx.auth.userId),
      })
    ).map((d) => d.address);

    const result = await queryAddressesAssets(addresses);
    const relatedAssetIds = result.map((d) => d.assetId);
    const assetInfos = await ctx.db.query.assetInfo.findMany({
      where: (table) => inArray(table.id, relatedAssetIds),
    });

    const assetInfoMap = R.mapToObj(assetInfos, (info) => [
      info.id,
      { ...info, totalSupply: info.totalSupply?.toString() ?? '0' },
    ]);

    const marketMap = await getLatestMarket(relatedAssetIds);

    return result
      .map((asset) => ({
        assetId: asset.assetId,
        assetInfo: assetInfoMap[asset.assetId] ?? null,
        assetAmount: BigNumber(asset.balance)
          .div(Math.pow(10, assetInfoMap[asset.assetId]?.decimals ?? 0))
          .toFixed(2)
          .toString(),
        percentChange24h: marketMap[asset.assetId]?.percentChange24h ?? 0,
        value: marketMap[asset.assetId]?.price
          ? BigNumber(asset.balance)
              .div(Math.pow(10, assetInfoMap[asset.assetId]?.decimals ?? 0))
              .multipliedBy(marketMap[asset.assetId]?.price ?? 0)
              .toFixed(2)
              .toString()
          : null,
      }))
      .sort((a, b) => (a.value === null ? 1 : b.value === null ? -1 : BigNumber(a.value).lte(b.value) ? 1 : -1))
      .filter((d) => d.assetAmount !== '0.00');
  }),
  transactions: protectProcedure
    .input(
      z.object({
        chain: z.enum(['BTC', 'CKB']).optional(),
        asset: z.string().optional(),
        orderKey: z.enum(['asset', 'change', 'time']).optional().default('time'),
        order: z.enum(['asc', 'desc']).optional().default('desc'),
        page: z.number().min(1).default(1),
        pageSize: z.number().default(10),
      }),
    )
    .output(
      z.object({
        data: z.array(
          z.object({
            txHash: z.string(),
            time: z.date(),
            network: z.enum(['BTC', 'CKB']),
            blockNumber: z.number(),
            changes: z.array(
              z.object({
                assetId: z.string(),
                value: z.number(),
                volume: z.string(),
              }),
            ),
            fromAddresses: z.array(z.string()),
            toAddresses: z.array(z.string()),
            assets: z.array(zodHelper.asset),
          }),
        ),
        pagination: z.object({
          page: z.number(),
          pageSize: z.number(),
          rowCount: z.number(),
        }),
      }),
    )
    .query(async ({ ctx, input }) => {
      const addresses = (
        await ctx.db.query.watchingAddress.findMany({
          where: eq(watchingAddress.accountId, ctx.auth.userId),
        })
      ).map((d) => toHexNo0x(addressConvert.toCH(d.address, d.network === 'BTC' ? 'btc' : 'ckb')));

      const { orderKey, order } = input;

      const txCounts = await queryTotalTxCount({
        addresses,
        asset: input.asset,
        network: input.chain?.toLowerCase() as 'ckb' | 'btc' | undefined,
      });

      const addressTxs = await queryAddressTx({
        addresses,
        asset: input.asset,
        network: input.chain?.toLowerCase() as 'ckb' | 'btc' | undefined,
        orderKey: orderKey ?? 'time',
        order: order ?? 'desc',
        page: input.page,
        pageSize: input.pageSize,
      });
      if (!addressTxs.length) {
        return {
          data: [],
          pagination: {
            page: input.page,
            pageSize: input.pageSize,
            rowCount: txCounts,
          },
        };
      }
      const txAssetChanges = await queryTxAssetChanges(addressTxs.map((tx) => tx.txHash));
      const changes: Record<string, Record<string, { assetId: string; amountUsd: number; amount: string }[]>> = R.pipe(
        txAssetChanges,
        R.groupBy(R.prop('txHash')),
        R.mapValues(R.groupBy(R.prop('address'))),
      );
      const txAddresses = await queryTxAddresses(addressTxs.map((tx) => tx.txHash));
      const txAddressMap = R.pipe(
        txAddresses,
        R.groupBy(R.prop('txHash')),
        R.mapValues(R.partition((v) => v.fromOrTo === 'from')),
      );
      const assetInfos = await ctx.db.query.assetInfo.findMany({
        where: (table) => inArray(table.id, R.unique(R.map(txAssetChanges, (i) => i.assetId))),
      });
      const assetInfoMap = R.mapToObj(assetInfos, (info) => [
        info.id,
        { ...info, totalSupply: info.totalSupply?.toString() ?? '0' },
      ]);

      const data = R.pipe(
        addressTxs,
        R.map((tx) => {
          const network: 'BTC' | 'CKB' = tx.network === 'btc' ? 'BTC' : 'CKB';
          return {
            txHash: tx.txHash,
            time: new Date(Number(tx.timestamp)),
            network,
            blockNumber: Number(tx.blockNumber),
            changes: (changes?.[tx.txHash]?.[tx.address] ?? []).map((v) => ({
              assetId: v.assetId,
              value: v.amountUsd,
              volume: v.amount,
            })),
            fromAddresses:
              txAddressMap?.[tx.txHash]?.[0]?.map((i) => addressConvert.fromCH(i.address, tx.network)) ?? [],
            toAddresses: txAddressMap?.[tx.txHash]?.[1]?.map((i) => addressConvert.fromCH(i.address, tx.network)) ?? [],
            assets:
              changes?.[tx.txHash]?.[tx.address]?.map((v) => assetInfoMap[v.assetId]).filter((v) => v !== undefined) ??
              [],
          };
        }),
      );

      return {
        data,
        pagination: {
          page: input.page,
          pageSize: input.pageSize,
          rowCount: txCounts,
        },
      };
    }),

  plans: publicProcedure.output(z.array(zPlan)).query(async ({ ctx }) => {
    const products = await ctx.paymentService.listProducts();

    return products
      .sort((a, b) => Number(a.attributes.metadata.index) - Number(b.attributes.metadata.index))
      .map<typeof zPlan._type>((product) => {
        const attrs = product.attributes;

        return {
          name: attrs.name,
          description: attrs.description,
          productId: product.id,
          prices:
            product.attributes.stripe_prices?.map((price) => ({
              priceId: price.id,
              interval: zPlanInterval.safeParse(price?.recurring?.interval).data ?? null,
              currency: zPlanCurrency.safeParse(price?.currency).data ?? null,
              price: price.unit_amount_decimal,
              totalCredits: price.metadata?.credit_quota ? Number(price.metadata.credit_quota) : null,
              rateLimit: price.metadata?.rate_limit ? Number(price.metadata.rate_limit) : null,
            })) ?? [],
        };
      });
  }),

  subscribePlan: protectProcedure
    .input(z.object({ priceId: z.string(), successUrl: z.string(), cancelUrl: z.string() }))
    .output(z.object({ url: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { url } = await ctx.paymentService.checkoutSession({
        accountId: ctx.auth.userId,
        priceId: input.priceId,
        successUrl: input.successUrl,
        cancelUrl: input.cancelUrl,
      });
      return { url };
    }),

  subscription: protectProcedure
    .output(
      z
        .object({
          plan: z
            .object({
              currency: zPlanCurrency.nullable(),
              interval: zPlanInterval.nullable(),
              description: z.string(),
              name: z.string(),
              productId: z.string(),
              priceId: z.string(),
              price: z.string(),
              totalCredits: z.number(),
              rateLimit: z.number(),
            })
            .optional(),
          remainingCredits: z.number(),
          totalCredits: z.number(),
          periodStart: dateOutput,
          periodEnd: dateOutput,
        })
        .nullable(),
    )
    .query(async ({ ctx }) => {
      const info = await ctx.paymentService.getUserSubscriptionInfo({ accountId: ctx.auth.userId });
      const currency = zPlanCurrency.safeParse(info?.plan.currency).data ?? null;
      const interval = zPlanInterval.safeParse(info?.plan.interval).data ?? null;
      if (!info) {
        return null;
      }
      return {
        periodEnd: info.periodEnd,
        periodStart: info.periodStart,
        remainingCredits: info.remainingCredits,
        totalCredits: info.totalCredits,
        plan: {
          currency,
          interval,
          description: info.plan.description,
          name: info.plan.name,
          productId: info.plan.productId,
          priceId: info.plan.priceId,
          price: info.plan.price,
          totalCredits: info.plan.totalCredits,
          rateLimit: info.plan.rateLimit,
        },
      };
    }),

  changePlan: protectProcedure
    .input(
      z.object({
        priceId: z.string(),
      }),
    )
    .output(
      z.object({
        success: z.boolean(),
      }),
    )
    .mutation(({ ctx, input }) => {
      return ctx.paymentService
        .changePlan({
          accountId: ctx.auth.userId,
          priceId: input.priceId,
        })
        .then((success) => ({ success }));
    }),

  generateApiKey: protectProcedure
    .input(z.object({ name: z.string() }))
    .output(z.object({ id: z.number(), apiKey: z.string(), name: z.string(), createdAt: dateOutput }))
    .mutation(async ({ ctx, input }) => {
      const res = await ctx.paymentService.generateApiKey({ accountId: ctx.auth.userId, name: input.name });
      return res;
    }),

  modifyApiKey: protectProcedure
    .input(z.object({ apiKeyId: z.string(), name: z.string().min(1) }))
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const success = await ctx.paymentService.modifyApiKey({
        accountId: ctx.auth.userId,
        apiKeyId: input.apiKeyId,
        name: input.name,
      });
      return { success };
    }),

  revokeApiKey: protectProcedure
    .input(z.object({ id: z.string() }))
    .output(z.object({ revoked: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const res = await ctx.paymentService.revokeApiKey({ accountId: ctx.auth.userId, apiKeyId: input.id });
      return { revoked: res > 0 };
    }),

  apiKeys: protectProcedure
    .input(zodHelper.paginationInput)
    .output(
      zPaginationOutput(z.object({ id: z.string(), apiKey: z.string(), name: z.string(), createdAt: dateOutput })),
    )
    .query(async ({ ctx, input }) => {
      const res = await ctx.paymentService.listApiKeys({ accountId: ctx.auth.userId });
      const total = res.pagination.rowCount ?? 0;
      const hasNext = total > input.page * input.pageSize;

      return {
        data: res.data,
        pagination: { total, hasNext },
      };
    }),
});
