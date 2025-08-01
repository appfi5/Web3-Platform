import { z } from 'zod';

export const newWalletValidator = z.object({
  address: z.string(),
  network: z.enum(['CKB', 'BTC']),
  description: z.string().optional(),
});
