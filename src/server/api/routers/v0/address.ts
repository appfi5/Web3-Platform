import { blockchain } from '@ckb-lumos/lumos/codec';
import { addressToScript, minimalCellCapacity } from '@ckb-lumos/lumos/helpers';
import { computeScriptHash } from '@ckb-lumos/lumos/utils';
import BigNumber from 'bignumber.js';
import { inArray } from 'drizzle-orm';
import { type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as R from 'remeda';
import { z } from 'zod';

import { NATIVE_ASSETS } from '~/constants';
import { addressConvert } from '~/lib/address';
import { LUMOS_CONFIG } from '~/lib/constant';
import {
  query,
  queryAddressesAssets,
  queryAddressTx,
  queryAddressTxCount,
  queryTimestampByBlockNumber,
  queryTimestampByTxHash,
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

import type * as schema from '../../../db/schema';
import { network, paginationInput, wrapPaginationOutput, zodAddress, zodCKBAddress } from '../zod-helper';
import { addressInput, assetIdInput } from '../zod-helper/basic';
import { createOrderByInput } from '../zod-helper/orderby';

const EMPTY_DATA = '0x0000000000000000';

export const addressRouter = createTRPCRouter({
  dailyUsdSnapshot: publicProcedure
    .meta({ openapi: { path: '/v0/addresses/{address}/daily-usd-snapshot', method: 'GET' } })
    .input(
      z.object({
        address: addressInput,
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
              amountUsd: z.string().describe('Total asset value in USD'),
            })
            .describe('Historical asset value for a specific date'),
        )
        .describe('Array of daily asset values'),
    )
    .query(async ({ ctx, input }) => {
      const { address } = input;
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
          address: toHexNo0x(address),
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
          amountUsd: '0',
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
          amountUsd: v
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
  transactionCountSnapshot: publicProcedure
    .meta({ openapi: { path: '/v0/addresses/{address}/transaction-count-snapshot', method: 'GET' } })
    .input(
      z.object({
        address: addressInput,
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
    .query(async ({ input }) => {
      const { address: formatedAddress } = input;

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
  metrics: publicProcedure
    .meta({ openapi: { path: '/v0/addresses/{address}/metrics', method: 'GET' } })
    .input(
      z.object({
        address: addressInput,
      }),
    )
    .output(
      z
        .object({
          receivedUsd: z.string().describe('Total amount received USD'),
          sentUsd: z.string().describe('Total amount sent USD'),
          volume: z.string().describe('Total transaction volume in base units'),
          txCounts: z.number().int().nonnegative().describe('Total number of transactions'),
        })
        .describe('Overview statistics for an address'),
    )
    .query(async ({ input }) => {
      const { address: formatedAddress } = input;

      const query = `
        SELECT 
            SUM(CASE WHEN from_or_to = 'from' THEN toFloat64(volume) ELSE 0 END) AS sent,
            SUM(CASE WHEN from_or_to = 'to' THEN toFloat64(volume) ELSE 0 END) AS received,
            COUNT(DISTINCT tx_hash) AS txCounts
        FROM tx_asset_detail
        WHERE address = unhex({address:String})
    `;

      const result = await clickhouse.query({
        query,
        query_params: { address: toHexNo0x(formatedAddress) },
        format: 'JSON',
      });

      const { data } = await result.json<{ sent: string; received: string; txCounts: number }>();

      const overview = data[0] ?? {
        received: '0',
        sent: '0',
        txCounts: 0,
      };
      return {
        sentUsd: BigNumber(overview.sent).toFixed(2).toString(),
        receivedUsd: BigNumber(overview.received).toFixed(2).toString(),
        txCounts: Number(overview.txCounts),
        volume: BigNumber(overview.sent).plus(overview.received).toFixed(2).toString(),
      };
    }),
  utxos: publicProcedure
    .meta({ openapi: { path: '/v0/addresses/{address}/utxos', method: 'GET' } })
    .input(
      z.object({
        address: zodCKBAddress,
        pageSize: z.number().min(1).max(1000).default(100),
        cursor: z.string().optional(),
      }),
    )
    .output(
      z
        .object({
          result: z
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
        result: R.concat(ckbCells, xudts),
        hasNext: !(liveCells.objects.length < input.pageSize),
        lastCursor: liveCells.lastCursor,
      };
    }),
  transactions: publicProcedure
    .meta({ openapi: { path: '/v0/addresses/{address}/transactions', method: 'GET' } })
    .input(
      z
        .object({
          address: addressInput,
          network: network.optional(),
          assetId: assetIdInput.optional(),
        })
        .merge(paginationInput)
        .merge(createOrderByInput(['asset', 'change', 'time'])),
    )
    .output(
      wrapPaginationOutput(
        z.object({
          txHash: z.string(),
          time: z.date(),
          network: network.openapi({ type: 'string' }),
          blockNumber: z.number(),
          changes: z.array(
            z.object({
              assetId: z.string(),
              amountUsd: z.number(),
              amount: z.string(),
            }),
          ),
          fromAddresses: z.array(z.string()),
          toAddresses: z.array(z.string()),
          assets: z.array(zodHelper.asset),
        }),
      ),
    )
    .query(async ({ ctx, input }) => {
      const { address: formatedAddress, orderKey, orderDirection, network } = input;

      const txCounts = await queryTotalTxCount({
        addresses: [toHexNo0x(formatedAddress)],
        asset: input.assetId,
        network: input.network,
      });

      const addressTxs = await queryAddressTx({
        addresses: [toHexNo0x(formatedAddress)],
        asset: input.assetId,
        network,
        orderKey: orderKey ?? 'time',
        order: orderDirection ?? 'desc',
        page: input.page,
        pageSize: input.pageSize,
      });

      if (!addressTxs.length) {
        return {
          result: [],
          total: 0,
        };
      }
      const txAssetChanges = await queryTxAssetChanges(addressTxs.map((tx) => tx.txHash));
      const changes: Record<string, Record<string, { assetId: string; amountUsd: number; amount: string }[]>> = R.pipe(
        txAssetChanges,
        R.filter((c) => !BigNumber(c.amount).isZero()),
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

      const result = R.pipe(
        addressTxs,
        R.map((tx) => {
          return {
            txHash: tx.txHash,
            time: new Date(Number(tx.timestamp)),
            network: tx.network ?? 'ckb',
            blockNumber: Number(tx.blockNumber),
            changes: changes?.[tx.txHash]?.[tx.address] ?? [],
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
        result,
        total: txCounts,
      };
    }),
  protocals: publicProcedure
    .meta({ openapi: { path: '/v0/addresses/{address}/protocals', method: 'GET' } })
    .input(
      z.object({
        address: zodCKBAddress,
      }),
    )
    .output(
      z.array(
        z.object({
          amountUsd: z.string().describe('Total value in USD'),
          depositVolume: z.string().describe('Initial deposit amount in USD'),
          compensationVolume: z.string().describe('Compensation amount in USD'),
          type: z.string().describe("Type of protocol (e.g. 'NervosDAO')"),
          key: z.string().describe('Unique identifier for the protocol'),
          deposit: z.string().describe('Initial deposit amount in CKB'),
          depositTimestamp: z.number().nullable().describe('Timestamp when deposit was made'),
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
      const fetchAllNervosDaoCells = async () => {
        let lastCursor = '';
        const result = [];

        while (lastCursor !== '0x') {
          const res = await ctx.dataSource.getCells(
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
            lastCursor === '' ? undefined : lastCursor,
          );
          result.push(...res.objects);
          lastCursor = res.lastCursor;
        }

        return result;
      };

      const nervosDaoCells = await fetchAllNervosDaoCells();
      const depositCells = nervosDaoCells.filter((cell) => cell.outputData === EMPTY_DATA);
      const withdrawingCells = nervosDaoCells.filter((cell) => cell.outputData !== EMPTY_DATA);

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
      const depositCellTimestamps = await queryTimestampByTxHash(depositCellTxhashes);

      const withdrawnCellBlockNumbers = withdrawnCells.map((cell) => ({
        txHash: cell.outPoint.txHash,
        blockNumber: blockchain.Uint64.unpack(cell.outputData ?? '0x00').toNumber(),
      }));

      const blockNumberTimestampMap = R.mapToObj(
        await queryTimestampByBlockNumber(withdrawnCellBlockNumbers.map((c) => c.blockNumber)),
        (tx) => [tx.blockNumber, tx.timestamp],
      );

      const withdrawnCellTimestamps = withdrawnCellBlockNumbers.map((cell) => ({
        txHash: cell.txHash,
        timestamp: blockNumberTimestampMap[cell.blockNumber],
      }));

      const depositTimestampMap = R.mapToObj([...depositCellTimestamps, ...withdrawnCellTimestamps], (tx) => [
        tx.txHash,
        tx.timestamp ? parseInt(tx.timestamp) * 1000 : null,
      ]);

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
          deposit: BigInt(cell.output.capacity).toString(),
          depositTimestamp: depositTimestampMap[cell.outPoint.txHash] ?? null,
          compensation: (BigInt(cell.maximumWithdraw) - BigInt(cell.output.capacity)).toString(),
          maximumWithdraw: cell.maximumWithdraw.toString(),
        })),
        R.map((cell) => ({
          ...cell,
          amountUsd: BigNumber(cell.maximumWithdraw)
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
        R.sort((a, b) => (b.depositTimestamp ?? -1) - (a.depositTimestamp ?? -1)),
      );
    }),
  assets: publicProcedure
    .meta({ openapi: { path: '/v0/addresses/{address}/assets', method: 'GET' } })
    .input(
      z.object({
        address: zodAddress,
      }),
    )
    .output(
      z.array(
        z.object({
          assetId: z.string(),
          assetInfo: zodHelper.asset.nullable(),
          assetAmount: z.string(),
          percentChange24h: z.number(),
          amountUsd: z.string().nullable(),
        }),
      ),
    )
    .query(async ({ ctx, input }) => {
      return getAddressAssets([input.address], ctx.db);
    }),
});

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
      amountUsd: marketMap[asset.assetId]?.price
        ? BigNumber(asset.balance)
            .div(Math.pow(10, assetInfoMap[asset.assetId]?.decimals ?? 0))
            .multipliedBy(marketMap[asset.assetId]?.price ?? 0)
            .toFixed(2)
            .toString()
        : null,
    }))
    .sort((a, b) =>
      a.amountUsd === null ? 1 : b.amountUsd === null ? -1 : BigNumber(a.amountUsd).lte(b.amountUsd) ? 1 : -1,
    );
}
