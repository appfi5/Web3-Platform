import { type Script } from '@ckb-lumos/lumos';
import { computeScriptHash } from '@ckb-lumos/lumos/utils';
import BigNumber from 'bignumber.js';
import { eq, inArray, or } from 'drizzle-orm';
import * as R from 'remeda';
import { from, lastValueFrom, mergeMap, reduce } from 'rxjs';
import { z } from 'zod';

import { calculateChanges } from '~/aggregator/services/assets';
import { resloveTransactions } from '~/aggregator/services/transactions';
import { NATIVE_ASSETS } from '~/constants';
import { formatAddress } from '~/lib/address';
import { getLatestMarket } from '~/server/api/comm';
import { paginationSchema } from '~/server/api/routers/zod-helper';
import { lastestMarket } from '~/server/db/schema';
import { nonNullable } from '~/utils/asserts';
import { getCellType, isSpore, isUdt } from '~/utils/ckb';
import { unimplemented } from '~/utils/unimplemented';
import { scriptToAddress } from '~/utils/utility';
import { decodeUdtData } from '~/utils/xudt';

import { createTRPCRouter, publicProcedure } from '../../trpc';
import {
  zAssetId,
  zAssetInfo,
  zHash,
  zPaginationOutput,
  zRgbppAssetType,
  zRgbppNetwork,
  zStatsStatus,
  zValueInUsd,
} from './def';
import { ckbExplorerApiV1, ckbExplorerApiV2, commonHeader } from './utils';

type AssetInfo = z.infer<typeof zAssetInfo>;

export const rgbppRouter = createTRPCRouter({
  /**
   * List of the basic asset infomation, including details like name, symbol, icon, etc.
   */
  coinList: publicProcedure
    .input(
      z
        .object({
          sort: z
            .enum([
              'transactions.desc',
              'transactions.asc',
              'addresses_count.desc',
              'addresses_count.asc',
              'created_time.desc',
              'created_time.asc',
            ])
            .optional()
            .default('transactions.desc'),
        })
        .and(paginationSchema.optional().default({ page: 1, pageSize: 100 })),
    )
    .output(zPaginationOutput(zAssetInfo))
    .query(async ({ input }) => {
      const res = await ckbExplorerApiV1.GET('/xudts', {
        params: {
          header: commonHeader,
          query: { page: input.page, page_size: input.pageSize, sort: input.sort, union: true },
        },
      });

      const total = res.data?.meta?.total ?? 0;

      const ids = res.data?.data?.map((d) => d.attributes!.type_hash!) ?? [];

      const marketMap = await getLatestMarket(ids);

      const udtHolderAllocation = await Promise.all(
        ids.map(async (id) => ({
          id,
          allocation: await ckbExplorerApiV1.GET('/udts/{id}/holder_allocation', {
            params: {
              header: commonHeader,
              path: { id },
            },
          }),
        })),
      );

      const udtHolderAllocationMap = R.mapToObj(udtHolderAllocation, (u) => [u.id, u.allocation.data]);

      const data: AssetInfo[] =
        res.data?.data?.map((item) => {
          const id = item.attributes!.type_hash!;
          const market = marketMap[id];
          const holderCount = (() => {
            const result: AssetInfo['quote']['holderCount'] = [];
            const holder = udtHolderAllocationMap[id];

            if (holder?.btc_holder_count) {
              result.push({
                network: 'btc',
                count: holder?.btc_holder_count,
              });
            }

            if (holder?.lock_hashes) {
              result.push({
                network: 'ckb',
                count: holder?.lock_hashes.reduce((a, b) => a + b.holder_count, 0),
              });
            }

            return result;
          })();

          return {
            info: {
              id: item.attributes!.type_hash!,
              tags: item.attributes?.xudt_tags ?? [],
              name: item.attributes?.full_name ?? null,
              decimals: item.attributes?.decimal ? Number(item.attributes?.decimal) : null,
              icon: (item.attributes?.icon_file as string | null) ?? null,
              symbol: item.attributes?.symbol ?? null,
            },
            quote: {
              totalSupply: item.attributes?.total_amount ?? null,
              circulatingSupply: item.attributes?.total_amount ?? null,
              txCount24h: Number(item.attributes?.h24_ckb_transactions_count ?? 0),
              holderCount,
              price: market?.price ?? null,
              marketCap: market?.marketCap ?? null,
              volume24h: market?.volume24h ?? null,
              priceChange24h: market?.percentChange24h ?? null,

              fdv:
                !!item.attributes?.total_amount && !!market?.price
                  ? BigNumber(item.attributes?.total_amount ?? '0')
                      .div(10 ** Number(item.attributes?.decimal ?? '0'))
                      .times(market?.price ?? '0')
                      .toString()
                  : null,
            },
          };
        }) ?? [];

      return {
        data,
        pagination: { hasNext: total > input.page * input.pageSize, total },
      };
    }),

  transactionCountRecords: publicProcedure
    .output(z.array(z.object({ count: z.number(), network: zRgbppNetwork }).extend(zStatsStatus)))
    .query(async () => {
      const res = await ckbExplorerApiV2.GET('/rgb_assets_statistics');
      const data = res.data?.data;

      if (!data) {
        return [];
      }

      return data
        .filter(({ indicator }) => indicator === 'transactions_count')
        .map((item) => ({
          network: item.network === 'ckb' ? 'ckb' : item.network === 'btc' ? 'btc' : 'unknown',
          count: Number(item.value!),
          status: { timestamp: Number(item.created_at_unixtimestamp!) * 1000 },
        }));
    }),
  addressTransactions: publicProcedure
    .input(
      // FIXME: it should be merge({ pagination: paginationSchema }) but it's been used by external projects
      z.object({ address: z.string() }).and(paginationSchema),
    )
    .query(async ({ ctx, input }) => {
      const formatedAddress = formatAddress(input.address);

      const res = await ckbExplorerApiV1.GET('/address_transactions/{address}', {
        params: {
          header: commonHeader,
          path: { address: input.address },
          query: { page: input.page, page_size: input.pageSize },
        },
      });

      const addressTxs = (res.data?.data ?? []).map((i) => i.attributes).filter((i) => !!i);

      const txs = await resloveTransactions(
        ctx.dataSource,
        addressTxs.map((tx) => tx.transaction_hash!),
      );

      const assetMaps = R.pipe(
        txs,
        R.map((tx) => ({
          hash: tx.hash,
          assets: R.pipe(
            tx.inputs,
            R.concat(tx.outputs),
            R.flatMap((cell) => {
              const results = [];

              if (cell.cellOutput.type && isUdt(cell.cellOutput.type)) {
                results.push(computeScriptHash(cell.cellOutput.type));
              }

              if (cell.cellOutput.type && isSpore(cell.cellOutput.type)) {
                results.push(cell.cellOutput.type.args);
              }

              return results;
            }),
            R.concat([NATIVE_ASSETS.CKB]),
            R.unique(),
          ),
        })),
        R.mapToObj((tx) => [tx.hash, tx.assets]),
      );

      const relatedAssetIds = R.pipe(
        Object.values(assetMaps),
        R.flatMap((key) => key),
        R.unique(),
      );

      const resolvedTxMap = R.pipe(
        txs,
        R.mapToObj((tx) => [tx.hash, tx]),
      );

      const assetInfos = await ctx.db.query.assetInfo.findMany({
        where: (table) => inArray(table.id, relatedAssetIds),
      });

      const assetInfoMap = R.mapToObj(assetInfos, (info) => [info.id, info]);
      const calculator = await ctx.marketService.createCalculator(
        addressTxs.flatMap((tx) =>
          (assetMaps[tx.transaction_hash!] ?? []).map((asset) => ({
            assetId: asset,
            timestamp: Number(tx.block_timestamp!),
          })),
        ),
      );

      const data = R.pipe(
        addressTxs,
        R.map((tx) => {
          const resolvedTx = resolvedTxMap[tx.transaction_hash!];
          const { inputs = [], outputs = [] } = resolvedTx ?? {};
          const changes = resolvedTx
            ? (calculateChanges({
                tx: { inputs, outputs },
                timestamp: Number(tx.block_timestamp!),
                getVolume: (options) => calculator.getVolume(options),
              })[formatedAddress] ?? [])
            : [];

          return {
            txHash: tx.transaction_hash!,
            time: tx.block_timestamp!,
            network: 'CKB',
            blockNumber: tx.block_number!,
            changes,
            fromAddresses: R.pipe(
              inputs,
              R.map((i) => scriptToAddress(i.cellOutput.lock)),
              R.unique(),
            ),
            toAddresses: R.pipe(
              outputs,
              R.map((i) => scriptToAddress(i.cellOutput.lock)),
              R.unique(),
            ),
            assets: (assetMaps[tx.transaction_hash!] ?? [])
              .map((asset) => assetInfoMap[asset])
              .filter((info) => info !== undefined),
          };
        }),
      );

      return {
        data,
        pagination: { page: input.page, pageSize: input.pageSize, rowCount: res.data?.meta?.total ?? 0 },
      };
    }),
  /**
   * A list of the number of RGB++ assets issued with the timestamp.
   */
  issueCountRecords: publicProcedure
    .output(z.array(z.object({ assetType: zRgbppAssetType, count: z.number() }).extend(zStatsStatus)))
    .query(async () => {
      const res = await ckbExplorerApiV2.GET('/rgb_assets_statistics');
      const data = res.data?.data;

      if (!data) {
        return [];
      }

      return data
        .filter((item) => item.indicator === 'ft_count' || item.indicator === 'dob_count')
        .map((item) => ({
          assetType: item.indicator === 'ft_count' ? 'xudt' : 'dob',
          count: Number(item.value),
          status: { timestamp: Number(item.created_at_unixtimestamp) * 1000 },
        }));
    }),

  /**
   * A list of the holder count of RGB++ assets with the timestamp.
   */
  holderCountRecords: publicProcedure
    .output(z.array(z.object({ count: z.number(), network: zRgbppNetwork }).extend(zStatsStatus)))
    .query(async () => {
      const res = await ckbExplorerApiV2.GET('/rgb_assets_statistics');
      const data = res.data?.data;

      if (!data) {
        return [];
      }

      return data
        .filter((item) => item.indicator === 'holders_count')
        .map((item) => ({
          network: item.network === 'ckb' ? 'ckb' : item.network === 'btc' ? 'btc' : unimplemented(),
          count: Number(item.value!),
          status: { timestamp: Number(item.created_at_unixtimestamp) * 1000 },
        }));
    }),

  /**
   * The entire market cap of RGB++ assets
   */
  marketCap: publicProcedure.output(z.object({ value: zValueInUsd }).extend(zStatsStatus)).query(async ({ ctx }) => {
    const prices = await ctx.db
      .select({
        assetId: lastestMarket.assetId,
        price: lastestMarket.price,
        createdAt: lastestMarket.createdAt,
        updatedAt: lastestMarket.updatedAt,
      })
      .from(lastestMarket)
      .where(or(eq(lastestMarket.dataSource, 'utxoswap')));

    const priceMap = R.mapToObj(prices, (v) => [v.assetId, v.price]);
    const assetIds = prices.map((item) => item.assetId);

    const marketCap$ = from(assetIds).pipe(
      mergeMap(
        (assetId) =>
          ckbExplorerApiV1.GET('/xudts/{type_hash}', {
            params: { header: commonHeader, path: { type_hash: assetId } },
          }),
        10,
      ),
      reduce((acc, asset) => {
        if (!asset.data?.data?.attributes) {
          return acc;
        }

        const circulatingSupply = asset.data.data.attributes?.total_amount;
        if (!circulatingSupply) {
          return acc;
        }
        const price = priceMap[asset.data.data.attributes.type_hash!];
        if (!price) {
          return acc;
        }
        const decimals = Number(asset.data.data.attributes.decimal ?? 0);

        return BigNumber(circulatingSupply)
          .div(10 ** decimals)
          .times(Number(price))
          .plus(acc);
      }, BigNumber(0)),
    );

    const marketCap = await lastValueFrom(marketCap$);

    const timestamp = prices.reduce((acc, item) => {
      const time = +(item.updatedAt ?? item.createdAt);
      return time > acc ? time : acc;
    }, 0);

    return { status: { timestamp }, value: marketCap.toString() };
  }),

  /**
   * Basic asset infomation, including details like name, symbol, icon, etc.
   */
  info: publicProcedure
    .input(z.object({ assetId: zAssetId }))
    .output(zAssetInfo.nullable())
    .query(async ({ input }) => {
      const res = await ckbExplorerApiV1.GET('/xudts/{type_hash}', {
        params: {
          header: commonHeader,
          path: { type_hash: input.assetId },
        },
      });
      const asset = res.data?.data;

      if (!asset) return null;

      const id = asset.attributes!.type_hash!;
      const market = (await getLatestMarket(id))[id];

      const udtHolderAllocation = await ckbExplorerApiV1.GET('/udts/{id}/holder_allocation', {
        params: {
          header: commonHeader,
          path: { id },
        },
      });

      const holderCount = (() => {
        const result: AssetInfo['quote']['holderCount'] = [];
        const holder = udtHolderAllocation.data;

        if (holder?.btc_holder_count) {
          result.push({
            network: 'btc',
            count: holder?.btc_holder_count,
          });
        }

        if (holder?.lock_hashes) {
          result.push({
            network: 'ckb',
            count: holder?.lock_hashes.reduce((a, b) => a + b.holder_count, 0),
          });
        }

        return result;
      })();

      return {
        info: {
          id: nonNullable(asset.attributes?.type_hash),
          icon: (asset.attributes?.icon_file as string | null) ?? null,
          tags: asset.attributes?.xudt_tags ?? [],
          decimals: asset.attributes?.decimal ? Number(asset.attributes?.decimal) : null,
          name: asset.attributes?.full_name ?? null,
          symbol: asset.attributes?.symbol ?? null,
        },
        quote: {
          totalSupply: asset.attributes?.total_amount ?? null,
          circulatingSupply: asset.attributes?.total_amount ?? null,
          txCount24h: Number(asset.attributes?.h24_ckb_transactions_count ?? 0),
          holderCount,
          price: market?.price ?? null,
          marketCap: market?.marketCap ?? null,
          volume24h: market?.volume24h ?? null,
          priceChange24h: market?.percentChange24h ?? null,

          fdv:
            !!asset.attributes?.total_amount && !!market?.price
              ? BigNumber(asset.attributes?.total_amount ?? '0')
                  .div(10 ** Number(asset.attributes?.decimal ?? '0'))
                  .times(market?.price ?? '0')
                  .toString()
              : null,
        },
      };
    }),

  /**
   * The latest market data for the asset, including price(in USD), total/circulating supply, market cap, etc
   */
  quote: publicProcedure
    .input(z.object({ assetId: zAssetId }))
    .output(
      z
        .object({
          price: zValueInUsd.nullable(),
          priceChange24h: z.number().nullable(),
          totalSupply: z.string().nullable(),
          circulatingSupply: z.string().nullable(),
          marketCap: zValueInUsd.nullable(),
          fdv: zValueInUsd.nullable(),
          volume24h: zValueInUsd.nullable(),
          txCount24h: z.number(),
          holderCount: z.array(
            z.object({
              network: zRgbppNetwork,
              count: z.number(),
            }),
          ),
        })
        .nullable(),
    )
    .query(async ({ input, ctx }) => {
      const assetId = input.assetId;

      const explorerAsset = await ckbExplorerApiV1.GET('/xudts/{type_hash}', {
        params: {
          header: commonHeader,
          path: { type_hash: input.assetId },
        },
      });

      const udtStatistics = await ckbExplorerApiV2.GET('/udt_hourly_statistics/{type_hash}', {
        params: { path: { type_hash: assetId } },
      });

      const holderAllocationRes = await ckbExplorerApiV1.GET('/udts/{id}/holder_allocation', {
        params: { header: commonHeader, path: { id: assetId } },
      });

      if (!explorerAsset.data?.data) {
        return null;
      }

      const lastStatisticTimestamp: string | null = udtStatistics.data?.data
        ? (R.last(udtStatistics.data.data)?.created_at_unixtimestamp ?? null)
        : null;

      const marketData = await ctx.marketService.getLatestMarketData({ assetId });
      const calculatorTimestamp = Number(lastStatisticTimestamp) * 1000;
      const calculator = await ctx.marketService.createCalculator(
        [{ assetId, timestamp: Date.now() }].concat(
          lastStatisticTimestamp ? [{ assetId, timestamp: calculatorTimestamp }] : [],
        ),
      );

      const totalAmount = explorerAsset.data.data.attributes?.total_amount;
      const price = marketData?.price;

      return {
        price: marketData?.price ?? null,
        fdv:
          totalAmount != null && price != null
            ? calculator.getVolume({ assetId, value: totalAmount, timestamp: calculatorTimestamp })
            : null,
        marketCap:
          totalAmount != null && price != null
            ? calculator.getVolume({ assetId, value: totalAmount, timestamp: calculatorTimestamp })
            : null,
        holderCount: [
          { network: 'btc', count: holderAllocationRes.data?.btc_holder_count ?? 0 },
          {
            network: 'ckb',
            count: (holderAllocationRes.data?.lock_hashes ?? []).reduce((acc, item) => acc + item.holder_count, 0) ?? 0,
          },
        ],
        priceChange24h: marketData?.percentChange24h ?? null,
        totalSupply: marketData?.totalSupply
          ? formatAmount(marketData.totalSupply, explorerAsset.data.data.attributes?.decimal ?? 0)
          : null,
        circulatingSupply: totalAmount
          ? formatAmount(totalAmount, explorerAsset.data.data.attributes?.decimal ?? 0)
          : null,
        txCount24h: Number(explorerAsset.data.data.attributes?.h24_ckb_transactions_count ?? 0),
        volume24h: marketData?.volume24h ?? null,
      };
    }),

  /**
   * The holder list of the asset
   */
  topHolders: publicProcedure
    .input(z.object({ assetId: zAssetId }))
    .output(
      z
        .array(
          z.object({
            network: zRgbppNetwork,
            address: z.string(),
            amount: z.string(),
            value: zValueInUsd,
            percentage: z.number(),
          }),
        )
        .nullable(),
    )
    .query(async ({ input, ctx }) => {
      const assetId = input.assetId;

      const explorerAsset = await ckbExplorerApiV1.GET('/xudts/{type_hash}', {
        params: {
          header: commonHeader,
          path: { type_hash: input.assetId },
        },
      });

      if (!explorerAsset.data?.data) return null;

      const { data: topHolders } = await ckbExplorerApiV2.GET('/rgb_top_holders/{type_hash}', {
        params: {
          path: { type_hash: assetId },
        },
      });

      if (!topHolders?.data) return null;

      const marketMap = await getLatestMarket(assetId);
      const market = marketMap[assetId];

      return topHolders.data.map((d) => ({
        network: d.network === 'btc' ? 'btc' : d.network === 'ckb' ? 'ckb' : 'unknown',
        address: d.address_hash,
        amount: d.amount,
        value: BigNumber(d.amount)
          .div(Math.pow(10, Number(explorerAsset.data.data?.attributes?.decimal ?? '0')))
          .multipliedBy(market?.price ?? 0)
          .toString(),
        percentage: Number(d.position_ratio),
      }));
    }),

  addressHoldAssets: publicProcedure
    .input(z.object({ address: z.string() }))
    .output(
      z
        .object({
          balance: z.string(),
          assets: z.array(
            z.object({
              amount: z.string(),
              value: z.string(),
              priceChange24h: z.number().nullable(),
              price: z.string().nullable(),
              info: z.object({
                id: zAssetId,
                name: z.string().nullable(),
                symbol: z.string().nullable(),
                decimals: z.number().nullable(),
                icon: z.string().nullable(),
              }),
            }),
          ),
        })
        .nullable(),
    )
    .query(async ({ input }) => {
      const { data: explorerAddresses } = await ckbExplorerApiV1.GET('/addresses/{address}', {
        params: {
          header: commonHeader,
          path: { address: input.address, page: 1, page_size: 1000 },
        },
      });

      if (!explorerAddresses?.data) return null;

      const balance = R.reduce(
        explorerAddresses.data,
        (acc, cur) => acc.plus(BigNumber(cur.attributes.balance ?? '0')),
        BigNumber(0),
      ).toString();

      const udts = R.pipe(
        explorerAddresses.data,
        R.flatMap((d) => d.attributes.udt_accounts ?? []),
        R.filter((u) => u.udt_type !== 'spore_cell'),
        R.groupBy((u) => u.type_hash),
        R.mapValues((g) => ({
          ...g[0],
          amount: g.reduce((acc, cur) => acc.plus(BigNumber(cur.amount)), BigNumber(0)),
        })),
        R.values(),
      );

      const marketMap = await getLatestMarket(udts.map((u) => u.type_hash));

      return {
        balance,
        assets: udts
          .map((udt) => ({
            amount: udt.amount
              .div(Math.pow(10, Number(udt.decimal ?? '0')))
              .toFixed(2)
              .toString(),
            value: BigNumber(udt.amount)
              .div(Math.pow(10, Number(udt.decimal ?? '0')))
              .multipliedBy(marketMap[udt.type_hash]?.price ?? 0)
              .toFixed(2)
              .toString(),
            priceChange24h: marketMap[udt.type_hash]?.percentChange24h ?? null,
            price: marketMap[udt.type_hash]?.price ?? null,
            info: {
              id: udt.type_hash,
              name: udt.symbol ?? null,
              symbol: udt.symbol ?? null,
              decimals: udt.decimal ? Number(udt.decimal) : null,
              icon: udt.udt_icon_file ?? null,
            },
          }))
          .sort((a, b) => (BigNumber(a.value).lte(b.value) ? 1 : -1)),
      };
    }),

  /**
   * The transaction hashes of the asset
   */
  transactionList: publicProcedure
    .input(
      z
        .object({
          assetId: zAssetId.optional(),
          sort: z.enum(['number.asc', 'number.desc', 'time.asc', 'time.desc']).optional().default('number.desc'),
        })
        .and(paginationSchema),
    )
    .output(
      zPaginationOutput(
        z.object({
          txHash: zHash,
          network: zRgbppNetwork,
          btc: z.object({
            txid: z.string().nullable(),
          }),
          // on => onto layer2, off => off layer2, undefined => not required, null => within layer1
          direction: z.enum(['on', 'off']).optional().nullable(),
          timestamp: z.number(),
          ckbTransaction: z.object({
            outputs: z.array(
              z.object({
                txHash: z.string(),
                index: z.number(),
                capacity: z.string(),
                cellType: z.string(),
                lock: z.object({
                  codeHash: z.string(),
                  hashType: z.string(),
                  args: z.string(),
                }),
                xudtInfo: z
                  .object({
                    symbol: z.string().nullable(),
                    amount: z.string(),
                    decimal: z.number().nullable(),
                  })
                  .nullable(),
              }),
            ),
          }),
        }),
      ),
    )
    .query(async ({ ctx, input }) => {
      const { data, pagination } = await (async () => {
        if (input?.assetId) {
          const res = await ckbExplorerApiV1.GET('/udt_transactions/{type_hash}', {
            params: {
              header: commonHeader,
              path: { type_hash: input.assetId },
              query: { page: input.page, page_size: input.pageSize },
            },
          });

          return {
            data:
              res.data?.data
                ?.map((item) => item.attributes)
                .filter(R.isNonNullish)
                .map((item) => ({
                  txHash: item.transaction_hash!,
                  btc: {
                    txid: item.rgb_txid ?? null,
                  },
                  // direction is not required
                  direction: undefined,
                  network: 'ckb',
                  timestamp: parseInt(item.block_timestamp!),
                })) ?? [],

            pagination: {
              hasNext: !!res.data?.meta?.total && res.data.meta.total > input.page * input.pageSize,
              total: res.data?.meta?.total,
            },
          };
        }
        const res = await ckbExplorerApiV2.GET('/rgb_transactions', {
          params: {
            query: { page: input.page, page_size: input.pageSize, sort: input.sort },
          },
        });
        return {
          data:
            res.data?.data?.ckb_transactions.map((i) => {
              let direction: 'on' | 'off' | undefined | null = undefined;
              if (i.leap_direction === 'leapoutBTC') {
                direction = 'off';
              } else if (i.leap_direction === 'withinBTC') {
                direction = null;
              } else if (i.leap_direction === 'in') {
                direction = 'on';
              }
              return {
                txHash: i.tx_hash,
                btc: {
                  txid: i.rgb_txid ?? null,
                },
                direction,
                network: 'ckb',
                timestamp: i.block_timestamp,
              };
            }) ?? [],
          pagination: {
            hasNext: !!res.data?.meta?.total && res.data.meta.total > input.page * input.pageSize,
            total: res.data?.meta?.total,
          },
        };
      })();

      const txMaps = await ctx.dataSource.batchGetTransation(data.map((i) => i.txHash));
      const txs = Object.values(txMaps);

      const calculateAssetKey = (script: Script) => {
        if (isSpore(script)) return script.args;

        return computeScriptHash(script);
      };

      const relatedAssetIds = R.pipe(
        txs,
        R.flatMap((tx) =>
          tx.outputs.flatMap((cell) => {
            const results = [];

            if (cell.type && isUdt(cell.type)) {
              results.push(computeScriptHash(cell.type));
            }

            if (cell.type && isSpore(cell.type)) {
              results.push(cell.type.args);
            }

            return results;
          }),
        ),
        R.concat([NATIVE_ASSETS.CKB]),
        R.unique(),
      );

      const assetInfos = await ctx.db.query.assetInfo.findMany({
        where: (table) => inArray(table.id, relatedAssetIds),
      });

      const assetInfoMap = R.mapToObj(assetInfos, (info) => [info.id, info]);

      const results = data.map((i) => {
        const ckbTransaction = txMaps[i.txHash]!;
        return {
          txHash: i.txHash,
          btc: i.btc,
          direction: i.direction,
          network: i.network as 'ckb' | 'btc' | 'doge' | 'unknown',
          timestamp: i.timestamp,
          ckbTransaction: {
            outputs: ckbTransaction.outputs.map((cell, index) => {
              const cellType = getCellType(cell.type);
              const assetInfo = cell.type ? assetInfoMap[calculateAssetKey(cell.type)] : undefined;
              const data = ckbTransaction.outputsData[index] ?? '';
              const assetAmount = (() => {
                if (cellType === 'XUDT') return decodeUdtData(data);
                if (cellType === 'SUDT') return decodeUdtData(data);
                if (cellType === 'DOB') return 1n;
                return 0n;
              })();

              return {
                txHash: i.txHash,
                index,
                capacity: cell.capacity,
                lock: cell.lock,
                cellType,
                xudtInfo: assetInfo
                  ? {
                      symbol: assetInfo.symbol ?? null,
                      decimal: assetInfo.decimals ?? null,
                      amount: assetAmount.toString(),
                    }
                  : null,
              };
            }),
          },
        };
      });

      return {
        data: results,
        pagination,
      };
    }),
});

function formatAmount(value: number | bigint | string, decimal: string | number = 0): string {
  return BigNumber(String(value))
    .div(10 ** Number(decimal))
    .toString();
}
