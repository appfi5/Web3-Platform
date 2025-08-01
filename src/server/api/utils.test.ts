import { TRPCError } from '@trpc/server';

import { getOrFillRecentDaysValue, tryCatchTRPC } from './utils';

test('should return the value if the date is match', () => {
  const values = [
    {
      date: '2021-01-01',
      cumulativeValue: '1',
      assetId: '1',
    },
  ];
  expect(getOrFillRecentDaysValue(values, ['2021-01-01'])).toStrictEqual(values);
});

test('should return the before if the date is bigger', () => {
  const values = [
    {
      date: '2021-01-01',
      cumulativeValue: '1',
      assetId: '1',
    },
  ];
  expect(getOrFillRecentDaysValue(values, ['2021-02-01'])).toStrictEqual([
    {
      date: '2021-02-01',
      cumulativeValue: '1',
      assetId: '1',
    },
  ]);
});

test('should return empty if the value is empty', () => {
  expect(getOrFillRecentDaysValue([], ['2021-02-01'])).toStrictEqual([]);
});

test('should return if the cumulativeValue is zero', () => {
  const values = [
    {
      date: '2021-01-01',
      cumulativeValue: '0',
      assetId: '1',
    },
  ];
  expect(getOrFillRecentDaysValue(values, ['2021-02-01'])).toStrictEqual([
    {
      date: '2021-02-01',
      cumulativeValue: '0',
      assetId: '1',
    },
  ]);
});

test('tryCatchTRPC', async () => {
  try {
    tryCatchTRPC(() => {
      throw new Error('test');
    });

    throw new Error('Test failed');
  } catch (e) {
    if (!(e instanceof TRPCError)) {
      throw new Error('Test failed');
    }

    expect(e.message).toBe('test');
    expect(e.code).toBe('BAD_REQUEST');
  }

  try {
    await tryCatchTRPC(
      async () => {
        throw new Error('test');
      },
      { code: 'INTERNAL_SERVER_ERROR' },
    );

    throw new Error('Test failed');
  } catch (e) {
    if (!(e instanceof TRPCError)) {
      throw new Error('Test failed');
    }

    expect(e.message).toBe('test');
    expect(e.code).toBe('INTERNAL_SERVER_ERROR');
  }
});
