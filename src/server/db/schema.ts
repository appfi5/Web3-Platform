// Example model schema from the Drizzle docs
// https://orm.drizzle.team/docs/sql-schema-declaration

import { type HexString, type Script } from '@ckb-lumos/lumos';
import { blockchain } from '@ckb-lumos/lumos/codec';
import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  customType,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTableCreator,
  primaryKey,
  real,
  serial,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

import { PROTOCOLS } from '~/lib/constant';

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = pgTableCreator((name) => `web3platform_${name}`);

function exchangePgHexToBuffer(data: Buffer | string) {
  if (typeof data === 'string') {
    if (!data.startsWith('\\x')) throw new Error('The pg bytea Hex Format should start with \\x ');
    return Buffer.from(data.replace('\\x', ''), 'hex');
  }
  return data;
}
export function assetIdToDriver(val: string) {
  return Buffer.from(val.startsWith('0x') ? val.slice(2) : val, 'hex');
}

const pgAssetId = customType<{ data: string; driverData: Buffer }>({
  dataType() {
    return 'bytea';
  },
  toDriver: assetIdToDriver,
  fromDriver(val) {
    const res = val.toString('hex').replace('\\x', '0x');
    return res.startsWith('0x') ? res : `0x${res}`;
  },
});

const pgHash = customType<{ data: HexString; driverData: Buffer }>({
  dataType() {
    return 'bytea';
  },
  toDriver(val) {
    return Buffer.from(val.startsWith('0x') ? val.slice(2) : val, 'hex');
  },
  fromDriver(val) {
    const res = val.toString('hex').replace('\\x', '0x');
    return res.startsWith('0x') ? res : `0x${res}`;
  },
});

const pgScript = customType<{ data: Script | string; driverData: Buffer }>({
  dataType() {
    return 'bytea';
  },
  toDriver(value) {
    if (typeof value === 'string') {
      return Buffer.from(value, 'binary');
    }
    return Buffer.from(blockchain.Script.pack(value).buffer);
  },
  fromDriver(value) {
    const bufferValue = exchangePgHexToBuffer(value);
    try {
      return blockchain.Script.unpack(bufferValue);
    } catch {
      return bufferValue.toString('binary');
    }
  },
});

// [-2^256, 2^256 - 1]
const bigint = customType<{ data: bigint; driverData: string }>({
  dataType: () => 'numeric(78)',
  toDriver: (val) => val.toString(),
  fromDriver: (val) => BigInt(val),
});

export const assetInfo = createTable('asset_info', {
  id: pgAssetId('id').primaryKey(),
  layer: integer('layer').notNull(),
  parentId: pgAssetId('parent_id'),
  name: varchar('name').notNull(),
  totalSupply: bigint('total_supply'),
  decimals: integer('decimals'),
  description: varchar('description').default(''),
  icon: varchar('icon'),
  symbol: varchar('symbol'),
  keywords: varchar('keywords'),
  meta: jsonb('meta').$type<{ typeHash?: string }>().default({}),
  style: jsonb('style').default({}),

  public: boolean('public').default(false).notNull(),
  firstFoundBlock: pgHash('first_found_block'),
  firstMintAt: timestamp('first_mint_at'),
});

export const assetInfoRelations = relations(assetInfo, ({ many, one }) => ({
  assetInfoStats: one(assetStats),
  addressAssets: many(addressAsset),
  holders: many(holders),
  latestMarket: one(lastestMarket, {
    fields: [assetInfo.id],
    references: [lastestMarket.assetId],
  }),
  tx: many(tx, {
    relationName: 'tx_asset',
  }),
  parent: one(assetInfo, {
    fields: [assetInfo.parentId],
    references: [assetInfo.id],
  }),
  assetToTag: many(assetToTag),
  assetProtocol: many(assetToProtocol),
}));

// export const assetTagLabel = pgEnum('asset_tag_label', ['RGB++']);

export const assetTag = createTable('asset_tag', {
  id: serial('id').primaryKey(),
  label: varchar('label').unique().notNull(),
  style: varchar('style'),
});

export const assetTagRelations = relations(assetTag, ({ many }) => ({
  assetToTag: many(assetToTag),
}));

export const assetToTag = createTable(
  'asset_to_tag',
  {
    assetId: pgAssetId('asset_id')
      .notNull()
      .references(() => assetInfo.id),
    assetTagLabel: varchar('asset_tag_label')
      .notNull()
      .references(() => assetTag.label),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.assetId, table.assetTagLabel] }),
  }),
);

export const assetToTagRelations = relations(assetToTag, ({ one }) => ({
  assetInfo: one(assetInfo, {
    fields: [assetToTag.assetId],
    references: [assetInfo.id],
  }),
  assetTag: one(assetTag, {
    fields: [assetToTag.assetTagLabel],
    references: [assetTag.label],
  }),
}));

export const assetProtocolEnum = pgEnum('asset_protocol', PROTOCOLS);
export type AssetProtocolEnum = (typeof assetProtocolEnum.enumValues)[number];

export const assetToProtocol = createTable(
  'asset_to_protocol',
  {
    assetId: pgAssetId('asset_id').notNull(),
    protocol: assetProtocolEnum('protocol').notNull(),
  },
  (t) => [unique().on(t.assetId, t.protocol), index('asset_to_protocol_asset_id_idx').on(t.assetId)],
);

export const assetStats = createTable('asset_stats', {
  id: serial('id').primaryKey(),
  assetId: pgAssetId('asset_id')
    .references(() => assetInfo.id)
    .unique()
    .notNull(),
  holderCount: integer('holder_count').notNull().default(0),
  transactionCount: integer('transaction_count').notNull().default(0),
});

export const assetStatsRelations = relations(assetStats, ({ one }) => ({
  assetInfo: one(assetInfo, {
    fields: [assetStats.assetId],
    references: [assetInfo.id],
  }),
}));

export const networkEnum = pgEnum('network', ['CKB', 'BTC']);

export const blocks = createTable(
  'blocks',
  {
    network: networkEnum('network').notNull(),
    hash: pgHash('hash').primaryKey(),
    number: integer('number').notNull(),
    txCount: integer('tx_count').notNull(),
  },
  (table) => ({
    blockNumberIndex: index('blocks_number').on(table.number),
  }),
);

export const tx = createTable(
  'tx',
  {
    hash: pgHash('hash').primaryKey(),
    index: integer('index').notNull(),
    blockHash: pgHash('block_hash'),
    assetId: pgAssetId('asset_id')
      .notNull()
      .references(() => assetInfo.id),
    tokenId: pgAssetId('token_id').references(() => assetInfo.id),
    committedTime: timestamp('committed_time'),
    submittedTime: timestamp('submitted_time').notNull(),
    from: pgScript('from'),
    to: pgScript('to'),
    volume: numeric('volume', { precision: 30, scale: 10 }).notNull().default('0'),
    value: bigint('value', { mode: 'bigint' }).notNull(),
    inputCount: integer('input_count').default(0).notNull(),
    outputCount: integer('output_count').default(0).notNull(),
  },
  (table) => ({
    assetIdIndex: index('tx_asset_id').on(table.assetId),
    committedTimeIndex: index('tx_committed_time_index').on(table.committedTime),
    blockHashHashIndex: index('tx_block_hash_hash_idx').on(table.blockHash, table.hash),
    orderIndex: index('tx_submitted_time_tx_index').on(table.submittedTime, table.index),
  }),
);

export const holders = createTable('holders', {
  address: pgScript('address').notNull(),
  assetId: pgAssetId('asset_id')
    .notNull()
    .references(() => assetInfo.id),
  amount: numeric('volume', { precision: 30, scale: 10 }).notNull(),
  value: bigint('value', { mode: 'bigint' }).notNull(),
  createdAt: timestamp('created_at')
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
});

export const addressOverview = createTable(
  'address_overview',
  {
    address: pgScript('address').primaryKey(),
    received: numeric('received', { precision: 30, scale: 10 }).default('0').notNull(),
    sent: numeric('send', { precision: 30, scale: 10 }).default('0').notNull(),
    volume: numeric('volume', { precision: 30, scale: 10 }).default('0').notNull(),
    txCount: integer('transaction_count').default(0).notNull(),
  },
  (table) => ({
    addressIndex: index('address_overview_address').on(table.address),
  }),
);

export const addressAsset = createTable(
  'address_asset',
  {
    address: pgScript('address').notNull(),
    // TODO bypass for development only, uncomment me before production ready
    // .references(() => assetInfo.id),
    assetId: pgAssetId('asset_id').notNull(),
    assetAmount: numeric('asset_amount', { precision: 78, scale: 10 }).notNull(),
    createdAt: timestamp('created_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
  },
  (table) => {
    return {
      pk: unique().on(table.address, table.assetId),
      addressIndex: index('address_asset_address_idx').on(table.address),
      assetIdIndex: index('address_asset_asset_id_idx').on(table.assetId),
    };
  },
);

export const addressAssetRelation = relations(addressAsset, ({ one }) => ({
  assetInfo: one(assetInfo, {
    fields: [addressAsset.assetId],
    references: [assetInfo.id],
  }),
}));

export const addressTx = createTable(
  'address_tx',
  {
    network: networkEnum('network').notNull().default('CKB'),
    address: pgScript('address').notNull(),
    txHash: pgHash('tx_hash').notNull(),
    txIndex: integer('tx_index').notNull(),
    time: timestamp('time').notNull(),
    blockNumber: integer('block_number').notNull(),
    // fromAddresses: pgScript('from_addresses').notNull().array().default([]),
    // toAddresses: pgScript('to_addresses').notNull().array().default([]),
    // changes: jsonb('changes')
    //   .array()
    //   .$type<
    //     Array<{
    //       assetId: string;
    //       value: string;
    //       volume: string;
    //     }>
    //   >()
    //   .notNull()
    //   .default([]),
    changeVolume: numeric('change_volume', { precision: 30, scale: 10 }).notNull().default('0'),
    assetsCount: integer('assets_count').notNull().default(0),
    assets: text('assets').array().default([]),
    // input or output, 0-input, 1-output, 2-input&output
    io: smallint('io'),
    createdAt: timestamp('created_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
  },
  (table) => ({
    addressIndex: index('address_tx_address').on(table.address),
    blockIndex: index('block_number').on(table.blockNumber),
    networkIndex: index('network_number').on(table.network),
  }),
);

export const lastestMarket = createTable('latest_market', {
  assetId: pgAssetId('asset_id')
    .primaryKey()
    .references(() => assetInfo.id),
  price: numeric('price', { precision: 20, scale: 10 }),
  highestPrice: numeric('highest_price', { precision: 20, scale: 10 }),
  totalSupply: numeric('total_supply', { precision: 50, scale: 10 }),
  maxSupply: numeric('max_supply', { precision: 40, scale: 2 }),
  percentChange24h: real('percent_change_24h'),
  marketCap: numeric('market_cap', { precision: 50, scale: 10 }),
  volume24h: numeric('volume_24h', { precision: 30, scale: 10 }),
  txs24h: integer('txs_24h').default(0),
  dataSource: varchar('data_source'),
  createdAt: timestamp('created_at')
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
});

export const lastestMarketRelation = relations(lastestMarket, ({ one }) => ({
  assetInfo: one(assetInfo),
}));

export const historyPrice = createTable(
  'history_price',
  {
    assetId: pgAssetId('asset_id')
      .notNull()
      .references(() => assetInfo.id),
    price: numeric('price', { precision: 20, scale: 10 }),
    time: timestamp('time').notNull(),
    dataSource: varchar('data_source'),
    createdAt: timestamp('created_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    // when quote asset is empty, it means the price is in USD
    quoteAssetId: pgAssetId('quote_asset_id'),
    updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
  },
  (table) => ({
    key: unique().on(table.assetId, table.time),
  }),
);

export const actionEnum = pgEnum('action', ['Transfer', 'BatchTransfer', 'Mint', 'Burn', 'Leap', 'Stake', 'Unstake']);

export const txAction = createTable(
  'tx_action',
  {
    id: serial('id').primaryKey(),
    assetId: pgHash('asset_id').notNull(),
    blockNumber: integer('block_number').notNull(),
    txHash: pgHash('tx_hash').notNull(),
    txIndex: integer('tx_index').notNull(),
    action: actionEnum('action').notNull(),
    from: pgScript('from'),
    to: pgScript('to'),
    volume: numeric('volume', { precision: 30, scale: 10 }).notNull().default('0'),
    value: bigint('value', { mode: 'bigint' }).notNull(),
    inputCount: integer('input_count').default(0).notNull(),
    outputCount: integer('output_count').default(0).notNull(),
    timestamp: timestamp('timestamp').notNull(),
  },
  (table) => ({
    txHashIndex: index('tx_action_hash_idx').on(table.txHash),
    assetIdIndex: index('tx_action_asset_id_idx').on(table.assetId),
    actionTimestampIndex: index('tx_action_action_timestamp_idx').on(table.action, table.timestamp),
    blockNumberIndex: index('tx_action_block_number_idx').on(table.blockNumber),
    volumeIndex: index('tx_action_volume_idx').on(table.volume),
    blockNumberAssetIdIndex: index('block_number_asset_id_idx').on(table.blockNumber, table.assetId),
  }),
);

export const txActionRelatoins = relations(txAction, ({ many }) => ({
  addresses: many(actionAddress),
}));

export const fromOrToEnum = pgEnum('from_or_to', ['from', 'to']);

export const actionAddress = createTable(
  'tx_action_address',
  {
    id: serial('id').primaryKey(),
    actionId: integer('action_id')
      .notNull()
      .references(() => txAction.id),

    blockNumber: integer('block_number').notNull(),
    assetId: pgHash('asset_id').notNull(),

    txHash: pgHash('tx_hash').notNull(),
    fromOrTo: fromOrToEnum('from_or_to').notNull(),
    volume: numeric('volume', { precision: 30, scale: 10 }).notNull().default('0'),
    value: bigint('value'),
    address: pgHash('address').notNull(),
  },
  (table) => ({
    address: index('action_address_address_idx').on(table.address),
    assetAddress: index('action_address_asset_address').on(table.assetId, table.address),
    assetTxHash: index('action_address_asset_tx_hash').on(table.assetId, table.txHash),
    txHash: index('action_address_tx_hash_idx').on(table.txHash),
    value: index('action_address_value_idx').on(table.assetId, table.value),
    volume: index('action_address_volume_idx').on(table.assetId, table.value),
    actionIdIndex: index('action_address_action_id_idx').on(table.actionId),
    addressTxHashIndex: index('action_address_address_txHash_idx').on(table.address, table.txHash),
  }),
);

export const actionAddressRelations = relations(actionAddress, ({ one }) => ({
  action: one(txAction, {
    fields: [actionAddress.actionId],
    references: [txAction.id],
  }),
}));

export const txTag = createTable(
  'tx_tag',
  {
    txHash: pgHash('tx_hash').notNull(),
    txIndex: integer('tx_index').notNull(),
    // reference to cms tag id
    tagId: integer('tag_id'),
  },
  (table) => ({
    txHashIndex: index('tx_tag_hash_idx').on(table.txHash),
  }),
);

export const holderRelation = relations(holders, ({ one }) => ({
  assetInfo: one(assetInfo, {
    fields: [holders.assetId],
    references: [assetInfo.id],
  }),
}));

export const txRelation = relations(tx, ({ one }) => ({
  assetInfo: one(assetInfo, {
    fields: [tx.assetId],
    references: [assetInfo.id],
    relationName: 'tx_asset',
  }),
  tokenInfo: one(assetInfo, {
    fields: [tx.tokenId],
    references: [assetInfo.id],
    relationName: 'tx_token',
  }),
  blockInfo: one(blocks, {
    fields: [tx.blockHash],
    references: [blocks.hash],
  }),
}));

export const addressTxRelation = relations(addressTx, ({ one }) => ({
  tx: one(tx, {
    fields: [addressTx.txHash],
    references: [tx.hash],
  }),
}));

export const searchStatistics = createTable('search_statistics', {
  count: integer('count').default(0),
  type: varchar('type'),
  search: varchar('search').unique().notNull(),
});

export const watchingAddress = createTable(
  'watching_address',
  {
    accountId: text('account_id').notNull(),
    address: text('address').notNull(),
    network: networkEnum('network').notNull(),
    description: text('description').default(''),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.accountId, table.address] }),
    accountIndex: index('account_id').on(table.accountId),
  }),
);

export const kv = createTable(
  'kv',
  {
    id: serial('id').primaryKey(),

    scope: varchar('scope').notNull(),
    key: varchar('key').notNull(),
    value: text('value'),
  },
  (table) => ({
    scopeKeyUniqueIndex: uniqueIndex('kv_scope_key_unique_index').on(table.scope, table.key),
  }),
);

export const accountApiKey = createTable('account_api_key', {
  id: serial('id').primaryKey(),
  accountId: text('account_id').notNull(),
  maskedApiKey: text('masked_api_key').notNull(),
  apiKeyHash: text('api_key_hash').notNull().unique(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at')
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  isActive: boolean('is_active').default(true),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
});
