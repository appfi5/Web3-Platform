import { type Script } from '@ckb-lumos/lumos';
import { and, eq, inArray } from 'drizzle-orm';
import { expressionBuilder, sql } from 'kysely';
import * as R from 'remeda';

import { NATIVE_ASSETS } from '~/constants';
import { addressConvert } from '~/lib/address';
import { nonNullable } from '~/utils/asserts';
import { bytesEqual } from '~/utils/bytes';
import { CoinMarketAssetId } from '~/utils/const';
import { unimplemented } from '~/utils/unimplemented';

import { createHelper, type Database } from '../ch';
import * as schema from '../db/schema';
import { Repository } from './base.repository';

export interface ITransactionRepository {
  getTransactionHashesByDay(from: Date, to: Date): Promise<{ txHash: string; date: string }[]>;

  getTransactionAssetsVolumeByBlock(blockHash: string): Promise<string>;

  getTransactionCKBVolumeByBlock(blockHash: string): Promise<{ volume: string; value: bigint }>;

  getAssetTransfersByBlock(
    blockHash: string,
    assetId: string,
    page: number,
    pageSize: number,
  ): Promise<
    {
      hash: string;
      amount: bigint;
      volume: number;
    }[]
  >;

  getTransactionsByBlockCountWithAsset(blockHash: string): Promise<number>;

  getTransactionCountByAssetId(blockHash: string, assetId: string): Promise<number>;

  getTransactionsByBlockSumVolumnWithAsset(
    blockHash: string,
    page?: number,
    pageSize?: number,
  ): Promise<
    {
      assetId: string;
      amount: bigint;
      volume: string;
      assetName: string | null;
      assetSymbol: string | null;
      assetIcon: string | null;
    }[]
  >;

  getAddressVolumeChangeListByAddresses(
    blockHash: string,
    addresses: string[],
    direction: 'from' | 'to',
  ): Promise<
    {
      address: string | Script | null;
      assetId: string;
      count: number;
    }[]
  >;

  getTransactionHashesByBlock(blockHash: string): Promise<string[]>;

  getTransactionCountByBlock(blockHash: string, txHash?: string): Promise<number>;

  getTransactionsByBlockSumVolumn(
    blockHash: string,
    sort?: 'desc' | 'asc',
    txHash?: string,
    page?: number,
    pageSize?: number,
  ): Promise<{
    res: {
      hash: string;
      assetId: string;
      tokenId: string | null;
      amount: string;
      volume: string;
      from: string | Script | null;
      to: string | Script | null;
      toCount: number;
      fromCount: number;
    }[];
    hasMore: boolean;
  }>;

  getTransactionListByBlock(
    blockHash: string,
    filter: {
      from?: string;
      to?: string;
      txHash?: string;
      addressCondition?: 'or' | 'and';
    },
    pagination: {
      page: number;
      pageSize: number;
    },
    volumeSort?: 'desc' | 'asc',
  ): Promise<{
    txs: {
      hash: string | null;
      txIndex: number;
      assetId: string;
      tokenId: string | null;
      amount: string;
      volume: string;
      from: string | null;
      to: string | null;
      toCount: number;
      fromCount: number;
      assetInfo: typeof schema.assetInfo.$inferSelect;
      tokenInfo: typeof schema.assetInfo.$inferSelect | null;
    }[];
    total: number;
  }>;
}

export class TransactionRepository extends Repository implements ITransactionRepository {
  async getTransactionHashesByDay(from: Date, to: Date) {
    return unimplemented();
  }

  async getTransactionAssetsVolumeByBlock(blockHash: string) {
    return unimplemented();
  }

  async getTransactionCKBVolumeByBlock(blockHash: string) {
    const [res] = await this.db
      .select({
        volume: schema.tx.volume,
        value: schema.tx.value,
      })
      .from(schema.tx)
      .where(and(eq(schema.tx.blockHash, blockHash), eq(schema.tx.assetId, CoinMarketAssetId.CKB)));

    return res ?? { volume: '0', value: 0n };
  }

  async getAssetTransfersByBlock(blockHash: string, assetId: string, page = 1, pageSize = 10) {
    const { hex, unhex } = createHelper<Database, 'tx_action'>();
    const res = await this.ch
      .selectFrom('tx_action')
      .select([(eb) => eb.ref('value').as('amount'), 'volume', hex('tx_hash', 'hash')])
      .where((eb) => eb.and([eb('block_hash', '=', unhex(blockHash)), eb('asset_id', '=', unhex(assetId))]))
      .limit(pageSize)
      .offset((page - 1) * pageSize)
      .execute();

    return R.map(res, R.evolve({ amount: BigInt, volume: Number }));
  }

  async getTransactionCountByAssetId(blockHash: string, assetId: string): Promise<number> {
    const { unhex } = createHelper<Database, 'tx_action'>();
    const res = await this.ch
      .selectFrom('tx_action')
      .select((eb) => eb.fn.count('tx_hash').as('count'))
      .where((eb) => eb.and([eb('block_hash', '=', unhex(blockHash)), eb('asset_id', '=', unhex(assetId))]))
      .executeTakeFirst();

    return Number(res?.count ?? 0);
  }

  async getAddressVolumeChangeListByAddresses(blockHash: string, addresses: string[], direction: 'from' | 'to') {
    return unimplemented();
  }

  async getTransactionCountByBlock(blockHash: string, txHash?: string) {
    return unimplemented();
  }

  async getTransactionHashesByBlock(blockHash: string) {
    return unimplemented();
  }

  async getTransactionsByBlockCountWithAsset(blockHash: string) {
    return unimplemented();
  }

  async getTransactionsByBlockSumVolumnWithAsset(blockHash: string, page = 0, pageSize = 10) {
    return unimplemented();
  }

  async countTransactionsByBlock(blockHash: string) {
    return unimplemented();
  }

  async getTransactionsByBlockSumVolumn(
    blockHash: string,
    sort?: 'desc' | 'asc',
    txHash?: string,
    page = 0,
    pageSize = 10,
  ) {
    return unimplemented();
  }

  async getTransactionListByBlock(
    blockHash: string,
    filter: {
      from?: string;
      to?: string;
      txHash?: string;
      addressCondition?: 'or' | 'and';
    },
    pagination: {
      page: number;
      pageSize: number;
    } = {
      page: 1,
      pageSize: 10,
    },
    volumeSort?: 'desc' | 'asc',
  ) {
    const { hex, unhex } = createHelper<Database, 'tx_action'>();
    const eb = expressionBuilder<Database, 'tx_action'>();

    const condition = eb.and(
      [
        filter.txHash && eb('tx_hash', '=', unhex(filter.txHash)),
        eb('block_hash', '=', unhex(blockHash)),
        filter.addressCondition === 'and' && filter.from && filter.to
          ? eb.and([eb('from', '=', unhex(filter.from)), eb('to', '=', unhex(filter.to))])
          : (filter.from || filter.to) &&
            eb.or(
              [filter.from && eb('from', '=', unhex(filter.from)), filter.to && eb('to', '=', unhex(filter.to))].filter(
                (x) => !!x,
              ),
            ),
      ].filter((x) => !!x),
    );

    const totalRes = await this.ch
      .selectFrom('tx_action')
      .select(sql<number | string>`countDistinct((block_number, tx_index))`.as('count'))
      .where(condition)
      .executeTakeFirst();

    const res = await this.ch
      .selectFrom(
        this.ch
          .selectFrom('tx_action')
          .select([
            hex('tx_hash', 'txHash'),
            'tx_index',
            hex('asset_id'),
            'network',
            'value',
            'volume',
            hex('from', 'fromAddress'),
            hex('to', 'toAddress'),
            'input_count',
            'output_count',
            'tx_index',
            sql<number | string>`ROW_NUMBER() OVER (PARTITION BY tx_hash ORDER BY volume DESC)`.as('rn'),
          ])
          .where(condition)
          .as('sq'),
      )
      .selectAll()
      .where('sq.rn', '=', 1)
      .orderBy(volumeSort === 'desc' ? 'sq.volume desc' : volumeSort === 'asc' ? 'sq.volume asc' : 'sq.tx_index asc')
      .limit(pagination.pageSize)
      .offset((pagination.page - 1) * pagination.pageSize)
      .execute();

    const assetInfos = await this.db.query.assetInfo.findMany({
      where: inArray(schema.assetInfo.id, Array.from(new Set(res.map((v) => v.asset_id)))),
    });

    return {
      txs: res.map((tx) => {
        const assetId = tx.network === 'ckb' ? NATIVE_ASSETS.CKB : NATIVE_ASSETS.BTC;
        const tokenId =
          !bytesEqual(tx.asset_id, NATIVE_ASSETS.CKB) && !bytesEqual(tx.asset_id, NATIVE_ASSETS.BTC)
            ? tx.asset_id
            : null;

        return {
          hash: tx.txHash,
          txIndex: tx.tx_index,
          assetId,
          tokenId,
          amount: tx.value.toString(),
          volume: tx.volume.toString(),
          from: addressConvert.fromCH(tx.fromAddress, tx.network),
          to: addressConvert.fromCH(tx.toAddress, tx.network),
          fromCount: tx.input_count,
          toCount: tx.output_count,
          assetInfo: nonNullable(assetInfos.find((item) => bytesEqual(item.id, tx.asset_id))),
          tokenInfo: assetInfos.find((item) => bytesEqual(item.id, tx.asset_id)) ?? null,
        };
      }),
      total: Number(totalRes?.count ?? 0),
    };
  }
}
