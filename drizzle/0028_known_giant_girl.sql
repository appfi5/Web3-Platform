CREATE TABLE "web3platform_account_api_key" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"masked_api_key" text NOT NULL,
	"api_key_hash" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"is_active" boolean DEFAULT true,
	"updated_at" timestamp,
	CONSTRAINT "web3platform_account_api_key_api_key_hash_unique" UNIQUE("api_key_hash")
);
