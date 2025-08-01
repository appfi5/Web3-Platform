import { join } from 'node:path';

import dayjs from 'dayjs';

import { NATIVE_ASSETS } from '~/constants';

const ASSET_ID_MAP: Record<string, string> = {
  [NATIVE_ASSETS.CKB]: 'CKB',
  [NATIVE_ASSETS.BTC]: 'BTC',
};

export function isBinanceAsset(assetId: string) {
  return Object.keys(ASSET_ID_MAP).includes(assetId);
}

export function createBinanceApi({
  endpoint = 'https://data-api.binance.vision',
}: {
  // @see https://developers.binance.com/docs/binance-spot-api-docs/rest-api/general-api-information
  // For APIs that only send public market data, please use the base endpoint https://data-api.binance.vision.
  endpoint?: string;
} = {}) {
  function beginTradingAfter({ assetId, timestamp }: { assetId: string; timestamp: number | string | Date }) {
    if (assetId === NATIVE_ASSETS.CKB && dayjs(timestamp).isAfter(1611662500000)) {
      return true;
    }
    if (assetId === NATIVE_ASSETS.BTC && dayjs(timestamp).isAfter(1502942800000)) {
      return true;
    }

    return false;
  }

  async function klines({
    assetId,
    startTime,
    endTime,
    interval,
    limit,
    quoteSymbol = 'USDT',
  }: {
    assetId: string;
    interval: KlineInterval;
    startTime?: string | number | Date;
    endTime?: string | number | Date;
    limit?: number;
    quoteSymbol?: string;
  }): Promise<Kline[] | undefined> {
    const baseSymbol = ASSET_ID_MAP[assetId];
    if (!baseSymbol) {
      throw new Error(`Unknown asset_id: ${assetId}`);
    }

    // https://developers.binance.com/docs/binance-spot-api-docs/rest-api/market-data-endpoints#klinecandlestick-data
    const klineEndpoint = '/api/v3/klines';
    const search = new URLSearchParams();

    search.append('symbol', `${baseSymbol}${quoteSymbol}`);
    search.append('interval', interval ?? '1m');
    if (startTime) {
      search.append('startTime', dayjs(startTime).valueOf().toString());
    }
    if (endTime) {
      search.append('endTime', dayjs(endTime).valueOf().toString());
    }
    if (limit) {
      search.append('limit', String(limit));
    }

    const params = search.toString();

    const res = (await fetch(`${join(endpoint, klineEndpoint)}?${params}`).then((res) => res.json())) as
      | KlineTuple[]
      | undefined;

    return res?.map(
      ([
        openTime,
        openPrice,
        highPrice,
        lowPrice,
        closePrice,
        volume,
        closeTime,
        quoteAssetVolume,
        numberOfTrades,
        takerBuyBaseAssetVolume,
        takerBuyQuoteAssetVolume,
      ]) => ({
        openTime,
        openPrice,
        highPrice,
        lowPrice,
        closePrice,
        volume,
        closeTime,
        quoteAssetVolume,
        numberOfTrades,
        takerBuyBaseAssetVolume,
        takerBuyQuoteAssetVolume,
      }),
    );
  }

  return { klines, beginTradingAfter };
}

type KlineInterval =
  | '1s'
  | '1m'
  | '3m'
  | '5m'
  | '15m'
  | '30m'
  | '1h'
  | '2h'
  | '4h'
  | '6h'
  | '8h'
  | '12h'
  | '1d'
  | '3d'
  | '1w'
  | '1M';

export type Kline = {
  openTime: number;
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  closePrice: string;
  volume: string;
  closeTime: number;
  quoteAssetVolume: string;
  numberOfTrades: number;
  takerBuyBaseAssetVolume: string;
  takerBuyQuoteAssetVolume: string;
};

type KlineTuple = [
  openTime: number,
  openPrice: string,
  highPrice: string,
  lowPrice: string,
  closePrice: string,
  volume: string,
  closeTime: number,
  quoteAssetVolume: string,
  numberOfTrades: number,
  takerBuyBaseAssetVolume: string,
  takerBuyQuoteAssetVolume: string,
];

export const binanceApi = createBinanceApi();
