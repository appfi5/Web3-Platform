import BigNumber from 'bignumber.js';
import { eq, inArray } from 'drizzle-orm';
import { LRUCache } from 'lru-cache';
import * as R from 'remeda';

import { getAssetPriceInABlock, getHistoricalQuoteInUsd } from '~/server/api/comm';
import { db } from '~/server/db';
import { assetInfo, lastestMarket } from '~/server/db/schema';
import { dayjs } from '~/utils/utility';

import { type AssetId, type MarketService, type Timestamp } from './types';

export function createMarketService() {
  const priceCache = new LRUCache<string, Promise<string>>({
    max: 10000,
    ttl: 5 * 60 * 1000,
  });

  const fetchPrice = async ({ assetId, timestamp }: { assetId: AssetId; timestamp: Timestamp }) => {
    const res = await getHistoricalQuoteInUsd({ assetId, timestamp });
    return res?.price ?? '0';
  };

  const getPrice = ({ assetId, timestamp }: { assetId: AssetId; timestamp: Timestamp }) => {
    const requestedTime = +timestamp;
    const FIVE_MINUTES = 5 * 60 * 1000;
    const minAcceptableTime = requestedTime - FIVE_MINUTES;

    // Find the latest cached price within acceptable time range
    const cachedTimes = Array.from(priceCache.keys())
      .filter((key) => key.startsWith(`${assetId}-`))
      .map((key) => parseInt(key.split('-')[1]!))
      .filter((time) => time <= requestedTime && time >= minAcceptableTime)
      .sort((a, b) => b - a);

    const latestCachedTime = cachedTimes[0];
    if (latestCachedTime !== undefined) {
      const cachedValue = priceCache.get(`${assetId}-${latestCachedTime}`)!;
      return cachedValue;
    }

    // If no valid cached price found, create new request
    const cacheKey = `${assetId}-${requestedTime}`;
    const existingPromise = priceCache.get(cacheKey);
    if (existingPromise) {
      return existingPromise;
    }

    const pricePromise = fetchPrice({ assetId, timestamp });
    priceCache.set(cacheKey, pricePromise);
    return pricePromise;
  };

  const getLatestMarketData: MarketService['getLatestMarketData'] = async ({ assetId }: { assetId: AssetId }) => {
    const marketInfo = await db.query.lastestMarket.findFirst({ where: eq(lastestMarket.assetId, assetId) });
    return marketInfo;
  };

  const createCalculator: MarketService['createCalculator'] = async (payload) => {
    const assetIds = R.unique(payload.map(({ assetId }) => assetId));
    const assetInfos = await db.query.assetInfo.findMany({ where: inArray(assetInfo.id, assetIds) });
    const assetInfoMap = R.indexBy(assetInfos, (assetInfo) => assetInfo.id);

    const prices = await Promise.all(payload.map(getPrice));

    const source = R.zip(prices, payload).map(([price, { assetId, timestamp }]) => ({ price, assetId, timestamp }));

    return {
      getAmountWithDecimals: ({ assetId, value }) =>
        BigNumber(String(value))
          .div(10 ** (assetInfoMap[assetId]?.decimals ?? 0))
          .toString(),
      getVolume: ({ assetId, timestamp, value }) => {
        const assetInfo = assetInfoMap[assetId];
        const price = source.find((item) => item.assetId === assetId && dayjs(item.timestamp).isSame(timestamp))?.price;

        return BigNumber(String(value ?? 0))
          .div(10 ** (assetInfo?.decimals ?? 0))
          .times(price ?? 0)
          .toString();
      },
    };
  };

  const createCalculatorInBlock: MarketService['createCalculatorInBlock'] = async (blockHash: string) => {
    const prices = await getAssetPriceInABlock(blockHash);
    const assetIds = R.keys(prices);
    const assetInfos = await db.query.assetInfo.findMany({ where: inArray(assetInfo.id, assetIds) });
    const assetInfoMap = R.indexBy(assetInfos, (assetInfo) => assetInfo.id);
    return ({ assetId, value }) => {
      const assetInfo = assetInfoMap[assetId];
      const price = prices[assetId];
      return BigNumber(String(value ?? 0))
        .div(10 ** (assetInfo?.decimals ?? 0))
        .times(price ?? 0)
        .toString();
    };
  };

  return { getLatestMarketData, createCalculator, createCalculatorInBlock };
}
