import { z } from 'zod';

export const zRgbppAssetType = z.enum(['xudt', 'dob']);
export const zRgbppNetwork = z.enum(['ckb', 'btc', 'doge', 'unknown']);
export const zTimestamp = z.number();
export const zAssetId = z.string();
export const zValueInUsd = z.string();
export const zHash = z.string();

export const zAssetInfo = z.object({
  info: z.object({
    id: zAssetId,
    name: z.string().nullable(),
    symbol: z.string().nullable(),
    decimals: z.number().nullable(),

    icon: z.string().nullable(),
    tags: z.array(z.string()),
  }),
  quote: z.object({
    totalSupply: z.string().nullable(),
    holderCount: z.array(
      z.object({
        network: z.enum(['ckb', 'btc', 'doge', 'unknown']),
        count: z.number(),
      }),
    ),
    price: z.string().nullable(),
    marketCap: z.string().nullable(),
    volume24h: z.string().nullable(),
    circulatingSupply: z.string().nullable(),
    fdv: z.string().nullable(),

    priceChange24h: z.number().nullable(),
    txCount24h: z.number(),
  }),
});

export const zPaginationOutput = <T extends z.ZodType>(data: T) =>
  z.object({ data: z.array(data), pagination: z.object({ hasNext: z.boolean(), total: z.number().optional() }) });

export const zStatsStatus = {
  status: z.object({ timestamp: zTimestamp }),
};
