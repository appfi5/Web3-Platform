import { z } from 'zod';

import { isValidBTCAddress } from '~/utils/bitcoin';
import { isValidAddress } from '~/utils/validators';

export const addressScript = z
  .string()
  .or(
    z.object({
      codeHash: z.string(),
      hashType: z.string(),
      args: z.string(),
    }),
  )
  .describe('Address or script involved in the transaction');

export const zodCKBAddress = z.string().refine(
  (address) => {
    return isValidAddress(address);
  },
  {
    message: 'Invalid address',
    path: ['address'],
  },
);

export const zodAddress = z.string().refine(
  (address) => {
    return [isValidAddress, isValidBTCAddress].some((validator) => validator(address));
  },
  {
    message: 'Invalid address',
    path: ['address'],
  },
);
