import { addressToScript, minimalCellCapacity } from '@ckb-lumos/lumos/helpers';
import { computeScriptHash } from '@ckb-lumos/lumos/utils';
import BigNumber from 'bignumber.js';
import { inArray } from 'drizzle-orm';
import { type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as R from 'remeda';
import { z } from 'zod';

import { NATIVE_ASSETS } from '~/constants';
import { addressConvert, remove0x } from '~/lib/address';
import { LUMOS_CONFIG } from '~/lib/constant';
import {
  query,
  queryAddressesAssets,
  queryAddressTx,
  queryAddressTxCount,
  queryTotalTxCount,
  queryTxAddresses,
  queryTxAssetChanges,
} from '~/server/api/clickhouse';
import { getLatestMarket, getLatestPrice } from '~/server/api/comm';
import * as zodHelper from '~/server/api/routers/zod-helper';
import { createTRPCRouter, publicProcedure } from '~/server/api/trpc';
import { getOrFillRecentDaysValue, tryCatchTRPC } from '~/server/api/utils';
import { clickhouse } from '~/server/clickhouse';
import { asserts } from '~/utils/asserts';
import { toHexNo0x } from '~/utils/bytes';
import { isUdt } from '~/utils/ckb';
import { dayjs } from '~/utils/utility';
import { decodeUdtData } from '~/utils/xudt';

import type * as schema from '../../db/schema';
import { zodAddress } from './zod-helper';

export type HistoryAsset = {
  date: string;
  value: string;
};

type HistoryTransactionCount = {
  month: string;
  count: number;
};

type AddressOverview = {
  received: string;
  sent: string;
  volume: string;
  transactions: number;
};

export const addressRouter = createTRPCRouter({
  historyAsset: publicProcedure
    .meta({ openapi: { path: '/address/history-asset', method: 'GET' } })
    .input(
      z.object({
        address: zodAddress,
        recentDays: z.number().min(1).max(12).default(7),
      }),
    )
    .output(
      z
        .array(
          z
            .object({
              date: z
                .string()
                .regex(/^\d{4}-\d{2}-\d{2}$/)
                .describe('ISO format date string (YYYY-MM-DD)'),
              value: z.string().describe('Total asset value in USD'),
            })
            .describe('Historical asset value for a specific date'),
        )
        .describe('Array of daily asset values'),
    )
    .query(async ({ ctx, input }): Promise<HistoryAsset[]> => {
      const address = toHexNo0x(addressConvert.toCH(input.address));
      const addressAssetValues = await query<{ date: string; assetId: string; cumulativeValue: string }>({
        query: `
        SELECT *
          FROM
          (
              SELECT
                  lower(concat('0x', hex(asset_id))) AS assetId,
                  toDate(toTimeZone(timestamp, 'UTC')) AS date,
                  sum(if(from_or_to = 'from', -toInt256(value), toInt256(value))) AS dailyValue,
                  sum(dailyValue) OVER (PARTITION BY asset_id, address ORDER BY date ASC) AS cumulativeValue,
                  row_number() OVER (PARTITION BY asset_id, address ORDER BY date DESC) AS rn
              FROM tx_asset_detail
              WHERE tx_asset_detail.address = unhex({address: String})
              GROUP BY
                  asset_id,
                  address,
                  date
              ORDER BY date DESC
          )
          WHERE (rn <=${input.recentDays}) OR (date >= subtractDays(now(), ${input.recentDays}));
        `,
        query_params: {
          address,
        },
      });
      const recentDays = R.pipe(
        R.range(0, input.recentDays),
        R.map((i) => dayjs.utc().subtract(i, 'day').format('YYYY-MM-DD')),
      );
      const addressAssetValuesRecent = getOrFillRecentDaysValue(addressAssetValues, recentDays);
      if (!addressAssetValuesRecent.length && addressAssetValues.length) {
        return recentDays.map((date) => ({
          date,
          value: '0',
        }));
      }
      const assetIdWithTime = addressAssetValuesRecent.map((v) => ({
        assetId: v.assetId,
        timestamp: dayjs.utc(v.date).toDate(),
      }));
      const calculator = await ctx.marketService.createCalculator(assetIdWithTime);
      return R.pipe(
        addressAssetValuesRecent,
        R.groupBy(R.prop('date')),
        R.mapValues((v, date) => ({
          date,
          value: v
            .reduce(
              (pre, cur) =>
                pre.plus(
                  calculator.getVolume({
                    assetId: cur.assetId,
                    timestamp: dayjs.utc(cur.date).toDate(),
                    value: cur.cumulativeValue,
                  }),
                ),
              BigNumber(0),
            )
            .toString(),
        })),
        R.values(),
      );
    }),
  historyTransactionCount: publicProcedure
    .meta({ openapi: { path: '/address/history-transaction-count', method: 'GET' } })
    .input(
      z.object({
        address: zodAddress,
        recentMonths: z.number().min(1).max(12).default(12),
      }),
    )
    .output(
      z.array(
        z.object({
          month: z.string(),
          count: z.number(),
        }),
      ),
    )
    .query(async ({ input }): Promise<HistoryTransactionCount[]> => {
      const formatedAddress = toHexNo0x(addressConvert.toCH(input.address));

      const data = await queryAddressTxCount([formatedAddress], input.recentMonths);
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
  overview: publicProcedure
    .meta({ openapi: { path: '/address/overview', method: 'GET' } })
    .input(
      z.object({
        address: zodAddress,
      }),
    )
    .output(
      z
        .object({
          received: z.string().describe('Total amount received in base units'),
          sent: z.string().describe('Total amount sent in base units'),
          volume: z.string().describe('Total transaction volume in base units'),
          transactions: z.number().int().nonnegative().describe('Total number of transactions'),
        })
        .describe('Overview statistics for an address'),
    )
    .query(async ({ input }): Promise<AddressOverview> => {
      const formatedAddress = toHexNo0x(addressConvert.toCH(input.address));

      const query = `
        SELECT 
            SUM(CASE WHEN from_or_to = 'from' THEN toFloat64(volume) ELSE 0 END) AS sent,
            SUM(CASE WHEN from_or_to = 'to' THEN toFloat64(volume) ELSE 0 END) AS received,
            COUNT(DISTINCT tx_hash) AS transactions
        FROM tx_asset_detail
        WHERE address = unhex({address:String})
    `;

      const result = await clickhouse.query({
        query,
        query_params: { address: formatedAddress },
        format: 'JSON',
      });

      const { data } = await result.json<{ sent: string; received: string; transactions: number }>();

      const overview = data[0] ?? {
        received: '0',
        sent: '0',
        transactions: 0,
      };
      return {
        sent: BigNumber(overview.sent).toFixed(2).toString(),
        received: BigNumber(overview.received).toFixed(2).toString(),
        transactions: Number(overview.transactions),
        volume: BigNumber(overview.sent).plus(overview.received).toFixed(2).toString(),
      };
    }),
  liveCells: publicProcedure
    .meta({ openapi: { path: '/address/live-cells', method: 'GET' } })
    .input(
      z.object({
        address: zodAddress,
        pageSize: z.number().default(100),
        cursor: z.string().optional(),
      }),
    )
    .output(
      z
        .object({
          data: z
            .array(
              z.object({
                token: z.string().describe('Token symbol or script hash'),
                tokenInfo: zodHelper.asset
                  .or(
                    z.object({
                      id: z.string().describe('Unique identifier for the token'),
                      decimals: z.number().nullable().describe('Number of decimal places for the token'),
                      symbol: z.string().nullable().describe('Short symbol/ticker for the token'),
                      icon: z.string().nullable().describe("URL to the token's icon image"),
                    }),
                  )
                  .nullable()
                  .describe('Token metadata information'),
                blockHeight: z.number().nonnegative().describe('Block height where this cell was created'),
                outPoint: z.string().describe('Transaction hash containing this cell'),
                amount: z.string().describe('Token amount formatted with decimals'),
                capacity: z.string().describe('Cell capacity in shannons'),
              }),
            )
            .describe('Array of live cells with token metadata'),
          hasNext: z.boolean().describe('Whether there are more results available'),
          lastCursor: z.string().describe('Cursor for fetching next page of results'),
        })
        .describe('Live cells owned by an address with pagination'),
    )
    .query(async ({ ctx, input }) => {
      const lockScript = addressToScript(input.address, {
        config: LUMOS_CONFIG,
      });

      const liveCells = await tryCatchTRPC(() =>
        ctx.dataSource.getCells(
          {
            script: lockScript,
            scriptType: 'lock',
            withData: true,
          },
          'asc',
          '0x' + input.pageSize.toString(16),
          input.cursor,
        ),
      );

      const assetsInfo = await ctx.db.query.assetInfo.findMany();
      const assetsInfoMap = R.mapToObj(assetsInfo, (info) => [
        info.id,
        {
          id: info.id,
          decimals: info.decimals,
          symbol: info.symbol,
          icon: info.icon,
        },
      ]);

      const xudts = R.pipe(
        liveCells.objects,
        R.filter((cell) => !!cell.output.type && isUdt(cell.output.type)),
        R.map((cell) => {
          const scriptHash = computeScriptHash(cell.output.type!);
          const asset = assetsInfoMap[scriptHash];

          return {
            token: asset?.symbol ?? scriptHash,
            tokenInfo: asset ?? null,
            blockHeight: Number(cell.blockNumber),
            // FIXME: named out point but returns tx hash
            outPoint: cell.outPoint.txHash,
            amount: BigNumber(decodeUdtData(cell.outputData).toString())
              .div(Math.pow(10, asset?.decimals ?? 0))
              .toFixed(2)
              .toString(),
            capacity: cell.output.capacity,
          };
        }),
      );

      const ckbAsset = assetsInfoMap[NATIVE_ASSETS.CKB];
      const ckbCells = R.pipe(
        liveCells.objects,
        R.filter((cell) => !cell.output.type || !isUdt(cell.output.type)),
        R.map((cell) => ({
          token: 'CKB',
          tokenInfo: ckbAsset
            ? {
                id: ckbAsset.id,
                symbol: ckbAsset.symbol ?? 'CKB',
                decimals: ckbAsset.decimals ?? 0,
                icon: null,
              }
            : null,
          blockHeight: Number(cell.blockNumber),
          outPoint: cell.outPoint.txHash,
          amount: BigNumber(cell.output.capacity).div(Math.pow(10, 8)).toFixed(2).toString(),
          capacity: cell.output.capacity,
        })),
      );

      return {
        data: R.concat(ckbCells, xudts),
        hasNext: !(liveCells.objects.length < input.pageSize),
        lastCursor: liveCells.lastCursor,
      };
    }),
  transactions: publicProcedure
    .meta({ openapi: { path: '/address/transactions', method: 'GET' } })
    .input(
      z.object({
        address: zodAddress,
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
      const formatedAddress = addressConvert.toCH(
        input.address,
        (input.chain?.toLowerCase() as 'ckb' | 'btc' | undefined) ?? undefined,
      );
      const { orderKey, order } = input;

      const txCounts = await queryTotalTxCount({
        addresses: [toHexNo0x(formatedAddress)],
        asset: input.asset,
        network: input.chain?.toLowerCase() as 'ckb' | 'btc' | undefined,
      });

      const addressTxs = await queryAddressTx({
        addresses: [toHexNo0x(formatedAddress)],
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
  getProtocals: publicProcedure
    .input(
      z.object({
        address: zodAddress,
      }),
    )
    .output(
      z.array(
        z.object({
          value: z.string().describe('Total value in USD'),
          depositVolume: z.string().describe('Initial deposit amount in USD'),
          compensationVolume: z.string().describe('Compensation amount in USD'),
          type: z.string().describe("Type of protocol (e.g. 'NervosDAO')"),
          key: z.string().describe('Unique identifier for the protocol'),
          deposit: z.string().describe('Initial deposit amount in CKB'),
          depositTimestamp: z.date().nullable().describe('Timestamp when deposit was made'),
          compensation: z.string().describe('Compensation amount in CKB'),
        }),
      ),
    )
    .query(async ({ ctx, input }) => {
      const lockScript = addressToScript(input.address, {
        config: LUMOS_CONFIG,
      });

      const tip = await ctx.dataSource.getLastBlockInfo();
      asserts(tip);
      const priceMap = await getLatestPrice(NATIVE_ASSETS.CKB);
      const nervosDaoCells = await ctx.dataSource.getCells(
        {
          script: lockScript,
          scriptType: 'lock',
          filter: {
            script: {
              codeHash: LUMOS_CONFIG.SCRIPTS.DAO.CODE_HASH,
              hashType: LUMOS_CONFIG.SCRIPTS.DAO.HASH_TYPE,
              args: '0x',
            },
          },
        },
        'asc',
        '0x64',
      );

      const depositCells = nervosDaoCells.objects.filter((cell) => cell.outputData === '0x0000000000000000');
      const withdrawingCells = nervosDaoCells.objects.filter((cell) => cell.outputData !== '0x0000000000000000');

      const withdrawingTxHashes = R.pipe(
        withdrawingCells,
        R.map((cell) => ({ ...cell, outpointTxHash: cell.outPoint.txHash })),
        R.groupBy(R.prop('outpointTxHash')),
        R.keys(),
      );

      const withdrawingTxMap = await ctx.dataSource.batchGetTransation(withdrawingTxHashes);

      const withdrawnCells = R.pipe(
        withdrawingCells,
        R.map((cell) => ({
          ...cell,
          depositOutpoint: withdrawingTxMap[cell.outPoint.txHash]!.inputs[Number(cell.outPoint.index)]!.previousOutput,
          withdrawingOutpoint: cell.outPoint,
        })),
      );

      const maximumWithdrawMap = await ctx.dataSource.batchCalculateDaoMaximumWithdraw([
        ...depositCells.map((cell) => ({ outPoint: cell.outPoint, kind: tip.blockHash })),
        ...withdrawnCells.map((c) => ({ outPoint: c.depositOutpoint, kind: c.withdrawingOutpoint })),
      ]);

      const depositCellTxhashes = depositCells.map((cell) => cell.outPoint.txHash);

      const depositCellTxs = await ctx.db.query.tx.findMany({
        where: (tx) => inArray(tx.hash, depositCellTxhashes),
      });
      const depositCellTxMap = R.mapToObj(depositCellTxs, (tx) => [tx.hash, tx]);

      return R.pipe(
        depositCells,
        R.map((cell) => ({
          ...cell,
          depositOutpoint: cell.outPoint,
        })),
        R.concat(withdrawnCells),
        R.map((cell) => ({
          ...cell,
          occupied: minimalCellCapacity({ cellOutput: cell.output, data: cell.outputData ?? '' }),
          maximumWithdraw:
            maximumWithdrawMap[`${cell.depositOutpoint.txHash}:${Number(cell.depositOutpoint.index)}`] ??
            BigInt(cell.output.capacity).toString(),
        })),
        R.map((cell) => ({
          type: 'nervos_dao',
          key: `${cell.depositOutpoint.txHash}:${Number(cell.depositOutpoint.index)}`,
          deposit: (BigInt(cell.output.capacity) - cell.occupied).toString(),
          depositTimestamp: depositCellTxMap[cell.outPoint.txHash]?.committedTime,
          compensation: (BigInt(cell.maximumWithdraw) - BigInt(cell.output.capacity)).toString(),
        })),
        R.map((cell) => ({
          ...cell,
          depositTimestamp: cell.depositTimestamp ?? null,
          value: BigNumber(cell.deposit)
            .plus(cell.compensation)
            .div(Math.pow(10, 8))
            .multipliedBy(priceMap[NATIVE_ASSETS.CKB] ?? 0)
            .toFixed(2)
            .toString(),
          depositVolume: BigNumber(cell.deposit)
            .div(Math.pow(10, 8))
            .multipliedBy(priceMap[NATIVE_ASSETS.CKB] ?? 0)
            .toFixed(2)
            .toString(),
          compensationVolume: BigNumber(cell.compensation)
            .div(Math.pow(10, 8))
            .multipliedBy(priceMap[NATIVE_ASSETS.CKB] ?? 0)
            .toFixed(2)
            .toString(),
        })),
      );
    }),
  getAddressAssetsIncludeZeroValue: publicProcedure
    .input(zodAddress)
    .output(
      z.array(
        z.object({
          assetId: z.string(),
          assetInfo: zodHelper.asset.nullable(),
          assetAmount: z.string(),
          percentChange24h: z.number(),
          value: z.string().nullable(),
        }),
      ),
    )
    .query(async ({ ctx, input }) => {
      return getAddressAssets([input], ctx.db);
    }),
  getAddressAssets: publicProcedure
    .input(zodAddress)
    .output(
      z.array(
        z.object({
          assetId: z.string(),
          assetInfo: zodHelper.asset.nullable(),
          assetAmount: z.string(),
          percentChange24h: z.number(),
          value: z.string().nullable(),
        }),
      ),
    )
    .query(async ({ ctx, input }) => {
      const res = await getAddressAssets([input], ctx.db);
      return res.filter((v) => v.assetAmount !== '0.00');
    }),
  getAddressFirstTx: publicProcedure
    .input(zodAddress)
    .output(
      z
        .object({
          txHash: z.string(),
          time: z.date(),
          network: z.string(),
          blockNumber: z.number(),
          assets: z.array(zodHelper.asset.deepPartial().nullable()),
        })
        .optional(),
    )
    .query(async ({ input, ctx }) => {
      const formatedAddress = addressConvert.toCH(input);
      const query = `
          SELECT 
              lower(concat('0x', hex(tx_hash))) as txHash,
              min(${timestamp()}) AS timestamp,
              any(network) AS network,
              any(block_number) AS blockNumber,
              arrayDistinct(groupArray(concat('0x', hex(asset_id)))) AS assets
          FROM tx_asset_detail
          WHERE 
              address = unhex({address:String})
          GROUP BY txHash
          ORDER BY timestamp ASC
          LIMIT 1;
      `;

      const result = await clickhouse.query({
        query,
        query_params: {
          address: remove0x(formatedAddress),
        },
        format: 'JSON',
      });

      const { data } = await result.json<{
        assets: string[];
        txHash: string;
        timestamp: number;
        network: string;
        blockNumber: number;
      }>();

      const firstTx = data[0];

      if (!firstTx) return undefined;

      const assetInfos = await ctx.db.query.assetInfo.findMany({
        where: (table) => inArray(table.id, firstTx.assets),
      });

      const assetInfoMap = R.mapToObj(assetInfos, (info) => [
        info.id,
        { ...info, totalSupply: info.totalSupply?.toString() ?? '0' },
      ]);

      return {
        txHash: firstTx.txHash,
        time: new Date(+firstTx.timestamp),
        network: firstTx.network,
        blockNumber: firstTx.blockNumber,
        assets: firstTx.assets.map((id) => assetInfoMap[id] ?? null),
      };
    }),
});

function timestamp(columnNameWithDateTimeType = 'timestamp') {
  return `toUnixTimestamp(${columnNameWithDateTimeType}) * 1000`;
}

async function getAddressAssets(addresses: string[], db: PostgresJsDatabase<typeof schema>) {
  const result = await queryAddressesAssets(addresses);
  const relatedAssetIds = result.map((d) => d.assetId);
  const assetInfos = await db.query.assetInfo.findMany({
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
    .sort((a, b) => (a.value === null ? 1 : b.value === null ? -1 : BigNumber(a.value).lte(b.value) ? 1 : -1));
}
