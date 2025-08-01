import 'trpc-to-openapi';

import { z, type ZodEffects, type ZodEnum } from 'zod';

export const network = z
  .preprocess(
    (input) => {
      if (input === 'ckb' || input === 'CKB') return 'ckb';
      if (input === 'btc' || input === 'BTC') return 'btc';
      return input;
    },
    z.enum(['ckb', 'btc']),
  )
  .describe('The related network, such as btc, ckb')
  .transform<'ckb' | 'btc'>((input) => {
    switch (input) {
      case 'ckb':
      case 'btc':
        return input;
      default: {
        throw new Error(`Incorrect network ${String(input)}`);
      }
    }
  }) as unknown as ZodEffects<ZodEnum<['ckb', 'btc']>, 'ckb' | 'btc', 'ckb' | 'btc' | 'CKB' | 'BTC'>;

export type NetworkInput = z.input<typeof network>;
export type Network = z.output<typeof network>;

export const networkInput = z.object({ network });
export const networkOutput = z.object({ network: network.openapi({ type: 'string' }) });
