import { sql } from 'kysely';

import { env } from '~/env';
import { addressConvert, remove0x } from '~/lib/address';
import { clickhouse } from '~/server/clickhouse';
import { toHexNo0x } from '~/utils/bytes';

import { ch, createHelper, type Database, type Network } from '../ch';

export async function query<R>(p: Parameters<typeof clickhouse.query<'JSON'>>[0]) {
  const res = await clickhouse.query(p);
  const json = await res.json<R>();
  return json.data;
}

interface PaginationOptions {
  table: string;
  select: string;
  orderBy: { field: string; direction: 'ASC' | 'DESC' | 'asc' | 'desc' };
  filter?: string;
  params?: Record<string, unknown>;
  page: number;
  pageSize: number;
  selectTotal?: string;
}

interface PaginationResult<T> {
  data: T[];
  total: number;
  currentPage: number;
  totalPages: number;
  hasMore: boolean;
}

export async function queryWithPagination<T>({
  table,
  orderBy,
  page = 1,
  pageSize = 10,
  select = 'select *',
  filter,
  params = {},
  selectTotal,
}: PaginationOptions): Promise<PaginationResult<T>> {
  if (select.endsWith(',')) {
    throw new Error('Select should not end with ","');
  }
  const total =
    (
      await query<{ total: number }>({
        query: `SELECT count() AS total FROM (${selectTotal ?? 'SELECT 1'} from ${table} ${filter ?? ''})`,
        query_params: params,
      })
    ).at(-1)?.total ?? 0;
  const offset = (page - 1) * pageSize;
  const data = await query<T & { rn: string }>({
    query: `
      WITH numbered_data AS (
        ${select}, row_number() OVER (ORDER BY ${orderBy.field.toString()} ${orderBy.direction}) AS rn
        FROM ${table}
        ${filter ?? ''}
        ORDER BY ${orderBy.field.toString()} ${orderBy.direction}
      )
      SELECT *
      FROM numbered_data
      WHERE rn BETWEEN {start: UInt32} AND {end: UInt32};
    `,
    query_params: {
      ...params,
      start: offset + 1,
      end: offset + pageSize,
    },
  });
  const totalPages = Math.ceil(total / pageSize);

  return {
    data,
    total: +total,
    currentPage: page,
    totalPages,
    hasMore: +(data.at(-1)?.rn ?? 0) < total,
  };
}

export async function queryBlockAssetIds(blockHash: string) {
  const res = await query<{ assetId: string }>({
    query: `
        SELECT
          lower(concat('0x', hex(asset_id))) AS assetId
        FROM tx_asset_detail
        WHERE block_hash=unhex({blockHash: String})
        GROUP BY asset_id;
    `,
    query_params: { blockHash: toHexNo0x(blockHash) },
  });
  return res.map((v) => v.assetId);
}

export function queryBlockAssetsAndVolume(blockHash: string) {
  const { hex, unhex } = createHelper<Database, 'tx_action'>();
  return ch
    .selectFrom('tx_action')
    .select([(eb) => eb.fn<string>('sum', ['volume']).as('volume'), hex('asset_id', 'assetId')])
    .where('block_hash', '=', unhex(blockHash))
    .groupBy('asset_id')
    .execute();
}

export async function queryBlockAddressAssetChange(
  blockHash: string,
  {
    address,
    sort,
    page,
    pageSize,
  }: {
    address?: string;
    sort: 'desc' | 'asc';
    page: number;
    pageSize: number;
  } = {
    sort: 'asc',
    page: 1,
    pageSize: 10,
  },
) {
  const { hex, unhex } = createHelper<Database, 'tx_asset_detail'>();
  let addresses = address ? [address] : [];
  if (!address) {
    const tmp = await ch
      .selectFrom('tx_asset_detail')
      .select([
        hex('address'),
        sql<number>`SUM(multiIf(from_or_to = 'from', -volume, from_or_to = 'to', volume,0))`.as('volume'),
      ])
      .where('block_hash', '=', unhex(blockHash))
      .groupBy('address')
      .orderBy('volume', sort)
      .limit(pageSize)
      .offset((page - 1) * pageSize)
      .execute();
    addresses = tmp.map((v) => v.address);
  }
  if (!addresses.length) {
    return [];
  }
  return ch
    .selectFrom('tx_asset_detail')
    .select([
      hex('asset_id', 'assetId'),
      sql<number>`SUM(multiIf(from_or_to = 'from', -volume, from_or_to = 'to', volume,0))`.as('volume'),
      sql<string>`SUM(multiIf(from_or_to = 'to', value, 0)) - SUM(multiIf(from_or_to = 'from', value, 0))`.as('value'),
      hex('address', 'hexAddress'),
    ])
    .where('block_hash', '=', unhex(blockHash))
    .where(
      'address',
      'in',
      addresses.map((v) => unhex(v)),
    )
    .groupBy('asset_id')
    .groupBy('address')
    .orderBy('volume', sort)
    .execute();
}

export function queryAssetHolders(assetId: string) {
  return query<{ amount: string; address: string }>({
    query: `
SELECT
    hex(address) AS address,
    sum(balance) AS amount
FROM address_asset_balance
WHERE asset_id = unhex({assetId: String})
GROUP BY address
ORDER BY amount DESC
LIMIT 5000
`,
    query_params: { assetId: toHexNo0x(assetId) },
    clickhouse_settings: env.NODE_ENV === 'production' ? { use_query_cache: 1, query_cache_ttl: 60 } : undefined,
  });
}

export function queryAssetTotalSupply(assetId: string) {
  return query<{ value: string }>({
    query: `SELECT sum(balance) as value FROM address_asset_balance WHERE asset_id=unhex({assetId: String});`,
    query_params: { assetId: toHexNo0x(assetId) },
    clickhouse_settings: env.NODE_ENV === 'production' ? { use_query_cache: 1, query_cache_ttl: 60 } : undefined,
  });
}

export async function queryBlockAddressCount(blockHash: string, address?: string) {
  const { unhex } = createHelper<Database, 'tx_action'>();
  const res = await ch
    .selectFrom('tx_asset_detail')
    .select([(eb) => eb.fn<number>('uniq', ['address']).as('count')])
    .where('block_hash', '=', unhex(blockHash))
    .$if(!!address, (qb) => qb.where('address', '=', unhex(address!)))
    .executeTakeFirst();
  return +(res?.count ?? 0);
}

// query all asset in the block and return the asset with the max amount(from or to) in a transaction
export function queryBlockAssetWithMaxAmount(
  blockHash: string,
  {
    page,
    pageSize,
    orderBy,
    assetIds,
  }: { page: number; pageSize: number; orderBy: PaginationOptions['orderBy']; assetIds?: string[] },
) {
  return queryWithPagination<{ assetId: string; volume: number; value: string }>({
    select: `SELECT lower(concat('0x', hex(asset_id))) AS assetId, SUM(volume) AS volume, SUM(value) AS value`,
    table: 'tx_action',
    orderBy,
    filter: `WHERE block_hash=unhex({blockHash: String}) ${assetIds?.length ? 'AND assetId IN {assetIds: Array(String)}' : ''} GROUP BY asset_id`,
    params: { blockHash: toHexNo0x(blockHash), assetIds },
    page,
    pageSize,
    selectTotal: `SELECT DISTINCT(lower(concat('0x', hex(asset_id)))) AS assetId`,
  });
}

export function queryAddressAssetsChangeInBlock(
  blockHash: string,
  address: string,
  { page, pageSize }: { page: number; pageSize: number },
) {
  return queryWithPagination<{ assetId: string; volume: number; input: string; output: string }>({
    table: 'tx_asset_detail',
    select: `
      SELECT
        lower(concat('0x', hex(asset_id))) AS assetId,
        SUM(
          multiIf(
            from_or_to = 'from', -volume,
            from_or_to = 'to', volume,
            0
          )
        ) AS volume,
        SUM(multiIf(from_or_to = 'from', value, NULL)) AS input,
        SUM(multiIf(from_or_to = 'to', value, NULL)) AS output
    `,
    orderBy: { field: 'volume', direction: 'DESC' },
    filter: `WHERE block_hash=unhex({blockHash: String}) AND address=unhex({address: String}) GROUP BY asset_id`,
    params: { blockHash: toHexNo0x(blockHash), address: toHexNo0x(address) },
    page,
    pageSize,
  });
}

export async function queryAddressTx({
  addresses,
  asset,
  network,
  orderKey,
  order,
  page,
  pageSize,
}: {
  addresses: string[];
  asset?: string;
  network?: Network;
  orderKey: string;
  order: 'asc' | 'desc';
  page: number;
  pageSize: number;
}) {
  if (addresses.length === 0) {
    return [];
  }
  const { unhex, hex } = createHelper<Database, 'tx_asset_detail'>();

  let query = ch
    .selectFrom('tx_asset_detail')
    .select([
      hex('tx_hash', 'txHash'),
      (eb) => eb.fn<string>('any', ['tx_index']).as('txIndex'),
      sql<number>`min(timestamp)`.as('timestamp'),
      sql<string>`any(network)`.as('networks'),
      hex('address', 'addr'),
      sql<number>`any(block_number)`.as('blockNumber'),
      ...(orderKey === 'change'
        ? [
            sql<number>`SUM(CASE WHEN from_or_to = 'to' THEN toFloat64(volume) ELSE 0 END) -
                    SUM(CASE WHEN from_or_to = 'from' THEN toFloat64(volume) ELSE 0 END)`.as('changeVolume'),
          ]
        : []),
      ...(orderKey === 'asset' ? [sql<number>`COUNT(DISTINCT asset_id)`.as('assetsCount')] : []),
    ])
    .where(
      'address',
      'in',
      addresses.map((v) => unhex(v)),
    );

  if (!!asset) {
    query = query.where('asset_id', '=', unhex(asset));
  }

  if (!!network) {
    query = query.where('network', '=', network);
  }

  const addressTxs = await query
    .groupBy(['tx_hash', 'address'])
    .orderBy(
      (() => {
        if (orderKey === 'change') {
          return 'changeVolume';
        }
        if (orderKey === 'asset') {
          return 'assetsCount';
        }
        return 'timestamp';
      })(),
      order,
    )
    .orderBy('txIndex asc')
    .limit(pageSize)
    .offset((page - 1) * pageSize)
    .execute();

  return addressTxs.map((tx) => ({
    txHash: tx.txHash,
    timestamp: tx.timestamp * 1000,
    network: tx.networks as Network,
    blockNumber: tx.blockNumber,
    address: tx.addr,
  }));
}

export async function queryAddressTxCount(addresses: string[], recentMonths: number) {
  if (addresses.length === 0) {
    return [];
  }

  const { unhex } = createHelper<Database, 'tx_asset_detail'>();

  return ch
    .selectFrom('tx_asset_detail')
    .select([
      sql<string>`formatDateTime(toStartOfMonth(timestamp), '%Y-%m')`.as('month'),
      (eb) => eb.fn<number>('uniq', ['tx_hash']).as('count'),
    ])
    .where(
      'address',
      'in',
      addresses.map((v) => unhex(v)),
    )
    .where('timestamp', '>=', sql<number>`addMonths(now(), -${recentMonths})`)
    .groupBy('month')
    .orderBy('month')
    .execute();
}

export async function queryBlockAssetTotal(blockHash: string, assetId: string) {
  const res = await query<{ value: string; volume: string }>({
    query: `
      SELECT SUM(value) AS value, SUM(volume) AS volume
      FROM tx_action
      WHERE block_hash=unhex({blockHash: String}) AND asset_id=unhex({assetId: String})
    `,
    query_params: { blockHash: toHexNo0x(blockHash), assetId: toHexNo0x(assetId) },
  });
  return res.at(-1) ?? { value: '0', volume: '0' };
}

export async function queryTotalTxCount({
  addresses,
  asset,
  network,
}: {
  addresses: string[];
  asset?: string;
  network?: Network;
}) {
  if (addresses.length === 0) {
    return 0;
  }

  const addrs = addresses.map((address) => `unhex('${toHexNo0x(address)}')`).join(',');

  const countsQuery = `
    SELECT 
      count(DISTINCT tx_hash) as count FROM (
        SELECT DISTINCT tx_hash 
        FROM tx_asset_detail
        WHERE 
          address IN (${addrs})
          ${(() => {
            let filter = '';
            if (!!asset) {
              filter += `AND asset_id = unhex({asset:String})`;
            }

            if (!!network) {
              filter += `AND network = {network:String}`;
            }

            return filter;
          })()}
        LIMIT 5000
      )
    `;
  const countsResult = await query<{ count: string }>({
    query: countsQuery,
    query_params: {
      asset: remove0x(asset ?? ''),
      network,
    },
    format: 'JSON',
  });

  return +(countsResult[0]?.count ?? 0);
}

export async function queryTimestampByTxHash(txHashes: string[]) {
  const { hex, unhex } = createHelper<Database, 'tx_asset_detail'>();

  if (!txHashes.length) {
    return [];
  }

  return ch
    .selectFrom('tx_asset_detail')
    .select([sql<string>`min(timestamp)`.as('timestamp'), sql<string>`lower(concat('0x', hex(tx_hash)))`.as('txHash')])
    .where(
      'tx_hash',
      'in',
      txHashes.map((v) => unhex(toHexNo0x(v))),
    )
    .groupBy('tx_hash')
    .execute();
}

export async function queryTimestampByBlockNumber(blockNumbers: number[]) {
  if (!blockNumbers.length) {
    return [];
  }

  return ch
    .selectFrom('tx_asset_detail')
    .select([sql<string>`min(timestamp)`.as('timestamp'), sql<string>`block_number`.as('blockNumber')])
    .where('block_number', 'in', blockNumbers)
    .groupBy('block_number')
    .execute();
}

export async function queryTxAssetChanges(txHashes: string[]) {
  if (!txHashes.length) {
    return [];
  }
  const txHashesStr = txHashes.map((v) => `unhex('${toHexNo0x(v)}')`).join(',');
  const res = await query<{
    assetId: string;
    amount: string;
    amountUsd: number;
    address: string;
    txHash: string;
  }>({
    query: `
      SELECT
        lower(concat('0x', hex(asset_id))) AS assetId,
        sum(if(from_or_to = 'from', -toFloat64(volume), toFloat64(volume))) AS amountUsd,
        (SUM(multiIf(from_or_to = 'to', value, 0)) - SUM(multiIf(from_or_to = 'from', value, 0))) as amount,
        lower(concat('0x', hex(address))) AS address,
        lower(concat('0x', hex(tx_hash))) AS txHash
      FROM tx_asset_detail
      WHERE tx_hash IN (${txHashesStr})
      GROUP BY tx_hash,asset_id,address;
    `,
  });
  return res;
}

export async function queryTxAddresses(txHashes: string[]) {
  if (!txHashes.length) {
    return [];
  }
  const txHashesStr = txHashes.map((v) => `unhex('${toHexNo0x(v)}')`).join(',');
  const res = await query<{
    address: string;
    fromOrTo: 'from' | 'to';
    txHash: string;
  }>({
    query: `
      SELECT
        lower(concat('0x', hex(address))) AS address,
        lower(concat('0x', hex(tx_hash))) AS txHash,
        any(from_or_to) AS fromOrTo
      FROM tx_asset_detail
      WHERE tx_hash IN (${txHashesStr})
      GROUP BY from_or_to, address,tx_hash;
    `,
  });
  return res;
}

export async function queryAddressesAssets(addresses: string[]) {
  if (addresses.length === 0) {
    return [];
  }

  const { hex, unhex } = createHelper<Database, 'tx_asset_detail'>();
  let query = ch
    .selectFrom('tx_asset_detail')
    .select([
      hex('asset_id', 'assetId'),
      sql<string>`SUM(multiIf(from_or_to = 'to', value, 0)) - SUM(multiIf(from_or_to = 'from', value, 0))`.as(
        'balance',
      ),
    ]);

  if (addresses.length === 1) {
    query = query.where('address', '=', unhex(addressConvert.toCH(addresses[0]!)));
  } else {
    query = query.where(
      'address',
      'in',
      addresses.map((v) => unhex(addressConvert.toCH(v))),
    );
  }

  return query.groupBy('asset_id').orderBy('asset_id', 'asc').execute();
}

function timestamp(columnNameWithDateTimeType = 'timestamp') {
  return `toUnixTimestamp(${columnNameWithDateTimeType}) * 1000`;
}
