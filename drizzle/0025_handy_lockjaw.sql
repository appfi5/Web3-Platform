CREATE TYPE "public"."asset_protocol" AS ENUM('native_ckb', 'native_btc', 'sudt', 'xudt', 'spore_cluster', 'spore');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "web3platform_asset_to_protocol" (
	"asset_id" "bytea" NOT NULL,
	"protocol" "asset_protocol" NOT NULL,
	CONSTRAINT "web3platform_asset_to_protocol_asset_id_protocol_unique" UNIQUE("asset_id","protocol")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "asset_to_protocol_asset_id_idx" ON "web3platform_asset_to_protocol" USING btree ("asset_id");