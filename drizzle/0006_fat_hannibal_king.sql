DROP INDEX IF EXISTS "action_address_address_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "tx_action_asset_id_idx";--> statement-breakpoint
ALTER TABLE "web3platform_tx" ALTER COLUMN "volume" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "web3platform_tx" ALTER COLUMN "volume" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "web3platform_tx_action" ALTER COLUMN "asset_id" SET NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "action_address_action_id_idx" ON "web3platform_tx_action_address" USING btree ("action_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "action_address_address_txHash_idx" ON "web3platform_tx_action_address" USING btree ("address","tx_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tx_block_hash_hash_idx" ON "web3platform_tx" USING btree ("block_hash","hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "block_number_asset_id_idx" ON "web3platform_tx_action" USING btree ("block_number","asset_id");