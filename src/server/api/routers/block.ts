import { eq, inArray } from 'drizzle-orm';
import { omit } from 'remeda';
import { z } from 'zod';

import { createHelper, type Database } from '~/server/ch';
import { assetTag, assetToTag } from '~/server/db/schema';
import { Chain } from '~/utils/const';

import { BlockController } from '../controllers/block.controller';
import { createTRPCRouter, publicProcedure } from '../trpc';
import { type Pagination } from '../types';
import { paginationSchema } from './zod-helper';

export const blockRouter = createTRPCRouter({
  getTagsByBlockNumber: publicProcedure
    .meta({ openapi: { path: '/block/tags-by-block-number', method: 'GET' } })
    .input(z.object({ blockNumber: z.number() }))
    .output(
      z.array(
        z.object({
          label: z.string().describe('The label of the tag'),
          style: z.string().nullable().describe('The style of the tag'),
        }),
      ),
    )
    .query(async ({ ctx, input }) => {
      const { hex } = createHelper<Database, 'tx_action'>();
      const blockAssetIds = await ctx.ch
        .selectFrom('tx_action')
        .select([hex('asset_id', 'assetId')])
        .where('block_number', '=', input.blockNumber)
        .groupBy('asset_id')
        .execute();
      return ctx.db
        .selectDistinct({
          label: assetTag.label,
          style: assetTag.style,
        })
        .from(assetTag)
        .leftJoin(assetToTag, eq(assetTag.label, assetToTag.assetTagLabel))
        .where(
          inArray(
            assetToTag.assetId,
            blockAssetIds.map((v) => v.assetId),
          ),
        );
    }),
  getBestBlockNumber: publicProcedure
    .meta({ openapi: { path: '/block/best-block-number', method: 'GET' } })
    .input(z.object({ chain: z.nativeEnum(Chain) }))
    .output(z.number().int().nonnegative().describe('The best block number for the specified chain'))
    .query(async ({ ctx, input }) => BlockController.getInstance(ctx.db).getBestBlockNumber(input)),
  /* TODO: add type for btc/ckb block */
  getBlockInfo: publicProcedure
    .input(z.object({ chain: z.nativeEnum(Chain), hashOrNumber: z.string().or(z.number()) }))
    .query(async ({ ctx, input }) => {
      const res = await BlockController.getInstance(ctx.db).getBlockInfo({
        hashOrHeight: input.hashOrNumber,
        network: input.chain === Chain.CKB ? 'ckb' : 'btc',
      });
      if (!res) return;
      return {
        ...omit(res, ['token']),
        tokens: {
          count: res.token.count,
          volume: res.token.totalAmountUsd,
        },
        txFee: {
          amount: res.txFee.amount,
          volume: res.txFee.amountUsd,
        },
        txAmount: {
          amount: res.txAmount.amount,
          volume: res.txAmount.amountUsd,
        },
        blockReward: {
          amount: res.blockReward.amount,
          volume: res.blockReward.amountUsd,
        },
      };
    }),

  /* TODO: add type for btc/ckb block */
  getOriginalBlockInfo: publicProcedure
    .input(z.object({ chain: z.nativeEnum(Chain), hash: z.string() }))
    .query(async ({ ctx, input }) =>
      BlockController.getInstance(ctx.db).getOriginalBlockInfo({
        blockHash: input.hash,
        network: input.chain === Chain.CKB ? 'ckb' : 'btc',
      }),
    ),

  getTransactionList: publicProcedure
    /* FIXME: openapi skipped because pagination is nested object which is not supported */
    .input(
      z.object({
        blockHash: z.string(),
        from: z.string().nullable().default(null),
        to: z.string().nullable().default(null),
        addressCondition: z.enum(['or', 'and']).default('and'),
        assetId: z.string().nullable().default(null),
        sort: z.enum(['desc', 'asc']).nullable().default(null),
        txHash: z.string().nullable().default(null),
        pagination: paginationSchema,
      }),
    )
    .output(
      z.object({
        data: z.array(
          z.object({
            hash: z.string().describe('Transaction hash'),
            txIndex: z.number().describe('Transaction index in the block'),
            amount: z.string().describe('Raw transaction amount in base units'),
            volume: z.string().describe('Transaction volume'),
            from: z.string().describe('Main sender address of the transaction'),
            fromCount: z.number().describe('Total number of senders'),
            to: z.string().describe('Main receiver address of the transaction'),
            toCount: z.number().describe('Total number of receivers'),
            asset: z
              .object({
                name: z.string().nullable().describe('Full name of the asset'),
                icon: z.string().nullable().describe('URL to asset icon image'),
                symbol: z.string().nullable().describe('Trading symbol of the asset'),
                decimals: z.number().nullable().describe('Number of decimal places for the asset'),
              })
              .optional(),
          }),
        ),
        pagination: z.object({
          rowCount: z.number().int().nonnegative().optional().describe('Total number of rows matching the query'),
        }),
      }),
    )
    .query(
      async ({
        ctx,
        input,
      }): Promise<
        Pagination<{
          hash: string;
          txIndex: number;
          amount: string;
          volume: string;
          from: string;
          fromCount: number;
          to: string;
          toCount: number;
          asset?: { name: string; icon: string | null; symbol: string | null; decimals: number | null };
        }>
      > => {
        const { pagination, from, to, addressCondition, sort, txHash, ...rest } = input;
        const res = await BlockController.getInstance(ctx.db).getTransactionList({
          ...rest,
          txHash: txHash ?? undefined,
          from: from ?? undefined,
          to: to ?? undefined,
          addressFilterOperator: addressCondition,
          orderDirection: sort ?? undefined,
          page: pagination.page,
          pageSize: pagination.pageSize,
        });
        return {
          data: res.result.map((v) => ({
            ...v,
            volume: v.amountUsd,
          })),
          pagination: {
            rowCount: res.total,
          },
        };
      },
    ),

  getAssetList: publicProcedure
    .meta({ openapi: { path: '/block/asset-list', method: 'GET' } })
    .input(
      z.object({
        blockHash: z.string(),
      }),
    )
    .output(
      z.object({
        data: z.array(
          z.object({
            assetId: z.string().describe('Unique identifier for the asset'),
            name: z.string().nullable().describe('Full name of the asset (e.g. "Bitcoin")'),
            icon: z.string().nullable().describe('URL to the asset icon image'),
            symbol: z.string().nullable().describe('Trading symbol of the asset (e.g. "BTC")'),
          }),
        ),
      }),
    )
    .query(async ({ ctx, input }) => BlockController.getInstance(ctx.db).getAssetList(input)),

  getAddressChangeList: publicProcedure
    /* FIXME: openapi skipped because pagination is nested object which is not supported */
    .input(
      z.object({
        blockHash: z.string(),
        address: z.string().nullable().default(null),
        pagination: paginationSchema,
        sort: z.enum(['desc', 'asc']).default('desc'),
      }),
    )
    .output(
      z.object({
        data: z.array(
          z.object({
            address: z.string().describe('The specific address'),
            volume: z.number().nullable().describe('The total transaction volume'),
            from: z.number().describe('Asset change where this address is the sender'),
            to: z.number().describe('Asset change where this address is the receiver'),
            value: z.bigint().describe('The amount of asset involved'),
          }),
        ),
        pagination: z.object({
          rowCount: z.number().int().nonnegative().optional().describe('Total number of records available'),
        }),
      }),
    )
    .query(
      async ({
        ctx,
        input,
      }): Promise<
        Pagination<{
          address: string;
          volume: number | null;
          from: number;
          to: number;
          value: bigint;
        }>
      > => {
        const { pagination, sort, address, blockHash } = input;
        const res = await BlockController.getInstance(ctx.db).getAddressChangeList({
          blockHash,
          address: address ?? undefined,
          orderDirection: sort,
          page: pagination.page,
          pageSize: pagination.pageSize,
        });
        return {
          data: res.result.map((v) => ({
            address: v.address,
            volume: v.amountUsd,
            from: v.sendTokens,
            to: v.receiveTokens,
            value: v.amount,
          })),
          pagination: {
            rowCount: res.total,
          },
        };
      },
    ),

  getAddressTransferList: publicProcedure
    /* FIXME: openapi skipped because pagination is nested object which is not supported */
    .input(
      z.object({
        blockHash: z.string(),
        address: z.string(),
        pagination: paginationSchema,
      }),
    )
    .output(
      z.object({
        data: z.array(
          z.object({
            input: z.bigint().describe('The total input amount for this asset'),
            output: z.bigint().describe('The total output amount for this asset'),
            change: z.bigint().describe('The net change in amount (output - input)'),
            assetSymbol: z.string().describe('The symbol/ticker of the asset (e.g. "BTC", "ETH")'),
            assetDecimals: z.number().describe('The decimals of the asset'),
            assetId: z.string().describe('Unique identifier for the asset'),
            volume: z.number().describe('The total transaction volume in USD'),
          }),
        ),
        pagination: z.object({
          rowCount: z.number().int().nonnegative().optional().describe('Total number of records available'),
        }),
      }),
    )
    .query(
      async ({
        ctx,
        input,
      }): Promise<
        Pagination<{
          assetId: string;
          input: bigint;
          output: bigint;
          change: bigint;
          volume: number;
          assetDecimals: number;
          assetSymbol: string;
        }>
      > => {
        const { pagination, ...rest } = input;
        const res = await BlockController.getInstance(ctx.db).getAddressTransferChangeList({
          ...rest,
          page: pagination.page,
          pageSize: pagination.pageSize,
        });
        return {
          data: res.result.map((v) => ({
            assetId: v.asset.id,
            input: v.amountSent,
            output: v.amountReceived,
            change: v.amountReceived - v.amountSent,
            volume: v.amountUsd,
            assetDecimals: v.asset.decimals,
            assetSymbol: v.asset.symbol,
          })),
          pagination: {
            rowCount: res.total,
          },
        };
      },
    ),

  getAssetChangeList: publicProcedure
    /* FIXME: openapi skipped because pagination is nested object which is not supported */
    .input(
      z.object({
        blockHash: z.string(),
        sort: z.enum(['desc', 'asc']).default('desc'),
        assetName: z.string().nullable().default(null),
        tags: z.array(z.string()).default([]),
        pagination: paginationSchema,
      }),
    )
    .output(
      z.object({
        data: z.array(
          z.object({
            assetId: z.string().nullable().describe('Unique identifier for the asset, can be null if not available'),
            amount: z.bigint().describe('Raw amount of the asset in its smallest unit (e.g. satoshis for BTC)'),
            volume: z.number().describe('Value of the asset transfer in USD'),
            assetName: z
              .string()
              .nullable()
              .describe('Full name of the asset (e.g. "Bitcoin"), can be null if not available'),
            assetSymbol: z
              .string()
              .nullable()
              .describe('Trading symbol of the asset (e.g. "BTC"), can be null if not available'),
            assetIcon: z.string().nullable().describe("URL to the asset's icon image, can be null if not available"),
            tags: z
              .array(z.string())
              .describe('Array of category tags associated with this asset (e.g. ["DeFi", "Stablecoin"])'),
          }),
        ),
        pagination: z.object({
          rowCount: z.number().int().nonnegative().optional(),
        }),
      }),
    )
    .query(
      async ({
        ctx,
        input,
      }): Promise<
        Pagination<{
          assetId: string | null;
          amount: bigint;
          volume: number;
          assetName: string | null;
          assetSymbol: string | null;
          assetIcon: string | null;
          tags: string[];
        }>
      > => {
        const { pagination, sort, ...rest } = input;
        const res = await BlockController.getInstance(ctx.db).getAssetChangeList({
          ...rest,
          orderDirection: sort,
          page: pagination.page,
          pageSize: pagination.pageSize,
        });
        return {
          data: res.result.map((v) => ({
            assetId: v.asset.id,
            amount: v.amount,
            volume: v.amountUsd,
            assetName: v.asset.name,
            assetSymbol: v.asset.symbol,
            assetIcon: v.asset.icon,
            tags: v.tags,
          })),
          pagination: {
            rowCount: res.total,
          },
        };
      },
    ),

  getAssetTransferList: publicProcedure
    /* FIXME: openapi skipped because pagination is nested object which is not supported */
    .input(
      z.object({
        blockHash: z.string(),
        assetId: z.string(),
        pagination: paginationSchema,
      }),
    )
    .output(
      z.object({
        pagination: z.object({
          rowCount: z.number().int().nonnegative().optional(),
        }),
        data: z.array(
          z.object({
            hash: z.string(),
            volume: z.number(),
            value: z.bigint(),
            assetSymbol: z.string(),
            assetDecimals: z.number(),
          }),
        ),
      }),
    )
    .query(
      async ({
        ctx,
        input,
      }): Promise<
        Pagination<{
          hash: string;
          volume: number;
          value: bigint;
          assetSymbol: string;
          assetDecimals: number;
        }>
      > => {
        const { pagination, ...rest } = input;
        const res = await BlockController.getInstance(ctx.db).getAssetTransferList({
          ...rest,
          page: pagination.page,
          pageSize: pagination.pageSize,
        });
        return {
          data: res.result.map((v) => ({
            hash: v.hash,
            volume: v.amountUsd,
            value: v.amount,
            assetSymbol: v.asset?.symbol ?? '',
            assetDecimals: v.asset?.decimals ?? 0,
          })),
          pagination: {
            rowCount: res.total,
          },
        };
      },
    ),
  getMinAndMaxBlockNumber: publicProcedure
    .input(z.nativeEnum(Chain))
    .output(
      z.object({
        min: z.number().describe('The minimum block number'),
        max: z.number().describe('The maximum block number'),
      }),
    )
    .query(async ({ ctx, input }) => {
      const res = await ctx.ch
        .selectFrom('mv_block_info')
        .select([
          (eb) => eb.fn<number>('min', ['block_number']).as('min'),
          (eb) => eb.fn<number>('max', ['block_number']).as('max'),
        ])
        .where('network', '=', input === Chain.CKB ? 'ckb' : 'btc')
        .executeTakeFirstOrThrow();

      return res;
    }),
});
