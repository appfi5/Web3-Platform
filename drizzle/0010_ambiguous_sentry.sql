ALTER TABLE "web3platform_address_tx" ADD COLUMN "network" "network" DEFAULT 'CKB' NOT NULL;--> statement-breakpoint
ALTER TABLE "web3platform_address_tx" ADD COLUMN "block_number" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "web3platform_address_tx" ADD COLUMN "from_addresses" "bytea"[] DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "web3platform_address_tx" ADD COLUMN "to_addresses" "bytea"[] DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "web3platform_address_tx" ADD COLUMN "changes" jsonb[] DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "web3platform_address_tx" ADD COLUMN "change_volume" numeric(30, 10) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "web3platform_address_tx" ADD COLUMN "assets_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "web3platform_address_tx" ADD COLUMN "assets" text[] DEFAULT '{}';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assets_index" ON "web3platform_address_tx" USING gin ("assets");