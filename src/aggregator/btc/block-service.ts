import { and, desc, eq, inArray } from 'drizzle-orm';

import { db } from '~/server/db';
import { blocks } from '~/server/db/schema';

import { type BasicBlockInfoService, type LocalBlockService } from '../types';

function removeHashPrefix(hash: string) {
  return hash.startsWith('0x') ? hash.slice(2) : hash;
}

export function createBlockService(endBlockNumber?: number): BasicBlockInfoService {
  const getLastNBlockHashes: LocalBlockService['getLastNBlockInfos'] = async (n) => {
    const res = await db.query.blocks.findMany({
      where: (fields, { eq, lte }) =>
        endBlockNumber ? and(eq(fields.network, 'BTC'), lte(fields.number, endBlockNumber)) : eq(fields.network, 'BTC'),
      columns: { hash: true, number: true },
      limit: n,
      orderBy: desc(blocks.number),
    });

    return res.map((item) => ({ blockHash: removeHashPrefix(item.hash), blockNumber: item.number }));
  };

  // const rollbackPipe = [rollbackAssetActivity, rollbackAsset, rollbackBlock];

  return {
    getLastNBlockInfos: getLastNBlockHashes,
    getBlockInfosByHeights: async (blockNumbers) => {
      const res = await db
        .select({ number: blocks.number, hash: blocks.hash })
        .from(blocks)
        .where(and(inArray(blocks.number, blockNumbers), eq(blocks.network, 'BTC')));
      return res.map((item) => ({ blockHash: removeHashPrefix(item.hash), blockNumber: item.number }));
    },
    getLastBlockInfo: () => getLastNBlockHashes(1).then((res) => res?.[0] ?? null),
  };
}
