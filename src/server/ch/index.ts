import { type Script } from '@ckb-lumos/lumos';
import { blockchain } from '@ckb-lumos/lumos/codec';
import { ClickhouseDialect } from '@founderpath/kysely-clickhouse';
import {
  type AliasedExpression,
  expressionBuilder,
  type ExpressionWrapper,
  Kysely,
  type ReferenceExpression,
  type StringReference,
} from 'kysely';

import { env } from '~/env';
import { toHexNo0x, toHexWith0x } from '~/utils/bytes';

export type Network = 'ckb' | 'btc';
interface TxAssetDetailTable {
  network: Network;
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
}

interface TxActionTable {
  network: Network;
  asset_id: string;
  block_hash: string;
  block_number: number;
  tx_index: number;
  tx_hash: string;
  action: 'Mint' | 'Burn' | 'Transfer';
  from: string;
  to: string;
  value: string;
  volume: string;
  input_count: number;
  output_count: number;
  timestamp: number;
}

interface BlockInfoTable {
  network: Network;
  block_hash: string;
  block_number: number;
}

export interface Database {
  tx_asset_detail: TxAssetDetailTable;
  tx_action: TxActionTable;
  mv_block_info: BlockInfoTable;
}

export const ch: Kysely<Database> = new Kysely<Database>({
  dialect: new ClickhouseDialect({
    options: {
      url: env.CLICKHOUSE_URL,
      clickhouse_settings: { date_time_output_format: 'unix_timestamp' },
    },
  }),
});

// Define a type that transforms {field}_hex: string to {field}: string
type NormalizeHex<T extends object> = {
  [K in keyof T as K extends `${infer Field}_hex` ? Field : K]: K extends `${infer _}_hex` ? `0x${string}` : T[K];
};

/**
 *
 * @param obj convert fields in object like `{field}_hex: '001122'` to `{field}: '0x001122'`
 * @returns
 */
export function normalizeHexKeys<T extends object>(obj: T): NormalizeHex<T> {
  const result: Record<string, unknown> = {};
  for (const key in obj) {
    if (key.endsWith('_hex')) {
      result[key.slice(0, -4)] = toHexWith0x((obj[key] ?? '0x') as string);
    } else {
      result[key] = obj[key];
    }
  }
  return result as NormalizeHex<T>;
}

export function createHelper<DB, TB extends keyof DB>() {
  const eb = expressionBuilder<DB, TB>();

  function hex<C extends StringReference<DB, TB>>(col: C): AliasedExpression<string, C>;
  function hex<C extends StringReference<DB, TB>>(col: C, withHexSuffix: true): AliasedExpression<string, `${C}_hex`>;
  function hex<C extends StringReference<DB, TB>, A extends string>(col: C, alias: A): AliasedExpression<string, A>;
  function hex<C extends string, A extends string>(col: C, alias: A): AliasedExpression<string, A>;
  function hex<C extends string>(col: C): AliasedExpression<string, C>;
  function hex(col: string, alias?: string | true): AliasedExpression<string, string> {
    const as: string = typeof alias === 'string' ? alias : alias === true ? `${col.toString()}_hex` : col.toString();
    if (!as) {
      throw new Error('alias is required');
    }
    return eb.fn<string>('lower', [eb.fn<string>(`'0x' || hex`, [col as ReferenceExpression<DB, TB>])]).as(as);
  }

  function unhex(val: Uint8Array | string | Script): ExpressionWrapper<DB, TB, string> {
    const value = typeof val === 'object' && 'codeHash' in val ? blockchain.Script.pack(val) : val;
    return eb.fn<string>('unhex', [eb.val(toHexNo0x(value))]);
  }

  return { hex, unhex, normalizeHex: normalizeHexKeys };
}
