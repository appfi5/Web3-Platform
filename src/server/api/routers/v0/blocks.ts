import { eq, inArray } from 'drizzle-orm';
import { z } from 'zod';

import { createHelper, type Database } from '~/server/ch';
import { assetTag, assetToTag } from '~/server/db/schema';

import { BlockController } from '../../controllers/block.controller';
import { paginationInput, wrapPaginationOutput } from '../../routers/zod-helper/pagination';
import { createTRPCRouter, publicProcedure } from '../../trpc';
import { assetBase, blockRaw, detail, networkInput } from '../zod-helper';
import {
  addressInput,
  addressInputOptional,
  assetIdInput,
  assetIdOutput,
  blockHashInput,
  dateOutput,
  hashOutput,
  txHashInputOptional,
  zNumber,
  zodStringArray,
} from '../zod-helper/basic';
import { createOrderByInput } from '../zod-helper/orderby';

export const blocksRouter = createTRPCRouter({
  raw: publicProcedure
    .meta({ openapi: { path: '/v0/blocks/{network}/{blockHash}/raw', method: 'GET' } })
    .input(z.object({ blockHash: blockHashInput }).merge(networkInput))
    .output(blockRaw.nullable())
    // block.getOriginalBlockInfo
    .query(async ({ ctx, input }) => BlockController.getInstance(ctx.db).getOriginalBlockInfo(input)),
  uniqTags: publicProcedure
    .meta({ openapi: { path: '/v0/blocks/{network}/{blockNumber}/uniq-tags', method: 'GET' } })
    .input(z.object({ blockNumber: z.number() }).merge(networkInput))
    .output(
      z.array(
        z.object({
          label: z.string().describe('The label of the tag'),
          style: z.string().nullable().describe('The style of the tag'),
        }),
      ),
    )
    // block.getTagsByBlockNumber
    .query(async ({ ctx, input }) => {
      const { hex } = createHelper<Database, 'tx_action'>();
      const blockAssetIds = await ctx.ch
        .selectFrom('tx_action')
        .select([hex('asset_id', 'assetId')])
        .where('block_number', '=', input.blockNumber)
        .where('network', '=', input.network)
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
  uniqAssets: publicProcedure
    .meta({ openapi: { path: '/v0/blocks/{blockHash}/uniq-assets', method: 'GET' } })
    .input(
      z.object({
        blockHash: blockHashInput,
      }),
    )
    .output(
      z.array(
        z.object({
          assetId: assetIdOutput.describe('Unique identifier for the asset'),
          name: z.string().nullable().describe('Full name of the asset (e.g. "Bitcoin")'),
          icon: z.string().nullable().describe('URL to the asset icon image'),
          symbol: z.string().nullable().describe('Trading symbol of the asset (e.g. "BTC")'),
        }),
      ),
    )
    .query(async ({ ctx, input }) => (await BlockController.getInstance(ctx.db).getAssetList(input)).data),
  latest: publicProcedure
    .meta({ openapi: { path: '/v0/blocks/{network}/latest', method: 'GET' } })
    .input(networkInput)
    .output(
      z.object({
        height: z.number(),
        time: dateOutput,
      }),
    )
    // block.getBestBlockNumber
    .query(async ({ ctx, input }) => {
      const res = await ctx.ch
        .selectFrom('mv_block_info')
        .select([(eb) => eb.fn<number>('max', ['block_number']).as('max')])
        .where('network', '=', input.network)
        .executeTakeFirstOrThrow();
      const blockTime = await ctx.ch
        .selectFrom('tx_asset_detail')
        .select('timestamp')
        .where('block_number', '=', res.max)
        .where('network', '=', input.network)
        .executeTakeFirstOrThrow();

      return {
        height: res.max,
        time: blockTime.timestamp,
      };
    }),
  txs: publicProcedure
    .meta({ openapi: { path: '/v0/blocks/{blockHash}/txs', method: 'GET' } })
    .input(
      z
        .object({
          blockHash: blockHashInput,
          from: addressInputOptional,
          to: addressInputOptional,
          addressFilterOperator: z.enum(['or', 'and']).default('and'),
          txHash: txHashInputOptional,
        })
        .merge(createOrderByInput(['volume']))
        .merge(paginationInput),
    )
    .output(
      wrapPaginationOutput(
        z.object({
          hash: hashOutput.describe('Transaction hash'),
          txIndex: z.number().describe('Transaction index in the block'),
          amount: z.string().describe('Raw transaction amount in base units'),
          amountUsd: z.string().describe('Transaction amount in USD'),
          from: z.string().describe('Main sender address of the transaction'),
          fromCount: z.number().describe('Total number of senders'),
          to: z.string().describe('Main receiver address of the transaction'),
          toCount: z.number().describe('Total number of receivers'),
          asset: assetBase.optional(),
        }),
      ),
    )
    // block.getTransactionList
    .query(({ ctx, input }) => BlockController.getInstance(ctx.db).getTransactionList(input)),
  addressChangeList: publicProcedure
    .meta({ openapi: { path: '/v0/blocks/{blockHash}/address-changes', method: 'GET' } })
    .input(
      z
        .object({
          blockHash: blockHashInput,
          address: addressInputOptional,
        })
        .merge(createOrderByInput(['volume'], 'desc'))
        .merge(paginationInput),
    )
    .output(
      wrapPaginationOutput(
        z.object({
          address: z.string().describe('The specific address'),
          amount: zNumber().describe('The total transaction amount in base units'),
          amountUsd: z.number().describe('The total transaction amount in USD'),
          sendTokens: z.number().describe('Asset change where this address is the sender'),
          receiveTokens: z.number().describe('Asset change where this address is the receiver'),
        }),
      ),
    )
    // block.getAddressChangeList
    .query(({ ctx, input }) => BlockController.getInstance(ctx.db).getAddressChangeList(input)),
  addressAssetChangeList: publicProcedure
    .meta({ openapi: { path: '/v0/blocks/{blockHash}/{address}/asset-changes', method: 'GET' } })
    .input(
      z
        .object({
          blockHash: blockHashInput,
          address: addressInput,
        })
        .merge(paginationInput),
    )
    .output(
      wrapPaginationOutput(
        z.object({
          amountSent: zNumber().describe('The total input amount for this asset'),
          amountReceived: zNumber().describe('The total output amount for this asset'),
          amountUsd: z.number().describe('The total transaction volume in USD'),
          asset: assetBase,
        }),
      ),
    )
    // block.getAddressTransferList
    .query(({ ctx, input }) => BlockController.getInstance(ctx.db).getAddressTransferChangeList(input)),
  assetChangeList: publicProcedure
    .meta({ openapi: { path: '/v0/blocks/{blockHash}/asset-changes', method: 'GET' } })
    .input(
      z
        .object({
          blockHash: blockHashInput,
          assetName: z.string().nullable().default(null),
          tags: zodStringArray.default([]),
        })
        .merge(createOrderByInput(['volume'], 'desc'))
        .merge(paginationInput),
    )
    .output(
      wrapPaginationOutput(
        z.object({
          amount: zNumber().describe('Raw amount of the asset in its smallest unit (e.g. satoshis for BTC)'),
          amountUsd: z.number().describe('Value of the asset transfer in USD'),
          asset: assetBase.optional().describe('Asset information'),
          tags: z
            .array(z.string())
            .describe('Array of category tags associated with this asset (e.g. ["DeFi", "Stablecoin"])'),
        }),
      ),
    )
    .query(({ ctx, input }) => BlockController.getInstance(ctx.db).getAssetChangeList(input)),
  assetTxAmountList: publicProcedure
    .meta({ openapi: { path: '/v0/blocks/{blockHash}/{assetId}/tx-amounts', method: 'GET' } })
    .input(
      z
        .object({
          blockHash: blockHashInput,
          assetId: assetIdInput,
        })
        .merge(paginationInput),
    )
    .output(
      wrapPaginationOutput(
        z.object({
          hash: hashOutput,
          amountUsd: z.number(),
          amount: zNumber(),
          asset: assetBase.optional(),
        }),
      ),
    )
    .query(({ ctx, input }) => BlockController.getInstance(ctx.db).getAssetTransferList(input)),
  // Since the detail endpoint has two path parameters which may cause conflicts with other routes, it should be placed last in the matching order.
  detail: publicProcedure
    .meta({ openapi: { path: '/v0/blocks/{network}/{hashOrHeight}', method: 'GET' } })
    .input(z.object({ hashOrHeight: z.string() }).merge(networkInput))
    .output(detail.nullable())
    // block.getBlockInfo
    .query(async ({ ctx, input }) => BlockController.getInstance(ctx.db).getBlockInfo(input)),
});
