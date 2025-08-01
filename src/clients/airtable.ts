import 'dotenv/config';

import Airtable, { type Records } from 'airtable';
import { defer, firstValueFrom, type Observable, type ObservableInput, retry } from 'rxjs';

import { type Hash } from '~/aggregator/types';

export type Asset = {
  id: Hash;
  name: string;
  description?: string;
  symbol: string;
  decimals: number;
  icon: string;
  layer?: number;
  hot_token?: number;
  total_supply?: number;
  last_modified?: string;
  tags?: string[];
  public: boolean;
  keywords?: string;
};

export type AssetTag = {
  id: number;
  label: string;
  style?: string;
  hot_category?: number;
  asset?: string[];
  last_modified?: string;
};

export function createAirtableClient({
  apiKey = getEnv('AIRTABLE_BEARER_TOKEN', true),
  baseId = getEnv('AIRTABLE_BASE_ID', true),
}: { apiKey?: string; baseId?: string } = {}) {
  let base: Airtable.Base;
  function table<T extends Airtable.FieldSet>(tableName: string): Airtable.Table<T> {
    const tableCache = new Map<string, Airtable.Table<T>>();
    if (!base) {
      base = new Airtable({ apiKey }).base(baseId);
    }

    if (!tableCache.has(tableName)) {
      tableCache.set(tableName, base(tableName));
    }

    return tableCache.get(tableName)!;
  }

  const getAssets = createCachedFetch(() =>
    table<Partial<Asset>>('asset')
      .select()
      .all()
      .then((res): Records<Asset> => res.filter((item) => item.fields.id) as Records<Asset>),
  );
  const getAssetTags = createCachedFetch(() =>
    table<Partial<AssetTag>>('asset_tag')
      .select()
      .all()
      .then((res): Records<AssetTag> => res.filter((item) => item.fields.label && item.fields.id) as Records<AssetTag>),
  );

  return { table, getAssets, getAssetTags };
}

function createCachedFetch<T>(
  factory: () => ObservableInput<T>,
  { cacheTime = 30 * 1000 }: { cacheTime?: number } = {},
) {
  let lastUpdate = 0;
  let lastValue$: Observable<T>;

  return () => {
    const now = Date.now();
    if (lastUpdate < now - cacheTime) {
      lastUpdate = now;
      lastValue$ = defer(factory).pipe(retry({ delay: 500 }));
    }

    return firstValueFrom(lastValue$);
  };
}
function getEnv(key: string, skipThrow = false): string {
  const value = process.env[key];

  if (value == null) {
    if (skipThrow) {
      console.warn(`Environment variable ${key} is not set`);
    } else {
      throw new Error(`Environment variable ${key} is not set`);
    }
  }

  return process.env[key] ?? '';
}
