import { z } from 'zod';

import { networkOutput } from './network';

export const SearchResultType = {
  Chain: 'Chain',
  Address: 'Address',
  Block: 'Block',
  Transaction: 'Transaction',
  Token: 'Token',
  Chart: 'Chart',
  TokenList: 'TokenList',
  BitcoinStatisticsStatus: 'BitcoinStatisticsStatus',
} as const;

export const chainProperty = z.object({
  uid: z.string(),
  name: z.string(),
  type: z.string(),
});

export const addressProperty = z.object({
  uid: z.string(),
  chain: z.string(),
  chainNames: z.array(z.string()),
  assetsAmountUsd: z.optional(z.string()),
});

export const blockProperty = z
  .object({
    number: z.number(),
    hash: z.string(),
  })
  .merge(networkOutput);

export const txProperty = z.object({
  hash: z.string(),
  chain: z.string(),
  txAmountUsd: z.optional(z.string()).nullish(),
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
