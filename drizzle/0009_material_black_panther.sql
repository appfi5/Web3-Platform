CREATE INDEX IF NOT EXISTS "action_address_address_idx" ON "web3platform_tx_action_address" USING btree ("address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "action_address_asset_id_idx" ON "web3platform_tx_action_address" USING btree ("action_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "action_address_tx_hash_idx" ON "web3platform_tx_action_address" USING btree ("tx_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "action_address_value_idx" ON "web3platform_tx_action_address" USING btree ("value");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "action_address_volume_idx" ON "web3platform_tx_action_address" USING btree ("volume");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "address_asset_asset_amount_idx" ON "web3platform_address_asset" USING btree ("asset_amount");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tx_action_asset_id_idx" ON "web3platform_tx_action" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tx_action_action_timestamp_idx" ON "web3platform_tx_action" USING btree ("action","timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tx_action_from_address_idx" ON "web3platform_tx_action" USING btree ("from");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tx_action_to_address_idx" ON "web3platform_tx_action" USING btree ("to");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tx_action_value_idx" ON "web3platform_tx_action" USING btree ("value");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tx_action_block_number_idx" ON "web3platform_tx_action" USING btree ("block_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tx_action_volume_idx" ON "web3platform_tx_action" USING btree ("volume");