import { z } from 'zod';

import { addressScript } from './address';

export const addrTx = z.object({
  txHash: z.string().describe('Transaction hash identifier'),
  txIndex: z.number().nonnegative().describe('Index of the transaction'),
  network: z.enum(['BTC', 'CKB']).describe('Network the transaction occurred on (BTC/CKB)'),
  time: z.date().describe('Timestamp of the transaction'),
  blockNumber: z.number().nonnegative().describe('Block number containing the transaction'),
  changeVolume: z.string().describe('Net change in value for this address'),
  address: addressScript,
  createdAt: z.date().describe('Timestamp when record was created'),
  updatedAt: z.date().nullable().describe('Timestamp when record was last updated'),
  io: z.number().nullable().describe('Input/output type of transaction'),
  changes: z.array(
    z.object({
      assetId: z.string().describe('Unique identifier for the asset'),
      volume: z.string().describe('Volume of the asset in base units'),
      value: z.string().describe('Value of the asset in USD'),
    }),
  ),
  fromAddresses: z.array(z.string()).describe('Array of addresses sending assets'),
  toAddresses: z.array(z.string()).describe('Array of addresses receiving assets'),
  assetsCount: z.number().describe('Number of assets involved in the transaction'),
});

export const tx = z.object({
  hash: z.string(),
  index: z.number(),
  blockHash: z.string().nullable(),
  assetId: z.string(),
  tokenId: z.string().nullable(),
  committedTime: z.date().nullable(),
  submittedTime: z.date(),
  from: addressScript.nullable(),
  to: addressScript.nullable(),
  volume: z.string(),
  value: z.bigint(),
  inputCount: z.number(),
  outputCount: z.number(),
});
