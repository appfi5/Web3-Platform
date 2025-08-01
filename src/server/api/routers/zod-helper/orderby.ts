import { z } from 'zod';

export const createOrderByInput = <T extends string, U extends Readonly<[T, ...T[]]>>(
  keys: U,
  defaultDirection?: 'asc' | 'desc',
) => {
  return z.object({
    orderKey: z.enum(keys).optional(),
    orderDirection: defaultDirection
      ? z.enum(['asc', 'desc']).default(defaultDirection)
      : z.enum(['asc', 'desc']).optional(),
  });
};
