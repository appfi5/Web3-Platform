import { scheduler } from 'node:timers/promises';

import { bytes } from '@ckb-lumos/lumos/codec';
import { type Tx } from '@mempool/mempool.js/lib/interfaces/bitcoin/transactions';
import * as R from 'remeda';

import { todo } from '~/utils/unimplemented';

import { getBestBlockHash, getBestBlockHeight, getBlock, getBlockHash, getBlockTxs } from './api';
import { type BTCSourceService } from './types';

export function createSourceService(): BTCSourceService {
  const getBlockInfosByHeights: BTCSourceService['getBlockInfosByHeights'] = async (blockNumbers) => {
    if (!blockNumbers.length) return [];

    const chunks = R.chunk(blockNumbers, 1);
    const result: Awaited<ReturnType<BTCSourceService['getBlockInfosByHeights']>> = [];
    for (const chunk of chunks) {
      const tmp = (
        await Promise.allSettled(
          chunk.map(async (v) => {
            await scheduler.wait(20);
            return getBlockHash({ height: v });
          }),
        )
      ).map((v, idx) => (v.status === 'fulfilled' ? { blockHash: hexify(v.value), blockNumber: chunk[idx]! } : null));
      result.push(...tmp);
    }
    return result;
  };

  const getResolvedBlock: BTCSourceService['getResolvedBlock'] = async (blockHash) => {
    const block = await getBlock({ hash: unhexify(blockHash) });
    const txs: Tx[] = await getBlockTxs({ hash: blockHash });

    const res = {
      ...block,
      hash: hexify(blockHash),
      time: block.timestamp * 1000,
      transactions: txs.map(({ vin, vout, ...v }) => ({
        ...v,
        blockHeight: block.height,
        // use txid to replace hash BTC use txid to index tx
        hash: hexify(v.txid),
        vins: vin.map((i, index) => ({
          outpoint: {
            txid: i.txid,
            index: index,
          },
          value: i.prevout?.value ?? 0,
          address: i.prevout ? hexify(i.prevout.scriptpubkey) : '',
        })),
        vouts: vout.map((o, index) => ({
          outpoint: {
            txid: v.txid,
            index: index,
          },
          value: o.value,
          address: hexify(o.scriptpubkey),
        })),
      })),
    };
    return res;
  };

  const getResolvedBlockByNumber: BTCSourceService['getResolvedBlockByNumber'] = async (blockNumber) => {
    const [info] = await getBlockInfosByHeights([blockNumber]);
    if (!info) {
      throw new Error(`Cannot find the block hash of ${blockNumber}`);
    }
    return getResolvedBlock(info.blockHash);
  };

  const getLastBlockInfo: BTCSourceService['getLastBlockInfo'] = async () => {
    return {
      blockHash: hexify(await getBestBlockHash()),
      blockNumber: await getBestBlockHeight(),
    };
  };

  return {
    getBlockInfosByHeights,
    getLastNBlockInfos: todo,
    getResolvedBlock,
    getResolvedBlockByNumber,
    getLastBlockInfo,
  };
}

function hexify(value: string): string {
  return value.startsWith('0x') ? value : bytes.hexify(Buffer.from(value, 'hex'));
}

function unhexify(value: string): string {
  return value.startsWith('0x') ? value.substring(2) : value;
}
