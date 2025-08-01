ALTER TABLE "web3platform_kv" DROP CONSTRAINT "web3platform_kv_key_unique";--> statement-breakpoint
DROP INDEX IF EXISTS "kv_scope_key_idx";--> statement-breakpoint
ALTER TABLE "web3platform_kv" ALTER COLUMN "scope" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "kv_scope_key_unique_index" ON "web3platform_kv" USING btree ("scope","key");