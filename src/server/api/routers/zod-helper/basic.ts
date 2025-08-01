import 'trpc-to-openapi';

import { z, type ZodIssueBase, type ZodTypeAny } from 'zod';

import { addressConvert } from '~/lib/address';
import { isValidBTCAddress } from '~/utils/bitcoin';
import { toHexWith0x } from '~/utils/bytes';
import { isValidAddress, isValidHash } from '~/utils/validators';

const optionalEmptyString = (mod: z.ZodType<string>) =>
  z.preprocess((val) => (val === '' ? undefined : val), mod.optional());
export const zBytesLike = () =>
  z
    .string()
    .transform((v) => (v ? toHexWith0x(v) : v))
    .openapi({ type: 'string' });
export const hashInput = (zodIssue: ZodIssueBase) => zBytesLike().refine((txHash) => isValidHash(txHash), zodIssue);

export const txHashInput = hashInput({ message: 'Invalid TxHash', path: ['txHash'] });
export const blockHashInput = hashInput({ message: 'Invalid Block Hash', path: ['blockHash'] });
export const txHashInputOptional = optionalEmptyString(txHashInput);

export const hashOutput = zBytesLike();

export const bytesOutput = zBytesLike();

export const assetIdInput = zBytesLike().describe('An asset ID is typically its address');
export const assetIdOutput = assetIdInput;

/**
 *
 * @deprecated please migrate to addresOutput
 */
export const zAddressLike = () =>
  zBytesLike()
    .transform((val) => {
      const result = addressConvert.fromCH(val);
      if (result === val) {
        return 'unknown';
      }
      return result;
    })
    .openapi({ type: 'string' });

export const addressOutput = zAddressLike();

export const addressInput = z
  .string()
  .refine(
    (address) => {
      return [isValidAddress, isValidBTCAddress].some((validator) => validator(address));
    },
    {
      message: 'Invalid address',
      path: ['address'],
    },
  )
  .transform((val) => {
    return addressConvert.toCH(val);
  })
  .openapi({ type: 'string' });

export const addressInputOptional = z
  .string()
  .optional()
  .transform((v) => v || undefined)
  .refine(
    (address) => {
      if (!address) return true; // allow empty string
      return [isValidAddress, isValidBTCAddress].some((validator) => validator(address));
    },
    {
      message: 'Invalid address',
      path: ['address'],
    },
  )
  .transform((val) => {
    return val ? addressConvert.toCH(val) : val;
  })
  .openapi({ type: 'string' });

export const zNumber = () =>
  z
    .number()
    .or(z.bigint())
    .or(z.string())
    .transform((val) => Number(val))
    .openapi({ type: 'number' });

/**
 *
 * @deprecated please migrate to {@link digitStringOutput}
 */
export const zNumberString = () =>
  z
    .string()
    .or(z.number())
    .or(z.bigint())
    .transform((val) => String(val))
    .openapi({ type: 'string' });

export const digitStringOutput = zNumberString();

/**
 *
 * @deprecated please migrate to @{@link dateOutput}
 */
export const zDate = () =>
  z
    .date()
    .or(
      z
        .string()
        .or(z.number())
        .transform((val) => {
          // guess it is a unix timestamp
          if (Number(val) < 10000000000) {
            return new Date(Number(val) * 1000);
          }
          return new Date(Number(val));
        }),
    )
    .openapi({ type: 'string' });

export const dateInput = z.number().transform((val) => {
  if (Number(val) < 10000000000) {
    return new Date(Number(val) * 1000);
  }
  return new Date(Number(val));
});
export const dateOutput = zDate();

export const zArray = <T extends ZodTypeAny>(schema: T) =>
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  z.preprocess((val) => (Array.isArray(val) ? val : [val]), z.array(schema));

export const zodStringArray = zArray(z.string());
