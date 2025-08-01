DROP INDEX IF EXISTS "action_address_asset_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "action_address_block_number_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "action_address_value_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "action_address_volume_idx";--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "action_address_asset_address" ON "web3platform_tx_action_address" USING btree ("asset_id","address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "action_address_asset_tx_hash" ON "web3platform_tx_action_address" USING btree ("asset_id","tx_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "action_address_value_idx" ON "web3platform_tx_action_address" USING btree ("asset_id","value");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "action_address_volume_idx" ON "web3platform_tx_action_address" USING btree ("asset_id","value");