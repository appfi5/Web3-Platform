import { z } from 'zod';

export enum SearchResultType {
  Chain = 0,
  Address,
  Block,
  Transaction,
  Token,
  Chart,
  TokenList,
  BitcoinStatisticsStatus,
}

export const chainProperty = z.object({
  uid: z.string(),
  name: z.string(),
  type: z.string(),
});

export const addressProperty = z.object({
  uid: z.string(),
  chain: z.string(),
  usedChain: z.array(z.string()),
  assetSumToUSD: z.optional(z.string()),
});

export const blockProperty = z.object({
  number: z.number(),
  chain: z.string(),
  hash: z.string(),
});

export const txProperty = z.object({
  hash: z.string(),
  chain: z.string(),
  totalValue: z.optional(z.string()).nullish(),
});

export const tokenProperty = z.object({
  uid: z.string(),
  chain: z.string(),
  symbol: z.string().nullish(),
  decimals: z.number().nullish(),
  type: z.string().nullish(),
});

export const matchedResult = z.discriminatedUnion('type', [
  z.object({ type: z.literal(SearchResultType.Chain), property: chainProperty }),
  z.object({ type: z.literal(SearchResultType.Address), property: addressProperty }),
  z.object({ type: z.literal(SearchResultType.Block), property: blockProperty }),
  z.object({ type: z.literal(SearchResultType.Transaction), property: txProperty }),
  z.object({ type: z.literal(SearchResultType.Token), property: tokenProperty }),
]);
