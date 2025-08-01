import { z } from 'zod';

import { getBlock, request } from '~/aggregator/btc/api';
import { paginationSchema } from '~/server/api/routers/zod-helper';
import { createTRPCRouter, publicProcedure } from '~/server/api/trpc';

import { ckbExplorerApiV1, ckbExplorerApiV2, commonHeader, getFeeRateTiers } from './utils';

export const explorerRouter = createTRPCRouter({
  nervosDao: publicProcedure.query(async () => {
    return ckbExplorerApiV1.GET('/contracts/nervos_dao', {
      params: {
        header: commonHeader,
      },
    });
  }),
  nervosDaoTx: publicProcedure
    .input(
      paginationSchema
        .and(z.object({ address: z.string().optional() }))
        .optional()
        .default({ page: 1, pageSize: 10 }),
    )
    .query(async ({ input }) => {
      return ckbExplorerApiV1.GET('/contract_transactions/nervos_dao', {
        params: {
          header: commonHeader,
          query: { page: input.page, page_size: input.pageSize, address_hash: input.address },
        },
      });
    }),
  daoDepositors: publicProcedure.query(async () => {
    return ckbExplorerApiV1.GET('/dao_depositors', {
      params: {
        header: commonHeader,
      },
    });
  }),
  totalDaoDepositStatistics: publicProcedure.query(async () => {
    return ckbExplorerApiV1.GET('/daily_statistics/total_depositors_count-total_dao_deposit', {
      params: {
        header: commonHeader,
      },
    });
  }),
  typeOf: publicProcedure.input(z.string()).query(async ({ input }) => {
    // defined at https://github.com/nervosnetwork/ckb-explorer-frontend/blob/develop/src/services/ExplorerService/fetcher.ts#L70
    type SearchResultType =
      | 'bitcoin_block'
      | 'block'
      | 'ckb_transaction'
      | 'address'
      | 'lock_hash'
      | 'udt'
      | 'type_script'
      | 'lock_script'
      | 'bitcoin_transaction'
      | 'token_collection'
      | 'token_item'
      | 'did'
      | 'bitcoin_address'
      | 'fiber_graph_node'
      | 'not_found';

    const res = await ckbExplorerApiV1.GET('/suggest_queries', {
      params: {
        header: commonHeader,
        query: {
          q: input,
        },
      },
    });

    const result = res.data?.data.type as SearchResultType;
    if (result) {
      return result;
    }

    // check if it's a bitcoin address
    const btcAddrRes = await request<object | undefined>({ method: 'bb_getAddress', params: [input] });

    if (btcAddrRes) {
      return 'bitcoin_address';
    }

    // check if it's a bitcoin block
    const btcBlockRes = await getBlock({ hash: input.replace(/^0x/, '') }).catch(() => null);

    if (btcBlockRes) {
      return 'bitcoin_block';
    }
    return 'not_found';
  }),

  addressBase: publicProcedure.input(z.string()).query(async ({ input: address }) => {
    const data = await ckbExplorerApiV1.GET(`/addresses/{address}`, {
      params: {
        header: commonHeader,
        path: { address },
      },
    });
    const info = data.data?.data?.[0]?.attributes;

    if (!info) {
      throw new Error('Address info not found');
    }

    const { balance, balance_occupied, transactions_count } = info;

    if (balance === undefined || balance_occupied === undefined || transactions_count === undefined) {
      throw new Error('Invalid address info');
    }

    const result = {
      balance: {
        total: balance,
        occupied: balance_occupied,
      },
      tx: {
        count: transactions_count,
      },
    };
    return result;
  }),

  chainInfo: publicProcedure
    .output(
      z.object({
        tipBlock: z.object({
          number: z.number().nullable().describe('The latest block number on the chain'),
        }),
        txCountInLast24h: z.number().nullable().describe('Total number of transactions in the past 24 hours'),
        fees: z.object({
          low: z.number().describe('Low priority transaction fee rate (shannon/kB), slower confirmation'),
          medium: z.number().describe('Medium priority transaction fee rate (shannon/kB), average confirmation time'),
          high: z.number().describe('High priority transaction fee rate (shannon/kB), faster confirmation'),
        }),
        udtStats: z.object({
          holders: z.number().nullable().describe('Total number of UDT holders'),
          txCountInLast24h: z.number().nullable().describe('Total number of UDT transactions in the past 24 hours'),
        }),
      }),
    )
    .query(async () => {
      const tip = await ckbExplorerApiV1.GET('/statistics/tip_block_number', {
        params: {
          header: commonHeader,
        },
      });

      const statistics = await ckbExplorerApiV1.GET('/statistics', {
        params: {
          header: commonHeader,
        },
      });
      const { average_block_time, transactions_count_per_minute, transactions_last_24hrs } =
        statistics.data?.data?.attributes ?? {};

      const feeRates = await ckbExplorerApiV2.GET('/statistics/transaction_fees');
      const fees = getFeeRateTiers(
        feeRates.data?.transaction_fee_rates ?? [],
        transactions_count_per_minute ? Number(transactions_count_per_minute) : undefined,
        average_block_time ? Number(average_block_time) : undefined,
      );

      const udtStats = await ckbExplorerApiV2
        .GET('/udt_hourly_statistics')
        .then(
          (res) =>
            res.data?.data.sort((a, b) => (+a.created_at_unixtimestamp > +b.created_at_unixtimestamp ? -1 : 1))[0] ?? // last day
            null,
        )
        .catch(() => null);

      const udtHolders = udtStats?.holders_count;
      const txCountInLast24h = udtStats?.ckb_transactions_count;

      return {
        tipBlock: {
          number: tip.data?.data?.attributes?.tip_block_number ?? null,
        },
        txCountInLast24h: typeof transactions_last_24hrs === 'string' ? Number(transactions_last_24hrs) : null,
        fees,
        udtStats: {
          holders: udtHolders ? +udtHolders : null,
          txCountInLast24h: txCountInLast24h ? +txCountInLast24h : null,
        },
      };
    }),
});
