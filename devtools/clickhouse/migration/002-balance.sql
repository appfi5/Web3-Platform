
CREATE TABLE IF NOT EXISTS address_asset_balance (
    `address` String COMMENT 'Variant binary, save with the unhex and select with the hex function' CODEC(ZSTD),
    `asset_id` String COMMENT 'variant binary, save with the unhex and select with the hex function' CODEC(ZSTD),
    `balance` UInt256 COMMENT 'Corresponding asset value, without decimal info',
)
ENGINE = AggregatingMergeTree()

INSERT INTO address_asset_balance (address, asset_id, balance)
SELECT
    address,
    asset_id,
    -- Use Int256 consistently for all cases
    CASE
        -- For regular transactions (not deleted)
        WHEN is_deleted = 0 AND from_or_to = 'to' THEN toInt256(value)
        WHEN is_deleted = 0 AND from_or_to = 'from' THEN -toInt256(value)
        -- For deleted transactions, reverse the logic
        WHEN is_deleted = 1 AND from_or_to = 'to' THEN -toInt256(value)
        WHEN is_deleted = 1 AND from_or_to = 'from' THEN toInt256(value)
        ELSE 0
    END AS balance
FROM tx_asset_detail;

CREATE MATERIALIZED VIEW default.mv_address_asset_balance_update TO default.address_asset_balance
(
    `address` String,
    `asset_id` String,
    `balance` Int256
)
AS SELECT
    address,
    asset_id,
    multiIf((is_deleted = 0) AND (from_or_to = 'to'), toInt256(value), (is_deleted = 0) AND (from_or_to = 'from'), -toInt256(value), (is_deleted = 1) AND (from_or_to = 'to'), -toInt256(value), (is_deleted = 1) AND (from_or_to = 'from'), toInt256(value), 0) AS balance
FROM default.tx_asset_detail