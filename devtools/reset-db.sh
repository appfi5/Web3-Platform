#!/bin/bash
PG_BIN=$PG_BIN

if [ -z "$PG_BIN" ]; then
    # For macOS
    PG_BIN=/Applications/Postgres.app/Contents/Versions/16/bin
fi

$PG_BIN/dropdb web3platform
$PG_BIN/createdb web3platform
rm -rf ./drizzle
npm run db:push
npm run db:generate
npm run db:seed
