import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { type Network } from '~/server/api/routers/zod-helper';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatHash = (hash: string, network: Network) => {
  switch (network) {
    case 'btc':
      return hash.replace(/^0x/, '');
    default:
      return hash;
  }
};
