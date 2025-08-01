import { defer, first, lastValueFrom, repeat, retry, timeout } from 'rxjs';

import { clickhouse, type TxAssetDetailInsert } from '~/server/clickhouse';

export function createActivityHelper({ network }: { network: 'ckb' | 'btc' }) {
  return {
    save: async (insertValues: TxAssetDetailInsert[]): Promise<void> => {
      if (insertValues.length === 0) {
        return;
      }

      const values = insertValues
        .map(
          (item) =>
            `('${item.network}', unhex('${item.block_hash}'), ${item.block_number}, ${item.tx_index}, unhex('${item.tx_hash}'), unhex('${item.address}'), ${item.timestamp}, '${item.from_or_to}', unhex('${item.asset_id}'), ${item.value}, ${item.volume})`,
        )
        .join(',');

      await clickhouse.command({
        query: `INSERT INTO tx_asset_detail (network, block_hash, block_number, tx_index, tx_hash, address, timestamp, from_or_to, asset_id, value, volume) VALUES ${values}`,
      });

      const { block_hash, block_number } = insertValues[0]!;

      // wait for data is synced to the materialized view
      await lastValueFrom(
        defer(() =>
          clickhouse
            .query({
              query: `SELECT EXISTS (SELECT 1 FROM mv_block_info where network = '${network}' and block_number = ${block_number} and block_hash = unhex('${block_hash}')) as value`,
            })
            .then((res) => res.json<{ value: number }>().then((res) => !!res.data?.[0]?.value)),
        ).pipe(
          retry({ delay: 100 }),
          repeat({ delay: 50 }),
          first((synced) => synced),
          timeout(1000),
        ),
      );
    },

    saveBatch: async (insertValues: TxAssetDetailInsert[]): Promise<void> => {
      if (insertValues.length === 0) {
        return;
      }

      const values = insertValues
        .map(
          (item) =>
            `('${item.network}', unhex('${item.block_hash}'), ${item.block_number}, ${item.tx_index}, unhex('${item.tx_hash}'), unhex('${item.address}'), ${item.timestamp}, '${item.from_or_to}', unhex('${item.asset_id}'), ${item.value}, ${item.volume})`,
        )
        .join(',');

      await clickhouse.command({
        query: `INSERT INTO tx_asset_detail (network, block_hash, block_number, tx_index, tx_hash, address, timestamp, from_or_to, asset_id, value, volume) VALUES ${values}`,
      });
    },

    rollback: async (blockNumber: number): Promise<void> => {
      await clickhouse.query({
        query: `ALTER TABLE tx_asset_detail DELETE WHERE block_number = {blockNumber:UInt32} and network = '${network}'`,
        query_params: { blockNumber: blockNumber },
      });

      await clickhouse.query({
        query: `ALTER TABLE mv_block_info DELETE WHERE block_number = {blockNumber:UInt32} and network = '${network}'`,
        query_params: { blockNumber: blockNumber },
      });
    },
  };
}
