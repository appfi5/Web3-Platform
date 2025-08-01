DROP INDEX IF EXISTS "action_address_asset_id_idx";--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "action_address_block_number_idx" ON "web3platform_tx_action_address" USING btree ("block_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "action_address_asset_id_idx" ON "web3platform_tx_action_address" USING btree ("asset_id");
