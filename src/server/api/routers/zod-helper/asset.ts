import { z } from 'zod';

import { zBytesLike, zNumberString } from './basic';

export const assetBase = z.object({
  id: zBytesLike().describe('Unique identifier for the asset'),
  name: z.string().describe('Name of the asset'),
  icon: z.string().nullable().describe('URL of the asset icon'),
  symbol: z.string().nullable().describe('Trading symbol for the asset'),
  decimals: z.number().nullable().describe('Number of decimal places for the asset'),
});

export const asset = z
  .object({
    layer: z.number().nonnegative().describe('Layer the asset exists on'),
    parentId: z.string().nullable().describe('ID of the parent asset if applicable'),
    totalSupply: zNumberString().nullable().describe('Total supply of the asset'),
    description: z.string().nullable().describe('Description of the asset'),
    public: z.boolean().describe('Whether the asset is public'),
    firstFoundBlock: z.string().nullable().describe('Block number where asset was first found'),
    firstMintAt: z.date().nullable().describe('Timestamp of first asset minting'),
    keywords: z.string().nullable().describe('Keywords associated with the asset'),
  })
  .merge(assetBase);
