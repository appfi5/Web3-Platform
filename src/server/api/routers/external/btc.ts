/**
 * NOTE: This module is temporary and will be removed once the RGB++ explorer is fully ready for external services.
 * It currently serves as a workaround for missing RGB++ explorer APIs.
 */

import type { StatsInfo } from '@mempool/mempool.js/lib/interfaces/bitcoin/addresses';
import { z } from 'zod';

import {
  getAddress,
  getBestBlockHash,
  getBlock,
  getBlockHash,
  getTxOut,
  getTxRawData,
  request,
} from '~/aggregator/btc/api';
import { createTRPCRouter, publicProcedure } from '~/server/api/trpc';
import { tryCatchTRPC } from '~/server/api/utils';

import { ckbExplorerApiV2 } from './utils';

// const {
//   bitcoin: { addresses, transactions, blocks, fees },
// } = mempoolJS({
//   protocol: 'https',
//   hostname: 'magickbase.mempool.space',
//   network: env.NEXT_PUBLIC_IS_MAINNET ? 'mainnet' : 'signet',
// });

const formatAddressStats = (stats: StatsInfo) => {
  return {
    sats: stats.funded_txo_sum - stats.spent_txo_sum,
    tx: {
      count: stats.tx_count,
    },
  };
};

export const btcRouter = createTRPCRouter({
  address: publicProcedure.input(z.string()).query(async ({ input: address }) => {
    const addrInfo = await tryCatchTRPC(() =>
      getAddress({ address }).then((v) => {
        if (!v) {
          throw new Error('Address not found');
        }
        return v;
      }),
    );

    return {
      address: addrInfo.address,
      chain: {
        sats: Number(addrInfo.balance),
        tx_count: addrInfo.txs,
      },
      mempool: {
        sats: Number(addrInfo.unconfirmedBalance),
        tx_count: addrInfo.unconfirmedTxs,
      },
    };
  }),

  transaction: publicProcedure
    .meta({ openapi: { path: '/tmp/btc/transaction', method: 'GET' } })
    .input(z.object({ txid: z.string() }))
    .output(
      z.object({
        txid: z.string(),
        blockHeight: z.number(),
        blockHash: z.string(),
        size: z.number(),
        fee: z.number(),
        confirmed: z.boolean(),
        vin: z.array(
          z.object({
            txid: z.string(),
            vout: z.number(),
            isCoinbase: z.boolean(),
            scriptsig_asm: z.string(),
            prevout: z.object({
              txid: z.string(),
              vout: z.number(),
              value: z.number().optional(),
              address: z.string().optional(),
            }),
          }),
        ),
        vout: z.array(
          z.object({
            address: z.string().optional(),
            value: z.number(),
            scriptpubkey_address: z.string().optional(),
            scriptpubkey_asm: z.string(),
            scriptpubkey_type: z.string(),
            spent: z.boolean(),
          }),
        ),
      }),
    )
    .query(async ({ input: { txid } }) => {
      const id = txid.replace(/^0x/, '');

      const tx = await getTxRawData({ txid: id });
      const utxos = await Promise.all(tx.vout.map((_, i) => getTxOut({ txid: id, vout: i })));

      const res = {
        txid,
        blockHeight: tx.status.block_height,
        blockHash: tx.status.block_hash,
        size: tx.size,
        fee: tx.fee,
        confirmed: tx.status.confirmed,
        vin: tx.vin.map((i) => ({
          txid: i.txid,
          vout: i.vout,
          isCoinbase: i.is_coinbase,
          scriptsig_asm: i.scriptsig_asm,
          prevout: {
            txid: i.txid,
            vout: i.vout,
            value: i.prevout?.value,
            address: i.prevout?.scriptpubkey_address,
          },
        })),
        vout: tx.vout.map((o, i) => {
          return {
            address: o.scriptpubkey_address,
            value: o.value,
            spent: utxos[i] ? false : true,
            scriptpubkey: o.scriptpubkey,
            scriptpubkey_address: o.scriptpubkey_address,
            scriptpubkey_asm: o.scriptpubkey_asm,
            scriptpubkey_type: o.scriptpubkey_type,
          };
        }),
      };

      return res;
    }),

  chainInfo: publicProcedure
    .output(
      z.object({
        fee: z.object({
          fastestFee: z.number(),
          minimumFee: z.number(),
        }),
        rgbpp: z.object({
          holdersCount: z.number().optional(),
          txCountInLast24h: z.number().optional(),
        }),
        tipBlockHeight: z.number(),
        tipBlockHash: z.string(),
        difficulty: z.number(),
      }),
    )
    .query(async () => {
      const tipHash = await tryCatchTRPC(getBestBlockHash);
      const tipBlock = await tryCatchTRPC(() => getBlock({ hash: tipHash }));

      const stats = await tryCatchTRPC(() => ckbExplorerApiV2.GET('/bitcoin_statistics'), {
        message: 'Failed to fetch bitcoin_statistics from explorer',
        code: 'INTERNAL_SERVER_ERROR',
      });

      const holdersCount = stats?.data?.data.reduce((acc, item) => acc + item.addresses_count, 0);
      // 48 samples for 24h
      const txCountInLast24h = stats?.data?.data.slice(-48).reduce((acc, item) => acc + item.transactions_count, 0);

      const block = {
        tipBlockHeight: tipBlock.height,
        tipBlockHash: tipBlock.id,
        difficulty: tipBlock.difficulty,
      };

      const fee = await tryCatchTRPC(
        async () => {
          const blockhashes = await Promise.all(
            Array.from({ length: 6 }).map((_, i) => getBlockHash({ height: tipBlock.height - i })),
          );

          const stats = await Promise.all(
            blockhashes.map((hash) =>
              request<{ maxfeerate: number; minfeerate: number }>({
                method: 'getblockstats',
                params: [hash, ['maxfeerate', 'minfeerate']],
              }),
            ),
          );

          const fastestFee = stats.reduce((acc, stat) => Math.max(acc, stat.maxfeerate), 0);
          const minimumFee = stats.reduce((acc, stat) => Math.min(acc, stat.minfeerate), Infinity);

          return { fastestFee, minimumFee };
        },
        {
          message: 'Failed to get fees from the node',
          code: 'INTERNAL_SERVER_ERROR',
        },
      );
      return { ...block, fee, rgbpp: { holdersCount, txCountInLast24h } };
    }),

  addressBase: publicProcedure.input(z.string()).query(async ({ input: address }) => {
    const data = await tryCatchTRPC(() =>
      getAddress({ address }).then((v) => {
        if (!v) {
          throw new Error('Address not found');
        }
        return v;
      }),
    );
    const result = {
      satoshis: Number(data.balance),
      txCount: data.txs,
      pendingSatoshis: Number(data.unconfirmedBalance),
    };
    return result;
  }),
});
