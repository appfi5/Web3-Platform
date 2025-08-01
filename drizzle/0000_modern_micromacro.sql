DO $$ BEGIN
 CREATE TYPE "public"."action" AS ENUM('Transfer', 'BatchTransfer', 'Mint', 'Burn', 'Leap', 'Stake', 'Unstake');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."from_or_to" AS ENUM('from', 'to');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."network" AS ENUM('CKB', 'BTC');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "web3platform_tx_action_address" (
	"id" serial PRIMARY KEY NOT NULL,
	"action_id" integer NOT NULL,
	"tx_hash" "bytea" NOT NULL,
	"from_or_to" "from_or_to" NOT NULL,
	"value" numeric(78),
	"address" "bytea" NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "web3platform_address_asset" (
	"address" "bytea" NOT NULL,
	"asset_id" "bytea" NOT NULL,
	"asset_amount" numeric(30, 10) NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp,
	CONSTRAINT "web3platform_address_asset_address_asset_id_unique" UNIQUE("address","asset_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "web3platform_address_overview" (
	"address" "bytea" PRIMARY KEY NOT NULL,
	"received" numeric(30, 10) DEFAULT '0' NOT NULL,
	"send" numeric(30, 10) DEFAULT '0' NOT NULL,
	"volume" numeric(30, 10) DEFAULT '0' NOT NULL,
	"transaction_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "web3platform_address_tx" (
	"address" "bytea" NOT NULL,
	"tx_hash" "bytea",
	"tx_index" integer NOT NULL,
	"time" timestamp NOT NULL,
	"io" smallint,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "web3platform_asset_info" (
	"id" "bytea" PRIMARY KEY NOT NULL,
	"layer" integer NOT NULL,
	"parent_id" "bytea",
	"name" varchar NOT NULL,
	"total_supply" numeric(78),
	"decimals" integer,
	"icon" varchar,
	"symbol" varchar,
	"meta" jsonb DEFAULT '{}'::jsonb,
	"style" jsonb DEFAULT '{}'::jsonb,
	"first_found_block" "bytea",
	"first_mint_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "web3platform_asset_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"asset_id" "bytea" NOT NULL,
	"holder_count" integer DEFAULT 0 NOT NULL,
	"transaction_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "web3platform_asset_stats_asset_id_unique" UNIQUE("asset_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "web3platform_asset_tag" (
	"id" serial PRIMARY KEY NOT NULL,
	"label" varchar NOT NULL,
	"style" varchar,
	CONSTRAINT "web3platform_asset_tag_label_unique" UNIQUE("label")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "web3platform_asset_to_tag" (
	"asset_id" "bytea" NOT NULL,
	"asset_tag_label" varchar NOT NULL,
	CONSTRAINT "web3platform_asset_to_tag_asset_id_asset_tag_label_pk" PRIMARY KEY("asset_id","asset_tag_label")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "web3platform_blocks" (
	"network" "network" NOT NULL,
	"hash" "bytea" PRIMARY KEY NOT NULL,
	"number" integer NOT NULL,
	"tx_count" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "web3platform_history_price" (
	"asset_id" "bytea" NOT NULL,
	"price" numeric(20, 10),
	"time" timestamp NOT NULL,
	"data_source" varchar,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp,
	CONSTRAINT "web3platform_history_price_asset_id_time_unique" UNIQUE("asset_id","time")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "web3platform_holders" (
	"address" "bytea" NOT NULL,
	"asset_id" "bytea" NOT NULL,
	"volume" numeric(30, 10) NOT NULL,
	"value" numeric(78) NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "web3platform_latest_market" (
	"asset_id" "bytea" PRIMARY KEY NOT NULL,
	"price" numeric(20, 10),
	"highest_price" numeric(20, 10),
	"total_supply" numeric(50, 10),
	"max_supply" numeric(40, 2),
	"percent_change_24h" real,
	"market_cap" numeric(50, 10),
	"volume_24h" numeric(30, 10),
	"txs_24h" integer DEFAULT 0,
	"data_source" varchar,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "web3platform_tx" (
	"hash" "bytea" PRIMARY KEY NOT NULL,
	"index" integer NOT NULL,
	"block_hash" "bytea",
	"asset_id" "bytea" NOT NULL,
	"token_id" "bytea",
	"committed_time" timestamp,
	"submitted_time" timestamp NOT NULL,
	"from" "bytea",
	"to" "bytea",
	"volume" numeric(30, 10),
	"value" numeric(78) NOT NULL,
	"input_count" integer DEFAULT 0 NOT NULL,
	"output_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "web3platform_tx_action" (
	"id" serial PRIMARY KEY NOT NULL,
	"asset_id" "bytea",
	"block_number" integer NOT NULL,
	"tx_hash" "bytea" NOT NULL,
	"tx_index" integer NOT NULL,
	"action" "action" NOT NULL,
	"from" "bytea",
	"to" "bytea",
	"volume" numeric(30, 10) NOT NULL,
	"value" numeric(78) NOT NULL,
	"input_count" integer DEFAULT 0 NOT NULL,
	"output_count" integer DEFAULT 0 NOT NULL,
	"timestamp" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "web3platform_tx_tag" (
	"tx_hash" "bytea" NOT NULL,
	"tx_index" integer NOT NULL,
	"tag_id" integer
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "web3platform_tx_action_address" ADD CONSTRAINT "web3platform_tx_action_address_action_id_web3platform_tx_action_id_fk" FOREIGN KEY ("action_id") REFERENCES "public"."web3platform_tx_action"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "web3platform_address_asset" ADD CONSTRAINT "web3platform_address_asset_asset_id_web3platform_asset_info_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."web3platform_asset_info"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "web3platform_asset_stats" ADD CONSTRAINT "web3platform_asset_stats_asset_id_web3platform_asset_info_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."web3platform_asset_info"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "web3platform_asset_to_tag" ADD CONSTRAINT "web3platform_asset_to_tag_asset_id_web3platform_asset_info_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."web3platform_asset_info"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "web3platform_asset_to_tag" ADD CONSTRAINT "web3platform_asset_to_tag_asset_tag_label_web3platform_asset_tag_label_fk" FOREIGN KEY ("asset_tag_label") REFERENCES "public"."web3platform_asset_tag"("label") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "web3platform_history_price" ADD CONSTRAINT "web3platform_history_price_asset_id_web3platform_asset_info_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."web3platform_asset_info"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "web3platform_holders" ADD CONSTRAINT "web3platform_holders_asset_id_web3platform_asset_info_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."web3platform_asset_info"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "web3platform_latest_market" ADD CONSTRAINT "web3platform_latest_market_asset_id_web3platform_asset_info_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."web3platform_asset_info"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "web3platform_tx" ADD CONSTRAINT "web3platform_tx_asset_id_web3platform_asset_info_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."web3platform_asset_info"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "web3platform_tx" ADD CONSTRAINT "web3platform_tx_token_id_web3platform_asset_info_id_fk" FOREIGN KEY ("token_id") REFERENCES "public"."web3platform_asset_info"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "action_address_address_idx" ON "web3platform_tx_action_address" USING btree ("address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "address_asset_address_idx" ON "web3platform_address_asset" USING btree ("address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "address_asset_asset_id_idx" ON "web3platform_address_asset" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "address_overview_address" ON "web3platform_address_overview" USING btree ("address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tx_action_hash_idx" ON "web3platform_tx_action" USING btree ("tx_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tx_action_asset_id_idx" ON "web3platform_tx_action" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tx_tag_hash_idx" ON "web3platform_tx_tag" USING btree ("tx_hash");