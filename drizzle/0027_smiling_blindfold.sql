CREATE TABLE IF NOT EXISTS "web3platform_watching_address" (
	"account_id" text NOT NULL,
	"address" text NOT NULL,
	"network" "network" NOT NULL,
	"description" text DEFAULT '',
	CONSTRAINT "web3platform_watching_address_account_id_address_pk" PRIMARY KEY("account_id","address")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "account_id" ON "web3platform_watching_address" USING btree ("account_id");