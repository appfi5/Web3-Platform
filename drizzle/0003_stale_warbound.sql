ALTER TABLE "web3platform_address_asset" ALTER COLUMN "asset_amount" SET DATA TYPE numeric(78, 10);--> statement-breakpoint
ALTER TABLE "web3platform_address_tx" ALTER COLUMN "tx_hash" SET NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tx_submitted_time_tx_index" ON "web3platform_tx" USING btree ("submitted_time","index");