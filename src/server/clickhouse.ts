import { createClient } from '@clickhouse/client';

import { env } from '~/env';

export type TxAssetDetailInsert = {
  network: 'ckb' | 'btc';
  block_hash: string;
  block_number: number;
  tx_index: number;
  tx_hash: string;
  address: string;
  timestamp: number;
  from_or_to: 'from' | 'to';
  asset_id: string;
  value: string;
  volume: string;
};

export type TxAssetDetailQueryResult = {
  network: 'ckb' | 'btc';
};

export type TxAction = {
  network: 'ckb' | 'btc';
  asset_id: string;
  block_number: number;
  tx_hash: string;
  tx_index: number;
  action: 'Mint' | 'Transfer' | 'Burn';
  from: string;
  to: string;
  value: string;
  volume: string;
  input_count: number;
  output_count: number;
  timestamp: string;
};

export const clickhouse = createClient({ url: env.CLICKHOUSE_URL });
