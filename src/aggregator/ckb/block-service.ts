import { bytes } from '@ckb-lumos/lumos/codec';
import { and, desc, eq, inArray } from 'drizzle-orm';

import { db } from '~/server/db';
import { blocks } from '~/server/db/schema';

import { type BasicBlockInfoService, type LocalBlockService } from '../types';

export function createBlockService(): BasicBlockInfoService {
  const getLastNBlockHashes: LocalBlockService['getLastNBlockInfos'] = async (n) => {
    const res = await db.query.blocks.findMany({
      where: (fields, { eq }) => eq(fields.network, 'CKB'),
      columns: { hash: true, number: true },
      limit: n,
      orderBy: desc(blocks.number),
    });

    return res.map((item) => ({ blockHash: bytes.hexify(item.hash), blockNumber: item.number }));
  };

  // const rollbackPipe = [rollbackAssetActivity, rollbackAsset, rollbackBlock];

  return {
    getLastNBlockInfos: getLastNBlockHashes,
    getBlockInfosByHeights: async (blockNumbers) => {
      const res = await db
        .select({ number: blocks.number, hash: blocks.hash })
        .from(blocks)
        .where(and(inArray(blocks.number, blockNumbers), eq(blocks.network, 'CKB')));
      return res.map((item) => ({ blockHash: item.hash, blockNumber: item.number }));
    },
    getLastBlockInfo: () => getLastNBlockHashes(1).then((res) => res?.[0] ?? null),
  };
}
