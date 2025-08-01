CREATE TABLE IF NOT EXISTS "web3platform_kv" (
	"id" serial PRIMARY KEY NOT NULL,
	"scope" varchar,
	"key" varchar NOT NULL,
	"value" text,
	CONSTRAINT "web3platform_kv_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kv_scope_key_idx" ON "web3platform_kv" USING btree ("scope","key");