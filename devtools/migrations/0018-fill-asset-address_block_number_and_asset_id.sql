UPDATE web3platform_tx_action_address aa
SET
    asset_id = ta.asset_id
FROM web3platform_tx_action ta
WHERE
    aa.action_id = ta.id;