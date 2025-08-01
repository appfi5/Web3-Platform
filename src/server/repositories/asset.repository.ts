import { inArray } from 'drizzle-orm';
import * as R from 'remeda';

import { queryBlockAssetIds } from '~/server/api/clickhouse';

import * as schema from '../db/schema';
import { Repository } from './base.repository';

export interface IAssetRepository {
  getAssetsMapByAssetIds(
    assetIds: string[],
  ): Promise<
    Record<string, { id: string; name: string; icon: string | null; symbol: string | null; decimals: number | null }>
  >;
  getAssetNameListByBlock(
    blockHash: string,
  ): Promise<{ assetId: string; name: string | null; icon: string | null; symbol: string | null }[]>;
  getAssetsByAssetIds(assetIds: string[]): Promise<
    {
      id: string;
      name: string;
      icon: string | null;
      symbol: string | null;
      decimals: number | null;
    }[]
  >;
  getTagsByAssetIds(assetIds: string[]): Promise<Map<string, Set<string>>>;
}

export class AssetRepository extends Repository implements IAssetRepository {
  async getAssetsMapByAssetIds(assetIds: string[]) {
    const res = await this.db
      .select({
        id: schema.assetInfo.id,
        name: schema.assetInfo.name,
        icon: schema.assetInfo.icon,
        symbol: schema.assetInfo.symbol,
        decimals: schema.assetInfo.decimals,
      })
      .from(schema.assetInfo)
      .where(inArray(schema.assetInfo.id, assetIds));

    return R.mapToObj(res, (v) => [v.id, v]);
  }

  async getAssetsByAssetIds(assetIds: string[]) {
    const res = await this.db
      .select({
        id: schema.assetInfo.id,
        name: schema.assetInfo.name,
        icon: schema.assetInfo.icon,
        symbol: schema.assetInfo.symbol,
        decimals: schema.assetInfo.decimals,
      })
      .from(schema.assetInfo)
      .where(inArray(schema.assetInfo.id, assetIds));

    return res;
  }

  async getAssetNameListByBlock(
    blockHash: string,
  ): Promise<{ assetId: string; name: string | null; icon: string | null; symbol: string | null }[]> {
    const assetIds = await queryBlockAssetIds(blockHash);
    const assetsInfo = await this.db.query.assetInfo.findMany({
      where(fields, operators) {
        return operators.inArray(fields.id, assetIds);
      },
    });
    return assetsInfo.map((v) => ({
      assetId: v.id,
      name: v.name,
      icon: v.icon,
      symbol: v.symbol,
    }));
  }

  async getTagsByAssetIds(assetIds: string[]) {
    const res = await this.db
      .select({ tag: schema.assetToTag.assetTagLabel, assetId: schema.assetToTag.assetId })
      .from(schema.assetToTag)
      .where(inArray(schema.assetToTag.assetId, assetIds));

    return res.reduce((acc, cur) => {
      const tags = acc.get(cur.assetId) ?? new Set();

      if (!tags.has(cur.tag)) tags.add(cur.tag);
      acc.set(cur.assetId, tags);

      return acc;
    }, new Map<string, Set<string>>());
  }
}
