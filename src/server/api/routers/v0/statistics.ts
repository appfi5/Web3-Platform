import BigNumber from 'bignumber.js';
import * as R from 'remeda';
import { z } from 'zod';

import { env } from '~/env';
import { createTRPCRouter, publicProcedure } from '~/server/api/trpc';
import { shannonToCkb } from '~/utils/utility';

import { ckbExplorerApiV1, ckbExplorerApiV2, commonHeader } from '../external/utils';

type Point = [long: number, lat: number, city: string];
type Line = [Point, Point];
interface LastSeen {
  secs_since_epoch: number;
  nanos_since_epoch: number;
}
interface RawPeer {
  id: number;
  version: string;
  version_short: string;
  last_seen: LastSeen[];
  country: string;
  city: string;
  latitude: number;
  longitude: number;
  node_type: number;
}

export const statisticsRouter = createTRPCRouter({
  addressBalanceRanking: publicProcedure
    .meta({ openapi: { path: '/v0/statistics/ckb/address-balance-ranking', method: 'GET' } })
    .input(z.never().optional())
    .output(
      z.object({
        addressBalanceRanking: z.array(
          z.object({
            ranking: z.string(),
            address: z.string(),
            balance: z.string(),
          }),
        ),
        lastUpdatedTimestamp: z.string(),
      }),
    )
    .query(async () => {
      return ckbExplorerApiV1
        .GET('/statistics/address_balance_ranking', {
          params: {
            header: commonHeader,
          },
        })
        .then((res) => ({
          addressBalanceRanking: res.data?.data.attributes.address_balance_ranking ?? [],
          lastUpdatedTimestamp: res.data?.data.attributes.created_at_unixtimestamp ?? '0',
        }));
    }),
  transactionsCount: publicProcedure
    .meta({ openapi: { path: '/v0/statistics/ckb/transactions-count', method: 'GET' } })
    .input(z.never().optional())
    .output(z.array(z.object({ transactionsCount: z.string(), createdAtUnixtimestamp: z.string() })))
    .query(async () => {
      return ckbExplorerApiV1
        .GET('/daily_statistics/transactions_count', {
          params: {
            header: commonHeader,
          },
        })
        .then((res) => res.data?.data ?? [])
        .then((res) =>
          res.map((r) => ({
            transactionsCount: r.attributes.transactions_count,
            createdAtUnixtimestamp: r.attributes.created_at_unixtimestamp,
          })),
        );
    }),
  addressesCount: publicProcedure
    .meta({ openapi: { path: '/v0/statistics/ckb/addresses-count', method: 'GET' } })
    .input(z.never().optional())
    .output(z.array(z.object({ addressesCount: z.string(), createdAtUnixtimestamp: z.string() })))
    .query(async () => {
      return ckbExplorerApiV1
        .GET('/daily_statistics/addresses_count', {
          params: {
            header: commonHeader,
          },
        })
        .then((res) => res.data?.data ?? [])
        .then((res) =>
          res.map((r) => ({
            addressesCount: r.attributes.addresses_count,
            createdAtUnixtimestamp: r.attributes.created_at_unixtimestamp,
          })),
        );
    }),
  cellCount: publicProcedure
    .meta({ openapi: { path: '/v0/statistics/ckb/cell-count', method: 'GET' } })
    .input(z.never().optional())
    .output(
      z.array(
        z.object({
          liveCellsCount: z.string(),
          deadCellsCount: z.string(),
          createdAtUnixtimestamp: z.string(),
          allCellsCount: z.string(),
        }),
      ),
    )
    .query(async () => {
      return ckbExplorerApiV1
        .GET('/daily_statistics/live_cells_count-dead_cells_count', {
          params: {
            header: commonHeader,
          },
        })
        .then((res) => res.data?.data ?? [])
        .then((res) =>
          res.map((r) => ({
            liveCellsCount: r.attributes.live_cells_count,
            deadCellsCount: r.attributes.dead_cells_count,
            createdAtUnixtimestamp: r.attributes.created_at_unixtimestamp,
            allCellsCount: BigNumber(r.attributes.live_cells_count)
              .plus(BigNumber(r.attributes.dead_cells_count))
              .toString(),
          })),
        );
    }),
  ckbHodlWave: publicProcedure
    .meta({ openapi: { path: '/v0/statistics/ckb/ckb-hodl-wave', method: 'GET' } })
    .input(z.never().optional())
    .output(
      z.array(
        z.object({
          ckbHodlWave: z.object({
            dayToOneWeek: z.number(),
            latestDay: z.number(),
            oneMonthToThreeMonths: z.number(),
            oneWeekToOneMonth: z.number(),
            oneYearToThreeYears: z.number(),
            overThreeYears: z.number(),
            sixMonthsToOneYear: z.number(),
            threeMonthsToSixMonths: z.number(),
            totalSupply: z.number(),
          }),
          createdAtUnixtimestamp: z.string(),
          holderCount: z.string(),
        }),
      ),
    )
    .query(async () => {
      return ckbExplorerApiV1
        .GET('/daily_statistics/ckb_hodl_wave-holder_count', {
          params: {
            header: commonHeader,
          },
        })
        .then((res) => res.data?.data ?? [])
        .then((res) =>
          res.map((r) => ({
            ckbHodlWave: {
              dayToOneWeek: r.attributes.ckb_hodl_wave.day_to_one_week,
              latestDay: r.attributes.ckb_hodl_wave.latest_day,
              oneMonthToThreeMonths: r.attributes.ckb_hodl_wave.one_month_to_three_months,
              oneWeekToOneMonth: r.attributes.ckb_hodl_wave.one_week_to_one_month,
              oneYearToThreeYears: r.attributes.ckb_hodl_wave.one_year_to_three_years,
              overThreeYears: r.attributes.ckb_hodl_wave.over_three_years,
              sixMonthsToOneYear: r.attributes.ckb_hodl_wave.six_months_to_one_year,
              threeMonthsToSixMonths: r.attributes.ckb_hodl_wave.three_months_to_six_months,
              totalSupply: r.attributes.ckb_hodl_wave.total_supply,
            },
            createdAtUnixtimestamp: r.attributes.created_at_unixtimestamp,
            holderCount: r.attributes.holder_count,
          })),
        );
    }),
  balanceDistribution: publicProcedure
    .meta({ openapi: { path: '/v0/statistics/ckb/balance-distribution', method: 'GET' } })
    .input(z.never().optional())
    .output(
      z.object({
        addressBalanceDistribution: z.array(
          z.object({
            balance: z.string(),
            addresses: z.string(),
            sumAddresses: z.string(),
          }),
        ),
        lastUpdatedTimestamp: z.string(),
      }),
    )
    .query(async () => {
      return ckbExplorerApiV1
        .GET('/distribution_data/address_balance_distribution', {
          params: {
            header: commonHeader,
          },
        })
        .then((res) => ({
          addressBalanceDistribution: (res.data?.data.attributes.address_balance_distribution ?? []).map(
            ([balance, addresses, sumAddresses]) => ({ balance, addresses, sumAddresses }),
          ),
          lastUpdatedTimestamp: res.data?.data.attributes.created_at_unixtimestamp ?? '0',
        }));
    }),
  txFeeHistory: publicProcedure
    .meta({ openapi: { path: '/v0/statistics/ckb/tx-fee-history', method: 'GET' } })
    .input(z.never().optional())
    .output(
      z.array(
        z.object({
          createdAtUnixtimestamp: z.string(),
          totalTxFee: z.string(),
        }),
      ),
    )
    .query(async () => {
      return ckbExplorerApiV1
        .GET('/daily_statistics/total_tx_fee', {
          params: {
            header: commonHeader,
          },
        })
        .then((res) => res.data?.data ?? [])
        .then((res) =>
          res.map((r) => ({
            createdAtUnixtimestamp: r.attributes.created_at_unixtimestamp,
            totalTxFee: r.attributes.total_tx_fee,
          })),
        );
    }),
  knowledgeSize: publicProcedure
    .meta({ openapi: { path: '/v0/statistics/ckb/knowledge-size', method: 'GET' } })
    .input(z.never().optional())
    .output(
      z.array(
        z.object({
          createdAtUnixtimestamp: z.string(),
          knowledgeSize: z.number(),
        }),
      ),
    )
    .query(async () => {
      return ckbExplorerApiV1
        .GET('/daily_statistics/knowledge_size', {
          params: {
            header: commonHeader,
          },
        })
        .then((res) => res.data?.data ?? [])
        .then((res) =>
          res.map((r) => ({
            createdAtUnixtimestamp: r.attributes.created_at_unixtimestamp,
            knowledgeSize: +shannonToCkb(r.attributes.knowledge_size),
          })),
        );
    }),
  contractResourceDistributed: publicProcedure
    .meta({ openapi: { path: '/v0/statistics/ckb/contract-resource-distributed', method: 'GET' } })
    .input(z.never().optional())
    .output(
      z.array(
        z.object({
          name: z.string().nullable(),
          codeHash: z.string(),
          hashType: z.string(),
          addressCount: z.number(),
          ckbAmount: z.number(),
          txCount: z.number(),
          h24TxCount: z.number(),
        }),
      ),
    )
    .query(async () => {
      return ckbExplorerApiV2.GET('/statistics/contract_resource_distributed').then(
        (res) =>
          res.data?.map((d) => ({
            name: d.name,
            codeHash: d.code_hash,
            hashType: d.hash_type,
            addressCount: d.address_count,
            ckbAmount: d.ckb_amount,
            txCount: d.tx_count,
            h24TxCount: d.h24_tx_count,
          })) ?? [],
      );
    }),
  blockTimeDistribution: publicProcedure
    .meta({ openapi: { path: '/v0/statistics/ckb/block-time-distribution', method: 'GET' } })
    .input(z.never().optional())
    .output(
      z.object({
        blockTimeDistribution: z.array(z.object({ time: z.string(), ratio: z.string() })),
        lastUpdatedTimestamp: z.string(),
      }),
    )
    .query(async () => {
      const { blockTimeDistribution, lastUpdatedTimestamp } = await ckbExplorerApiV1
        .GET('/distribution_data/block_time_distribution', {
          params: {
            header: commonHeader,
          },
        })
        .then((res) => ({
          blockTimeDistribution: res.data?.data?.attributes?.block_time_distribution ?? [],
          lastUpdatedTimestamp: res.data?.data?.attributes?.created_at_unixtimestamp ?? '0',
        }));

      const sumBlocks = blockTimeDistribution
        .flatMap((data) => Number(data[1]))
        .reduce((previous, current) => previous + current);
      const statisticBlockTimeDistributions = [
        {
          time: '0',
          ratio: '0',
        },
      ].concat(
        blockTimeDistribution.map((data) => {
          const [time, blocks] = data;
          return {
            time,
            ratio: (Number(blocks) / sumBlocks).toFixed(5),
          };
        }),
      );
      return { blockTimeDistribution: statisticBlockTimeDistributions, lastUpdatedTimestamp };
    }),
  epochTimeDistribution: publicProcedure
    .meta({ openapi: { path: '/v0/statistics/ckb/epoch-time-distribution', method: 'GET' } })
    .input(z.never().optional())
    .output(
      z.object({
        epochTimeDistribution: z.array(z.object({ time: z.string(), epoch: z.string() })),
        lastUpdatedTimestamp: z.string(),
      }),
    )
    .query(async () => {
      const { epochTimeDistribution, lastUpdatedTimestamp } = await ckbExplorerApiV1
        .GET('/distribution_data/epoch_time_distribution', {
          params: {
            header: commonHeader,
          },
        })
        .then((res) => ({
          epochTimeDistribution: res.data?.data?.attributes?.epoch_time_distribution ?? [],
          lastUpdatedTimestamp: res.data?.data?.attributes?.created_at_unixtimestamp ?? '0',
        }));

      return {
        epochTimeDistribution: epochTimeDistribution.map(([time, epoch]) => ({
          time,
          epoch,
        })),
        lastUpdatedTimestamp,
      };
    }),
  averageBlockTimes: publicProcedure
    .meta({ openapi: { path: '/v0/statistics/ckb/average-block-times', method: 'GET' } })
    .input(z.never().optional())
    .output(
      z.array(
        z.object({
          avgBlockTimeDaily: z.string(),
          avgBlockTimeWeekly: z.string(),
          timestamp: z.number(),
        }),
      ),
    )
    .query(async () => {
      return ckbExplorerApiV1
        .GET('/distribution_data/average_block_time', {
          params: {
            header: commonHeader,
          },
        })
        .then(
          (res) =>
            res.data?.data.attributes.average_block_time.map((r) => ({
              avgBlockTimeDaily: r.avg_block_time_daily,
              avgBlockTimeWeekly: r.avg_block_time_weekly,
              timestamp: r.timestamp,
            })) ?? [],
        );
    }),
  totalDaoDeposit: publicProcedure
    .meta({ openapi: { path: '/v0/statistics/ckb/total-dao-deposit', method: 'GET' } })
    .input(z.never().optional())
    .output(
      z.array(
        z.object({
          createdAtUnixtimestamp: z.string(),
          totalDaoDeposit: z.string(),
          totalDepositorsCount: z.string(),
        }),
      ),
    )
    .query(async () => {
      return ckbExplorerApiV1
        .GET('/daily_statistics/total_depositors_count-total_dao_deposit', {
          params: {
            header: commonHeader,
          },
        })
        .then((res) => res.data?.data ?? [])
        .then((res) =>
          res.map((r) => ({
            createdAtUnixtimestamp: r.attributes.created_at_unixtimestamp,
            totalDaoDeposit: r.attributes.total_dao_deposit,
            totalDepositorsCount: r.attributes.total_depositors_count,
          })),
        );
    }),
  newDaoDeposit: publicProcedure
    .meta({ openapi: { path: '/v0/statistics/ckb/new-dao-deposit', method: 'GET' } })
    .input(z.never().optional())
    .output(
      z.array(
        z.object({
          createdAtUnixtimestamp: z.string(),
          dailyDaoDeposit: z.string(),
          dailyDaoDepositorsCount: z.string(),
        }),
      ),
    )
    .query(async () => {
      return ckbExplorerApiV1
        .GET('/daily_statistics/daily_dao_deposit-daily_dao_depositors_count', {
          params: {
            header: commonHeader,
          },
        })
        .then((res) => res.data?.data ?? [])
        .then((res) =>
          res.map((r) => ({
            createdAtUnixtimestamp: r.attributes.created_at_unixtimestamp,
            dailyDaoDeposit: r.attributes.daily_dao_deposit,
            dailyDaoDepositorsCount: r.attributes.daily_dao_depositors_count,
          })),
        );
    }),
  circulationRatio: publicProcedure
    .meta({ openapi: { path: '/v0/statistics/ckb/circulation-ratio', method: 'GET' } })
    .input(z.never().optional())
    .output(
      z.array(
        z.object({
          createdAtUnixtimestamp: z.string(),
          circulationRatio: z.string(),
        }),
      ),
    )
    .query(async () => {
      return ckbExplorerApiV1
        .GET('/daily_statistics/circulation_ratio', {
          params: {
            header: commonHeader,
          },
        })
        .then((res) => res.data?.data ?? [])
        .then((res) =>
          res.map((r) => ({
            createdAtUnixtimestamp: r.attributes.created_at_unixtimestamp,
            circulationRatio: r.attributes.circulation_ratio,
          })),
        );
    }),
  minerAddressDistribution: publicProcedure
    .meta({ openapi: { path: '/v0/statistics/ckb/miner-address-distribution', method: 'GET' } })
    .input(z.never().optional())
    .output(
      z.object({
        statisticMinerAddresses: z.array(z.object({ address: z.string(), radio: z.string() })),
        lastUpdatedTimestamp: z.string(),
      }),
    )
    .query(async () => {
      const { minerAddressDistribution: items, lastUpdatedTimestamp } = await ckbExplorerApiV1
        .GET('/distribution_data/miner_address_distribution', {
          params: {
            header: commonHeader,
          },
        })
        .then((res) => ({
          minerAddressDistribution: res.data?.data.attributes.miner_address_distribution ?? {},
          lastUpdatedTimestamp: res.data?.data.attributes.created_at_unixtimestamp ?? '0',
        }));

      const blockSum = Object.values(items).reduce((sum, val) => sum + Number(val), 0);
      const statisticMinerAddresses = Object.entries(items).map(([key, val]) => ({
        address: key,
        radio: (Number(val) / blockSum).toFixed(3),
      }));
      return { statisticMinerAddresses, lastUpdatedTimestamp };
    }),
  minerVersionDistribution: publicProcedure
    .meta({ openapi: { path: '/v0/statistics/ckb/miner-version-distribution', method: 'GET' } })
    .input(z.never().optional())
    .output(
      z.array(
        z.object({
          version: z.string(),
          percent: z.number(),
        }),
      ),
    )
    .query(async () => {
      const list = await ckbExplorerApiV2.GET('/blocks/ckb_node_versions').then((res) => res.data?.data ?? []);
      const totalBlocks = list.reduce((acc, cur) => acc + cur.blocks_count, 0);
      return list.map((v) => ({
        version: v.version,
        percent: +((100 * v.blocks_count) / totalBlocks).toFixed(2),
      }));
    }),
  totalSupply: publicProcedure
    .meta({ openapi: { path: '/v0/statistics/ckb/total-supply', method: 'GET' } })
    .input(z.never().optional())
    .output(
      z.array(
        z.object({
          circulatingSupply: z.string(),
          burnt: z.string(),
          lockedCapacity: z.string(),
          createdAtUnixtimestamp: z.string(),
        }),
      ),
    )
    .query(async () => {
      return ckbExplorerApiV1
        .GET('/daily_statistics/circulating_supply-burnt-locked_capacity', {
          params: {
            header: commonHeader,
          },
        })
        .then((res) => res.data?.data ?? [])
        .then((res) =>
          res.map((r) => ({
            circulatingSupply: r.attributes.circulating_supply,
            burnt: r.attributes.burnt,
            lockedCapacity: r.attributes.locked_capacity,
            createdAtUnixtimestamp: r.attributes.created_at_unixtimestamp,
          })),
        );
    }),
  difficultyUncleRateEpoch: publicProcedure
    .meta({ openapi: { path: '/v0/statistics/ckb/difficulty-uncle-rate-epoch', method: 'GET' } })
    .input(z.never().optional())
    .output(
      z.array(
        z.object({
          epochNumber: z.string(),
          epochTime: z.string(),
          epochLength: z.string(),
          createdAtUnixtimestamp: z.string(),
          largestBlock: z.object({
            number: z.number(),
            size: z.number(),
          }),
          largestTx: z.object({
            txHash: z.string().nullable(),
            bytes: z.number().nullable(),
          }),
        }),
      ),
    )
    .query(async () => {
      return ckbExplorerApiV1
        .GET('/epoch_statistics/epoch_time-epoch_length', {
          params: {
            header: commonHeader,
          },
        })
        .then((res) => res.data?.data ?? [])
        .then((res) => res.map((r) => r.attributes))
        .then((res) =>
          res.map((r) => ({
            epochNumber: r.epoch_number,
            epochTime: r.epoch_time,
            epochLength: r.epoch_length,
            createdAtUnixtimestamp: r.created_at_unixtimestamp,
            largestBlock: {
              number: r.largest_block.number,
              size: r.largest_block.size,
            },
            largestTx: {
              txHash: r.largest_tx.tx_hash,
              bytes: r.largest_tx.bytes,
            },
          })),
        );
    }),
  difficultyHashRate: publicProcedure
    .meta({ openapi: { path: '/v0/statistics/ckb/difficulty-uncle-rate-hash-rate', method: 'GET' } })
    .input(z.never().optional())
    .output(
      z.array(
        z.object({
          difficulty: z.string(),
          epochNumber: z.string(),
          uncleRate: z.string(),
          hashRate: z.string(),
          createdAtUnixtimestamp: z.string(),
        }),
      ),
    )
    .query(async () => {
      const items = await ckbExplorerApiV1
        .GET('/epoch_statistics/difficulty-uncle_rate-hash_rate', {
          params: {
            header: commonHeader,
          },
        })
        .then((res) => res.data?.data ?? [])
        .then((res) => res.map((r) => r.attributes));

      return items
        .filter((item, idx) => idx < items.length - 2 || item.hash_rate !== '0.0')
        .map((item) => ({
          difficulty: item.difficulty,
          epochNumber: item.epoch_number,
          uncleRate: new BigNumber(item.uncle_rate).toFixed(4),
          hashRate: new BigNumber(item.hash_rate).multipliedBy(1000).toString(),
          createdAtUnixtimestamp: item.created_at_unixtimestamp,
        }));
    }),
  assetActivity: publicProcedure
    .meta({ openapi: { path: '/v0/statistics/ckb/asset-activity', method: 'GET' } })
    .input(z.never().optional())
    .output(
      z.array(
        z.object({ createdAtUnixtimestamp: z.number(), holdersCount: z.string(), ckbTransactionsCount: z.string() }),
      ),
    )
    .query(async () => {
      return await ckbExplorerApiV2
        .GET('/udt_hourly_statistics')
        .then((res) => res.data?.data ?? [])
        .then((res) => res.sort((a, b) => Number(a.created_at_unixtimestamp) - Number(b.created_at_unixtimestamp)))
        .then((res) =>
          res.map((r) => ({
            createdAtUnixtimestamp: Number(r.created_at_unixtimestamp),
            holdersCount: r.holders_count,
            ckbTransactionsCount: r.ckb_transactions_count,
          })),
        );
    }),
  difficulty: publicProcedure
    .meta({ openapi: { path: '/v0/statistics/ckb/difficulty', method: 'GET' } })
    .input(z.never().optional())
    .output(
      z.array(
        z.object({
          createdAtUnixtimestamp: z.string(),
          avgDifficulty: z.string(),
        }),
      ),
    )
    .query(async () => {
      return ckbExplorerApiV1
        .GET('/daily_statistics/avg_difficulty', {
          params: {
            header: commonHeader,
          },
        })
        .then((res) => res.data?.data ?? [])
        .then((res) => res.map((r) => r.attributes))
        .then((items) => items.filter((item, idx) => idx < items.length - 2 || item.avg_difficulty !== '0.0'))
        .then((items) =>
          items.map((item) => ({
            createdAtUnixtimestamp: item.created_at_unixtimestamp,
            avgDifficulty: item.avg_difficulty,
          })),
        );
    }),
  hashRate: publicProcedure
    .meta({ openapi: { path: '/v0/statistics/ckb/hash-rate', method: 'GET' } })
    .input(z.never().optional())
    .output(
      z.array(
        z.object({
          createdAtUnixtimestamp: z.string(),
          avgHashRate: z.string(),
        }),
      ),
    )
    .query(async () => {
      const hashRates = await ckbExplorerApiV1
        .GET('/daily_statistics/avg_hash_rate', {
          params: {
            header: commonHeader,
          },
        })
        .then((res) => res.data?.data ?? [])
        .then((res) => res.map((r) => r.attributes));

      return hashRates
        .filter((item, idx) => idx < hashRates.length - 2 || item.avg_hash_rate !== '0.0')
        .map((item) => ({
          createdAtUnixtimestamp: item.created_at_unixtimestamp,
          avgHashRate: new BigNumber(item.avg_hash_rate).multipliedBy(1000).toString(),
        }));
    }),
  uncleRate: publicProcedure
    .meta({ openapi: { path: '/v0/statistics/ckb/uncle-rate', method: 'GET' } })
    .input(z.never().optional())
    .output(
      z.array(
        z.object({
          createdAtUnixtimestamp: z.string(),
          uncleRate: z.string(),
        }),
      ),
    )
    .query(async () => {
      const items = await ckbExplorerApiV1
        .GET('/daily_statistics/uncle_rate', {
          params: {
            header: commonHeader,
          },
        })
        .then((res) => res.data?.data ?? [])
        .then((res) => res.map((r) => r.attributes));

      return items
        .filter((item, idx) => idx < items.length - 2 || item.uncle_rate !== '0.0')
        .map((item) => ({
          createdAtUnixtimestamp: item.created_at_unixtimestamp,
          uncleRate: new BigNumber(item.uncle_rate).toFixed(4),
        }));
    }),
  liquidity: publicProcedure
    .meta({ openapi: { path: '/v0/statistics/ckb/liquidity', method: 'GET' } })
    .input(z.never().optional())
    .output(
      z.array(
        z.object({
          createdAtUnixtimestamp: z.string(),
          liquidity: z.string(),
          circulatingSupply: z.string(),
          daoDeposit: z.string(),
        }),
      ),
    )
    .query(async () => {
      return ckbExplorerApiV1
        .GET('/daily_statistics/circulating_supply-liquidity', {
          params: {
            header: commonHeader,
          },
        })
        .then((res) => res.data?.data ?? [])
        .then((res) =>
          res.map((r) => ({
            createdAtUnixtimestamp: r.attributes.created_at_unixtimestamp,
            liquidity: r.attributes.liquidity,
            circulatingSupply: r.attributes.circulating_supply,
            daoDeposit: new BigNumber(r.attributes.circulating_supply)
              .minus(new BigNumber(r.attributes.liquidity))
              .toFixed(2),
          })),
        );
    }),
  getPeers: publicProcedure
    .meta({ openapi: { path: '/v0/statistics/ckb/peers', method: 'GET' } })
    .input(
      z.object({
        network: z.string(),
        offlineTimeout: z.number().default(10080),
        unknownOfflineTimeout: z.number().default(10080),
      }),
    )
    .output(
      z.object({
        lines: z.array(
          z.tuple([z.tuple([z.number(), z.number(), z.string()]), z.tuple([z.number(), z.number(), z.string()])]),
        ),
        points: z.array(z.tuple([z.number(), z.number(), z.string()])),
      }),
    )
    .query(async ({ input }) => {
      const fetchPeers = async () => {
        try {
          const params = new URLSearchParams({
            network: input.network,
            offline_timeout: input.offlineTimeout.toString(),
            unknown_offline_timeout: input.unknownOfflineTimeout.toString(),
          });
          console.log(`fetch ${env.PROB_NODE}?${params}`);

          const result = await fetch(`${env.PROB_NODE}?${params}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          });

          return (await result.json()) as RawPeer[];
        } catch (e) {
          console.error(e);
          return [];
        }
      };

      const peers = await fetchPeers();
      const points: Point[] = peers.map((peer) => [peer.longitude, peer.latitude, peer.city]);
      const lines: Line[] = [];
      for (let i = 0; i < points.length - 1; i++) {
        for (let j = i + 1; j < points.length; j++) {
          const p1: Point = points[i]!;
          const p2: Point = points[j]!;
          lines.push([p1, p2]);
        }
      }
      return { lines, points };
    }),
  secondaryIssuance: publicProcedure
    .meta({ openapi: { path: '/v0/statistics/ckb/secondary-issuance', method: 'GET' } })
    .input(z.never().optional())
    .output(
      z.array(
        z.object({
          createdAtUnixtimestamp: z.string(),
          treasuryAmount: z.string(),
          miningReward: z.string(),
          depositCompensation: z.string(),
        }),
      ),
    )
    .query(async () => {
      return ckbExplorerApiV1
        .GET('/daily_statistics/treasury_amount-mining_reward-deposit_compensation', {
          params: {
            header: commonHeader,
          },
        })
        .then((res) => res.data?.data ?? [])
        .then((res) => res.map((r) => r.attributes))
        .then((items) =>
          items.map((item) => {
            const { deposit_compensation, mining_reward, treasury_amount, created_at_unixtimestamp } = item;
            const sum = Number(treasury_amount) + Number(mining_reward) + Number(deposit_compensation);
            const treasuryAmountPercent = Number(((Number(treasury_amount) / sum) * 100).toFixed(2));
            const miningRewardPercent = Number(((Number(mining_reward) / sum) * 100).toFixed(2));
            const depositCompensationPercent = (100 - treasuryAmountPercent - miningRewardPercent).toFixed(2);
            return {
              createdAtUnixtimestamp: created_at_unixtimestamp,
              treasuryAmount: treasuryAmountPercent.toString(),
              miningReward: miningRewardPercent.toString(),
              depositCompensation: depositCompensationPercent,
            };
          }),
        );
    }),
  annualPercentageCompensation: publicProcedure
    .meta({ openapi: { path: '/v0/statistics/ckb/annual-percentage-compensation', method: 'GET' } })
    .input(z.never().optional())
    .output(
      z.array(
        z.object({
          year: z.number(),
          apc: z.string(),
        }),
      ),
    )
    .query(async () => {
      const nominalApc = await ckbExplorerApiV1
        .GET('/monetary_data/nominal_apc', {
          params: {
            header: commonHeader,
          },
        })
        .then((res) => res.data?.data.attributes.nominal_apc ?? []);

      const statisticAnnualPercentageCompensations = nominalApc
        .filter((_apc, index) => index % 3 === 0 || index === nominalApc.length - 1)
        .map((apc, index) => ({
          year: 0.25 * index,
          apc,
        }));

      return statisticAnnualPercentageCompensations;
    }),
  inflationRate: publicProcedure
    .meta({ openapi: { path: '/v0/statistics/ckb/inflation-rate', method: 'GET' } })
    .input(z.never().optional())
    .output(
      z.array(
        z.object({
          year: z.number(),
          nominalApc: z.string(),
          nominalInflationRate: z.string(),
          realInflationRate: z.string(),
        }),
      ),
    )
    .query(async () => {
      return ckbExplorerApiV1
        .GET('/monetary_data/nominal_apc50-nominal_inflation_rate-real_inflation_rate', {
          params: {
            header: commonHeader,
          },
        })
        .then(
          (res) =>
            res.data?.data.attributes ?? {
              nominal_apc: [],
              nominal_inflation_rate: [],
              real_inflation_rate: [],
            },
        )
        .then(({ nominal_apc, nominal_inflation_rate, real_inflation_rate }) => {
          const statisticInflationRates = [];
          for (let i = 0; i < nominal_apc.length; i++) {
            if (i % 6 === 0 || i === nominal_apc.length - 1) {
              statisticInflationRates.push({
                year: i % 6 === 0 ? Math.floor(i / 6) * 0.5 : 50,
                nominalApc: nominal_apc[i]!,
                nominalInflationRate: nominal_inflation_rate[i]!,
                realInflationRate: real_inflation_rate[i]!,
              });
            }
          }
          return statisticInflationRates;
        });
    }),
  activeAddresses: publicProcedure
    .meta({ openapi: { path: '/v0/statistics/ckb/active-addresses', method: 'GET' } })
    .input(z.never().optional())
    .output(
      z.array(
        z.object({
          createdAtUnixtimestamp: z.string(),
          distribution: z.record(z.string(), z.number()),
        }),
      ),
    )
    .query(async () => {
      const items = await ckbExplorerApiV1
        .GET('/daily_statistics/activity_address_contract_distribution', {
          params: {
            header: commonHeader,
          },
        })
        .then((res) => res.data?.data ?? [])
        .then((res) => res.map((r) => r.attributes));

      return items.map<{
        createdAtUnixtimestamp: string;
        distribution: Record<string, number>;
      }>(({ created_at_unixtimestamp, activity_address_contract_distribution }) => ({
        createdAtUnixtimestamp: created_at_unixtimestamp,
        distribution: Object.assign({}, ...activity_address_contract_distribution) as Record<string, number>,
      }));
    }),
  nodeCountryDistribution: publicProcedure
    .meta({ openapi: { path: '/v0/statistics/ckb/node-country-distribution', method: 'GET' } })
    .input(z.never().optional())
    .output(
      z.array(
        z.object({
          country: z.string(),
          percent: z.number(),
        }),
      ),
    )
    .query(async () => {
      const params = new URLSearchParams({
        network: env.NEXT_PUBLIC_IS_MAINNET ? 'minara' : 'pudge',
        offline_timeout: '10080',
        unknown_offline_timeout: '10080',
      });

      const peers = await fetch(`${env.NEXT_PUBLIC_PROB_NODE}/peer?${params.toString()}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }).then(
        async (res) =>
          (await res.json()) as {
            country: string;
          }[],
      );

      return R.pipe(
        peers,
        R.groupBy((item) => item.country),
        R.entries(),
        R.sort((a, b) => b[1].length - a[1].length),
        R.map((item) => ({
          country: item[0],
          percent: +((item[1].length * 100) / peers.length).toFixed(2),
        })),
      );
    }),
});
