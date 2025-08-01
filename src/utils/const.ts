export enum MarketSource {
  CoinMarket = 'coinmarket',
  Binance = 'binance',
  Omiga = 'omiga',
  UTXOSwap = 'utxoswap',
}

export enum Chain {
  CKB = 'CKB',
  BTC = 'BTC',
}

export const CoinMarketAssetId = {
  BTC: '0x01',
  CKB: '0x1354',
} as const;

export const NATIVE_ASSETS = {
  BTC: '0x80000000',
  '0x80000000': 'BTC',

  CKB: '0x80000135',
  '0x80000135': 'CKB',
} as const;

export type CoinMarketAssetType = keyof typeof CoinMarketAssetId;
