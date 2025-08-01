import { TRPCError } from '@trpc/server';
import type { TRPC_ERROR_CODE_KEY } from '@trpc/server/rpc';
import { AxiosError } from 'axios';
import * as R from 'remeda';

const getTRPCErrorCode = (status: number): TRPC_ERROR_CODE_KEY => {
  switch (status) {
    case 400:
      return 'BAD_REQUEST';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 408:
      return 'TIMEOUT';
    case 409:
      return 'CONFLICT';
    case 413:
      return 'PAYLOAD_TOO_LARGE';
    case 422:
      return 'UNPROCESSABLE_CONTENT';
    case 429:
      return 'TOO_MANY_REQUESTS';
    case 500:
      return 'INTERNAL_SERVER_ERROR';
    case 501:
      return 'NOT_IMPLEMENTED';
    case 503:
      return 'SERVICE_UNAVAILABLE';
    default:
      return 'BAD_REQUEST';
  }
};

export function getOrFillRecentDaysValue(
  addressAssetValues: {
    date: string;
    assetId: string;
    cumulativeValue: string;
  }[],
  recentDates: string[],
) {
  return R.pipe(
    addressAssetValues,
    R.filter((v) => !!v.cumulativeValue),
    R.groupBy(R.prop('assetId')),
    R.mapValues((v) =>
      R.pipe(
        recentDates,
        R.map((date) => {
          const value = v.find((i) => i.date === date);
          if (value) return value;
          const firstBeforeValue = v.find((i) => i.date < date);
          if (firstBeforeValue) {
            return {
              ...firstBeforeValue,
              date,
            };
          }
        }),
        R.filter((v) => v !== undefined),
      ),
    ),
    R.values(),
    R.flat(),
  );
}

const isAxiosError = (error: unknown): error is AxiosError => {
  return error instanceof AxiosError || error?.constructor.name === 'AxiosError';
};

export const catchAxiosError = (err: unknown) => {
  if (!isAxiosError(err)) return;

  if (!err.response) {
    throw new TRPCError({
      code: 'TIMEOUT',
      cause: err,
    });
  }
  let message = err.message;
  if (typeof err.response.data === 'string') {
    message = err.response.data;
  }

  throw new TRPCError({
    code: getTRPCErrorCode(err.response.status),
    message,
    cause: err,
  });
};

export function tryCatchTRPC<T>(
  fn: () => T,
  opt: ConstructorParameters<typeof TRPCError>[0] = { code: 'BAD_REQUEST' },
): T {
  try {
    const result = fn();
    if (result instanceof Promise) {
      return result.then(
        (res) => res as Awaited<T>,
        (e) => {
          void catchAxiosError(e);
          if (e instanceof Error) {
            throw new TRPCError({ ...opt, message: opt.message ?? e.message });
          }
          throw e;
        },
      ) as T;
    }
    return result;
  } catch (e) {
    throw new TRPCError({
      ...opt,
      message: opt.message ?? (e instanceof Error ? e.message : 'Runtime occurs, please check the parameters'),
    });
  }
}

export const USDollar = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

export function assertsTRPCError(
  condition: unknown,
  code: TRPC_ERROR_CODE_KEY,
  message = 'Not found',
): asserts condition {
  if (!condition) {
    throw new TRPCError({
      message,
      code,
    });
  }
}
