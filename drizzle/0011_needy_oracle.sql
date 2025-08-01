ALTER TABLE "web3platform_address_tx" ALTER COLUMN "changes" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "web3platform_asset_info" ADD COLUMN "keywords" varchar;