import { clickhouse, type TxAssetDetailInsert } from '~/server/clickhouse';
import { toHexWith0x } from '~/utils/bytes';

import { type BasicBlockInfoService } from '../types';

export function createBlockService({ network }: { network: string }): BasicBlockInfoService {
  const blockService: BasicBlockInfoService = {
    getBlockInfosByHeights: async (blockNumbers: number[]) => {
      const res = await clickhouse.query({
        query: `
      SELECT
          block_number,
          '0x' || lower(hex(block_hash)) as block_hash
      FROM mv_block_info
      WHERE (block_number IN ({blockNumbers:Array(UInt32)})) AND (network = '${network}')
      GROUP BY
          block_number,
          block_hash
      `,
        query_params: { blockNumbers },
      });

      const json = await res.json<{ block_number: number; block_hash: string }>();
      return json.data.map((item) => ({
        blockNumber: item.block_number,
        blockHash: toHexWith0x(item.block_hash),
      }));
    },

    getLastNBlockInfos: async (n: number) => {
      const res = await clickhouse.query({
        query: `
      SELECT DISTINCT
          block_number,
          '0x' || lower(hex(block_hash)) as block_hash
      FROM mv_block_info
      WHERE (network = '${network}')
      ORDER BY block_number DESC
      LIMIT ${n}
      `,
      });

      const json = await res.json<{ block_number: number; block_hash: string }>();
      return json.data.map((item) => ({
        blockNumber: item.block_number,
        blockHash: toHexWith0x(item.block_hash),
      }));
    },

    getLastBlockInfo: () => {
      return blockService.getLastNBlockInfos(1).then(([last]) => last ?? null);
    },
  };

  return blockService;
}

export { clickhouse, type TxAssetDetailInsert };
