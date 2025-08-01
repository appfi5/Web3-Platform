import BigNumber from 'bignumber.js';
import dayjs from 'dayjs';
import { and, between, desc, eq, inArray, lte, sql } from 'drizzle-orm';
import { sql as chSql } from 'kysely';
import * as R from 'remeda';

import { binanceApi, isBinanceAsset, type Kline } from '~/utils/third-api/binance';

import { ch, createHelper, type Database } from '../ch';
import { db } from '../db';
import { assetInfo, assetToProtocol, historyPrice, lastestMarket } from '../db/schema';

/**
 * @deprecated please move to {@link getHistoricalQuoteInUsd}
 * @param time
 * @param assetId
 * @returns
 */
export async function getHistoryPrice(time: Date | number, assetId?: string | string[]) {
  const fiveMinuteAgo = dayjs(time).subtract(5, 'minute');
  const fiveMinuteAfter = dayjs(time).add(5, 'minute');
  const assetsPrice = await db
    .select({
      assetId: historyPrice.assetId,
      price: historyPrice.price,
      time: historyPrice.time,
      sequence: sql`row_number() over(partition by "time" order by time asc)`,
    })
    .from(historyPrice)
    .where(
      assetId
        ? and(
            between(historyPrice.time, fiveMinuteAgo.toDate(), fiveMinuteAfter.toDate()),
            Array.isArray(assetId) ? inArray(historyPrice.assetId, assetId) : eq(historyPrice.assetId, assetId),
          )
        : between(historyPrice.time, fiveMinuteAgo.toDate(), fiveMinuteAfter.toDate()),
    );

  return R.pipe(
    assetsPrice,
    R.groupBy(R.prop('assetId')),
    R.mapValues((i) =>
      R.pipe(
        i,
        R.sort((a, b) => a.time.getTime() - b.time.getTime()),
        R.first(),
        R.prop('price'),
      ),
    ),
  );
}

type InputTimestamp = number | string | Date;

/**
 * Get the closest historical quote at a specific timestamp.
 * The timestamp is the timestamp of the quote. The quote is
 * @param timestamp
 * @param assetId
 * @returns
 */
export async function getHistoricalQuoteInUsd({
  timestamp,
  assetId,
}: {
  assetId: string;
  timestamp: InputTimestamp;
}): Promise<{ timestamp: Date; price: string } | null> {
  const assetIdCondition = eq(historyPrice.assetId, assetId);

  // the quote for xUDT could come from Omiga or UTXOSwap
  // UTXOSwap is more reliable for fungible assets because it is based on AMM(Automated Market Maker) model
  // while Omiga is an OpenSea like NFT marketplace and the quote for a fungible asset is not that reliable
  // so we use UTXOSwap as the source for XUDT quote because XUDT is a fungible asset
  const isXudt = !!(await db.query.assetToProtocol.findFirst({
    columns: { protocol: true },
    where: and(eq(assetToProtocol.assetId, assetId), eq(assetToProtocol.protocol, 'xudt')),
  }));
  const onlyUseUtxoswapQuoteCondition = isXudt ? eq(historyPrice.dataSource, 'utxoswap') : undefined;

  let closestQuote = await db.query.historyPrice.findFirst({
    columns: { time: true, price: true, quoteAssetId: true },
    where: and(assetIdCondition, lte(historyPrice.time, new Date(timestamp)), onlyUseUtxoswapQuoteCondition),
    orderBy: desc(historyPrice.time),
  });

  // refetch the continuous quote data when the there is no historical price record in the lastest 5 minutes
  if (isBinanceAsset(assetId) && binanceApi.beginTradingAfter({ assetId, timestamp })) {
    const hasNoHistoricalPriceRecordWithin5Minutes =
      // no historical price record in the last 5 minutes
      !closestQuote?.price || dayjs(timestamp).isAfter(dayjs(closestQuote.time).add(5, 'minutes'));

    if (hasNoHistoricalPriceRecordWithin5Minutes) {
      // There may be a gap in the historical price record on Binance,
      // such as the trading pair CKB/USDC on the timestamp 1679662069115
      // so we need to move the start time backward until we get the continuous quote data
      let startTime = dayjs(timestamp).subtract(5, 'minutes').valueOf();
      let klines: Kline[] | undefined;
      let hasGap = false;
      while (!klines?.length && binanceApi.beginTradingAfter({ assetId, timestamp: startTime })) {
        klines = await binanceApi.klines({
          assetId,
          interval: '1m',
          startTime: startTime,
          endTime: dayjs(startTime).add(1, 'minutes').valueOf(),
        });
        if (!klines?.length) {
          hasGap = true;
        }
        startTime = dayjs(startTime).subtract(5, 'minute').valueOf();
      }

      if (klines != null) {
        const sum = klines.reduce(
          ({ sumTimestamp: medianTimestamp, sumPrice: medianPrice }, curr) => {
            const price = (Number(curr.openPrice) + Number(curr.closePrice)) / 2;
            const timestamp = (curr.openTime + curr.closeTime) / 2;
            return { sumTimestamp: medianTimestamp + timestamp, sumPrice: medianPrice + price };
          },
          { sumTimestamp: 0, sumPrice: 0 },
        );

        closestQuote = {
          time: hasGap ? dayjs(timestamp).toDate() : dayjs(sum.sumTimestamp / klines.length).toDate(),
          price: String(sum.sumPrice / klines.length),
          quoteAssetId: null,
        };
        // insert the median price into the database
        void db
          .insert(historyPrice)
          .values({ assetId, time: closestQuote.time, price: closestQuote.price, dataSource: 'binance' })
          .onConflictDoNothing()
          .execute();
      }
    }
  }

  // has no historical price record
  if (!closestQuote?.price) {
    return null;
  }

  if (closestQuote.quoteAssetId) {
    const quoteAssetUsdPrice = await getHistoricalQuoteInUsd({
      assetId: closestQuote.quoteAssetId,
      timestamp: timestamp,
    });
    return quoteAssetUsdPrice
      ? {
          timestamp: closestQuote.time,
          // quote/USD * target/quote = target/USD
          price: BigNumber(quoteAssetUsdPrice.price).times(closestQuote.price).toFixed(),
        }
      : null;
  }

  return { timestamp: closestQuote.time, price: closestQuote.price };
}

export async function getLatestPrice(assetId: string | string[]) {
  const assetsPrice = await db.query.lastestMarket.findMany({
    where: Array.isArray(assetId) ? inArray(lastestMarket.assetId, assetId) : eq(lastestMarket.assetId, assetId),
  });
  return R.mapToObj(assetsPrice, (v) => [v.assetId, v.price]);
}

export async function getLatestMarket(assetId: string | string[]) {
  const assetsPrice = await db.query.lastestMarket.findMany({
    where: Array.isArray(assetId) ? inArray(lastestMarket.assetId, assetId) : eq(lastestMarket.assetId, assetId),
  });
  return R.mapToObj(assetsPrice, (v) => [v.assetId, v]);
}

/**
 * Calculate the price from ch volume and value in a block or tx
 * @param assetId
 * @param blockHash
 * @returns
 */
export async function getAssetPriceInABlock(blockHash: string) {
  const { unhex, hex } = createHelper<Database, 'tx_asset_detail'>();
  const item = await ch
    .selectFrom(
      ch
        .selectFrom('tx_asset_detail')
        .select([
          'asset_id',
          'volume',
          'value',
          chSql<number>`ROW_NUMBER() OVER (PARTITION BY asset_id ORDER BY value DESC)`.as('rn'),
        ])
        .where((eb) => eb.and([eb('block_hash', '=', unhex(blockHash)), eb('value', '>', '0')]))
        .as('sq'),
    )
    .select([hex('asset_id', 'assetId'), 'volume', 'value'])
    .where('rn', '=', 1)
    .execute();
  if (!item.length) return {};
  const asset = await db.query.assetInfo.findMany({
    where: inArray(
      assetInfo.id,
      item.map((v) => v.assetId),
    ),
  });
  const assetMap = R.mapToObj(asset, (v) => [v.id, v.decimals]);

  return R.mapToObj(item, (v) => [
    v.assetId,
    BigNumber(v.volume)
      .multipliedBy(10 ** (assetMap[v.assetId] ?? 0))
      .div(v.value),
  ]);
}
