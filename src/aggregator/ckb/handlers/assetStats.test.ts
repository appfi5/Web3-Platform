import { noopLogger } from '~/aggregator/test-utils';
import { NATIVE_ASSETS } from '~/constants';
import { asserts } from '~/utils/asserts';
import { unimplemented } from '~/utils/unimplemented';

import { createTestSourceService } from '../test-source-service';
import assetStatsHandler from './assetStats';

test('assetStats prepare', async () => {
  const service = createTestSourceService();
  const resolvedBlock = await service.getResolvedBlock(
    '0x8c1ef9bf5b31371f88172bc20f13d239379adfcdda6a13a923085f7820a88afb',
  );

  asserts(resolvedBlock != null);

  const getVolume = jest.fn(() => '0');
  const preparedData = await assetStatsHandler.prepare!({
    resolvedBlock: resolvedBlock,
    logger: noopLogger,
    marketService: {
      createCalculator: async () => ({ getVolume, getAmountWithDecimals: unimplemented }),
      createCalculatorInBlock: unimplemented,
      getLatestMarketData: async () => undefined,
    },
  });

  expect(preparedData[0]?.assetId).toEqual(NATIVE_ASSETS.CKB);
  expect(preparedData[0]?.holderAddresses.length).toEqual(9);

  const SEAL_ID = '0x178fb47b597a56d48b549226aff59f750b4784250c7f40f781b64ef090a8a0a7';
  expect(preparedData[1]?.assetId).toEqual(SEAL_ID);
  expect(preparedData[1]?.transactionCount).toBe(1);
  expect(preparedData[1]?.holderAddresses.length).toBe(1);
  expect(getVolume).toHaveBeenCalledWith({
    timestamp: Number(resolvedBlock.header.timestamp),
    assetId: SEAL_ID,
    value: 21_000_000n * 10n ** 8n,
  });
});

test('assetStats with many same addresses in a block', async () => {
  const service = createTestSourceService();
  // https://testnet.explorer.nervos.org/block/0xba30ded84afa38c28c57c74c7612de99f9d71698e0520e5f8c3856431d259933
  const resolvedBlock = await service.getResolvedBlock(
    '0xba30ded84afa38c28c57c74c7612de99f9d71698e0520e5f8c3856431d259933',
  );

  asserts(resolvedBlock != null);

  const getVolume = jest.fn(() => '0');
  const preparedData = await assetStatsHandler.prepare!({
    resolvedBlock: resolvedBlock,
    logger: noopLogger,
    marketService: {
      createCalculator: async () => ({ getVolume, getAmountWithDecimals: unimplemented }),
      createCalculatorInBlock: unimplemented,
      getLatestMarketData: async () => undefined,
    },
  });

  // only CKB invoved
  expect(preparedData).toHaveLength(1);
  // 1 mining transaction and 6 chained-transaction
  expect(preparedData[0]!.transactionCount).toBe(7);
  // 1 miner address and 1 chained-transaction sender
  expect(preparedData[0]!.holderAddresses).toHaveLength(2);
});
