import { type lastestMarket } from '~/server/db/schema';

export type AssetId = string;
export type Timestamp = number | Date;
export type AssetValue = number | bigint | string;

export type PriceCalculator = {
  getVolume(options: { assetId: AssetId; timestamp: Timestamp; value: AssetValue }): string;
  getAmountWithDecimals(options: { assetId: AssetId; value: AssetValue }): string;
};

type MarketData = typeof lastestMarket.$inferSelect;

export interface MarketService {
  createCalculator(options: Array<{ assetId: AssetId; timestamp: Timestamp }>): Promise<PriceCalculator>;
  createCalculatorInBlock(blockHash: string): Promise<(options: { assetId: AssetId; value: AssetValue }) => string>;
  getLatestMarketData(options: { assetId: AssetId }): Promise<MarketData | undefined>;
}
