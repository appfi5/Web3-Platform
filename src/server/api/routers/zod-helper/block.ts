import { z } from 'zod';

import { assetBase } from './asset';
import { digitStringOutput, hashOutput } from './basic';

export const blockInfo = z.object({
  network: z.enum(['BTC', 'CKB']).describe('Network the transaction occurred on (BTC/CKB)'),
  hash: z.string(),
  number: z.number(),
  txCount: z.number(),
});

export const btcBlockRaw = z.object({
  id: z.string(),
  height: z.number(),
  version: z.number(),
  timestamp: z.number(),
  tx_count: z.number(),
  size: z.number(),
  weight: z.number(),
  merkle_root: z.string(),
  previousblockhash: z.string(),
  mediantime: z.number(),
  nonce: z.number(),
  bits: z.number(),
  difficulty: z.number(),
  extras: z.unknown(),
});

export const ckbBlockRaw = z.object({
  header: z.unknown(),
  uncles: z.array(z.unknown()),
  transactions: z.array(z.unknown()),
  proposals: z.array(z.unknown()),
  extension: z.string(),
});

export const blockRaw = btcBlockRaw.or(ckbBlockRaw);
const amountWithAssetBase = z.object({
  amount: digitStringOutput,
  amountUsd: digitStringOutput,
  asset: assetBase.optional(),
});

export const detail = z.object({
  token: z.object({
    count: z.number(),
    totalAmountUsd: digitStringOutput,
  }),
  txFee: amountWithAssetBase,
  txAmount: amountWithAssetBase,
  blockReward: amountWithAssetBase,
  txCount: z.string(),
  hash: hashOutput,
  height: z.number(),
  miner: z.string(),
  time: z.number(),
  weight: z.number().nullable(),
  size: z.number(),
  difficulty: z.string(),
  merkleRoot: z.string(),
  nonce: z.string(),
  bits: z.string().nullable(),
});

export type BlockDetail = z.infer<typeof detail>;
