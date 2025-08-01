CREATE TABLE IF NOT EXISTS "web3platform_search_statistics" (
	"count" integer DEFAULT 0,
	"type" varchar,
	"search" varchar NOT NULL,
	CONSTRAINT "web3platform_search_statistics_search_unique" UNIQUE("search")
);
