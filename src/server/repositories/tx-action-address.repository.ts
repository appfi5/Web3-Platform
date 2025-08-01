import { and, eq, inArray, like } from 'drizzle-orm';
import * as R from 'remeda';

import { queryBlockAddressAssetChange, queryBlockAssetWithMaxAmount } from '~/server/api/clickhouse';

import * as schema from '../db/schema';
import { Repository } from './base.repository';

export interface ITxActionAddressRepository {
  getTransactionsByBlockSumVolumnWithAsset(
    blockHash: string,
    sort?: 'asc' | 'desc',
    assetName?: string,
    tags?: string[],
    page?: number,
    pageSize?: number,
  ): Promise<{
    total: number;
    data: {
      amountUsd: number;
      amount: bigint;
      asset: {
        id: string;
        decimals: number | null;
        name: string;
        symbol: string | null;
        icon: string | null;
      };
    }[];
  }>;

  getAddressChangeListByTransactions(
    blockHash: string,
    sort?: 'asc' | 'desc',
    address?: string,
    page?: number,
    pageSize?: number,
  ): Promise<
    {
      address: string;
      assetId: string | null;
      value: bigint;
      volume: number;
    }[]
  >;
}

export class TxActionAddressRepository extends Repository implements ITxActionAddressRepository {
  async getAddressChangeListByTransactions(
    blockHash: string,
    sort?: 'asc' | 'desc',
    address?: string,
    page = 0,
    pageSize = 10,
  ) {
    const res = await queryBlockAddressAssetChange(blockHash, {
      address,
      sort: sort ?? 'asc',
      page,
      pageSize,
    });
    return res.map(({ hexAddress, ...v }) => ({ ...v, address: hexAddress, value: BigInt(v.value ?? 0) }));
  }

  async getTransactionsByBlockSumVolumnWithAsset(
    blockHash: string,
    sort?: 'asc' | 'desc',
    assetName?: string,
    tags?: string[],
    page = 1,
    pageSize = 10,
  ) {
    let assets: (typeof schema.assetInfo.$inferSelect)[] = [];
    if (assetName || tags?.length) {
      const res = await this.db
        .select()
        .from(schema.assetInfo)
        .leftJoin(schema.assetToTag, eq(schema.assetToTag.assetId, schema.assetInfo.id))
        .where(
          and(
            assetName ? like(schema.assetInfo.name, `%${assetName}%`) : undefined,
            tags && tags.length > 0 ? inArray(schema.assetToTag.assetTagLabel, tags) : undefined,
          ),
        );
      assets = res.map((v) => v.asset_info);
      if (!assets.length) {
        return {
          data: [],
          total: 0,
        };
      }
    }
    const res = await queryBlockAssetWithMaxAmount(blockHash, {
      orderBy: { field: 'volume', direction: sort ?? 'DESC' },
      assetIds: assets.map((v) => v.id),
      page,
      pageSize,
    });
    if (!assets.length) {
      // If no assets were found by name or tags, we need to fetch all assets in the result set
      assets = await this.db.query.assetInfo.findMany({
        where: inArray(
          schema.assetInfo.id,
          res.data.map((v) => v.assetId),
        ),
      });
    }
    const assetsMap = R.mapToObj(assets, (v) => [v.id, v]);

    return {
      total: res.total,
      data: res.data.map((v) => ({
        amountUsd: +v.volume,
        amount: BigInt(v.value),
        asset: {
          id: v.assetId,
          decimals: assetsMap[v.assetId]?.decimals ?? null,
          name: assetsMap[v.assetId]?.name ?? 'UNKNOWN',
          symbol: assetsMap[v.assetId]?.symbol ?? null,
          icon: assetsMap[v.assetId]?.icon ?? null,
        },
      })),
    };
  }
}
