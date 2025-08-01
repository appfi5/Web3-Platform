CREATE TABLE IF NOT EXISTS tx_asset_detail
(
    `network` Enum8('btc' = 0, 'ckb' = 1),
    `block_hash` FixedString(32) COMMENT '32-byte binary, save with the unhex and select with the hex function' CODEC(ZSTD),
    `block_number` UInt32,
    `tx_index` UInt32,
    `tx_hash` FixedString(32) COMMENT '32-byte binary, save with the unhex and select with the hex function' CODEC(ZSTD),
    `address` String COMMENT 'Variant binary, save with the unhex and select with the hex function' CODEC(ZSTD),
    `timestamp` DateTime,
    `from_or_to` Enum8('from' = 0, 'to' = 1),
    `asset_id` String COMMENT 'variant binary, save with the unhex and select with the hex function' CODEC(ZSTD),
    `value` UInt256 COMMENT 'Corresponding asset value, without decimal info',
    `volume` Float64 COMMENT 'Volume in USD, with decimal info, e.g. if 1 BTC = 100,000 USD, the volume is 100,000',
    `updated_at` DateTime DEFAULT now(),
    `is_deleted` Bool DEFAULT 0
)
ENGINE = ReplacingMergeTree(updated_at, is_deleted)
ORDER BY (address, asset_id, tx_hash, from_or_to)
SETTINGS index_granularity = 8192, deduplicate_merge_projection_mode = 'rebuild';

CREATE MATERIALIZED VIEW IF NOT EXISTS default.mv_block_info
ENGINE = ReplacingMergeTree
ORDER BY (network, block_number) POPULATE
AS SELECT DISTINCT
    network,
    block_hash,
    block_number
FROM default.tx_asset_detail;

CREATE TABLE IF NOT EXISTS tx_action (
    `network` Enum8('btc' = 0, 'ckb' = 1),
    `asset_id` String COMMENT 'variant binary, save with the unhex and select with the hex function' CODEC(ZSTD),
    `block_hash` FixedString(32) COMMENT '32-byte binary, save with the unhex and select with the hex function' CODEC(ZSTD),
    `block_number` UInt32,
    `tx_index` UInt32,
    `tx_hash` FixedString(32) COMMENT '32-byte binary, save with the unhex and select with the hex function' CODEC(ZSTD),
    `action` LowCardinality(String),
    `from` String COMMENT 'Variant binary, save with the unhex and select with the hex function' CODEC(ZSTD),
    `to` String COMMENT 'Variant binary, save with the unhex and select with the hex function' CODEC(ZSTD),
    `value` UInt256 COMMENT 'Corresponding asset value, without decimal info',
    `volume` Float64 COMMENT 'Volume in USD, with decimal info, e.g. if 1 BTC = 100,000 USD, the volume is 100,000',
   	`input_count` UInt32,
    `output_count` UInt32,
    `timestamp` DateTime
) ENGINE = ReplacingMergeTree
ORDER BY (asset_id, tx_hash);

CREATE MATERIALIZED VIEW mv_tx_action to tx_action AS
SELECT 
  network,
  asset_id,
  block_hash,
  block_number,
  tx_index,
  tx_hash,
  CASE
    WHEN from_value = to_value THEN 'Transfer'
    WHEN from_value < to_value THEN 'Mint'
    WHEN from_value > to_value AND asset_id in [unhex('80000000'), unhex('80000135')] THEN 'Transfer'
    ELSE 'Burn'
  END as action, 
  from,
  to,
  IF(from_value > to_value, from_value, to_value) as value,
  IF(from_volume > to_volume, from_volume, to_volume) as volume,
  input_count,
  output_count,
  timestamp
 from (
    SELECT 
        any(network) as network,
        asset_id,
        any(block_hash) as block_hash,
        any(block_number) as block_number,
        any(tx_index) AS tx_index,
        tx_hash,
        sumIf(value, from_or_to = 'from') as from_value,
        sumIf(value, from_or_to = 'to') as to_value,
        sumIf(volume, from_or_to = 'from') as from_volume,
        sumIf(volume, from_or_to = 'to') as to_volume,
        ifNull(argMax(address, multiIf(from_or_to = 'from', value, NULL)), '') AS from,
        ifNull(argMax(address, multiIf(from_or_to = 'to', value, NULL)), '') AS to,
        countIf(from_or_to = 'from') AS input_count,
        countIf(from_or_to = 'to') AS output_count,
        any(timestamp) AS timestamp
    FROM tx_asset_detail
    GROUP BY
        tx_hash,
        asset_id
);

INSERT INTO tx_action (
    network,
    asset_id,
    block_hash,
    block_number,
    tx_index,
    tx_hash,
    action,
    from,
    to,
    value,
    volume,
    input_count,
    output_count,
    timestamp
) SELECT 
  network,
  asset_id,
  block_hash,
  block_number,
  tx_index,
  tx_hash,
  CASE
    WHEN from_value = to_value THEN 'Transfer'
    WHEN from_value < to_value THEN 'Mint'
    WHEN from_value > to_value AND asset_id in [unhex('80000000'), unhex('80000135')] THEN 'Transfer'
    ELSE 'Burn'
  END as action, 
  from,
  to,
  IF(from_value > to_value, from_value, to_value) as value,
  IF(from_volume > to_volume, from_volume, to_volume) as volume,
  input_count,
  output_count,
  timestamp
 from (
    SELECT 
        any(network) as network,
        asset_id,
        any(block_hash) as block_hash,
        any(block_number) as block_number,
        any(tx_index) AS tx_index,
        tx_hash,
        sumIf(value, from_or_to = 'from') as from_value,
        sumIf(value, from_or_to = 'to') as to_value,
        sumIf(volume, from_or_to = 'from') as from_volume,
        sumIf(volume, from_or_to = 'to') as to_volume,
        ifNull(argMax(address, multiIf(from_or_to = 'from', value, NULL)), '') AS from,
        ifNull(argMax(address, multiIf(from_or_to = 'to', value, NULL)), '') AS to,
        countIf(from_or_to = 'from') AS input_count,
        countIf(from_or_to = 'to') AS output_count,
        any(timestamp) AS timestamp
    FROM tx_asset_detail
    WHERE tx_asset_detail.network = {network: String} and tx_asset_detail.block_number >= {startBlockNumber: UInt32} and tx_asset_detail.block_number < {endBlockNumber: UInt32}
    GROUP BY
        tx_hash,
        asset_id
);
