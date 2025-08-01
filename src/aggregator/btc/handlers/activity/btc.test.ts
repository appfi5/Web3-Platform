import { NATIVE_ASSETS } from '~/constants';
import { unimplemented } from '~/utils/unimplemented';

import { createTestSourceService } from '../../test-source-service';
import { prepareBtcActivities } from './btc';

test('prepareBTCActivities normal', async () => {
  const service = createTestSourceService();

  // https://mempool.space/zh/block/000000000003ba27aa200b1cecaad478d2b00432346c3f1f3986da1afd33e506
  const block = await service.getResolvedBlock('000000000003ba27aa200b1cecaad478d2b00432346c3f1f3986da1afd33e506');
  const prepared = await prepareBtcActivities({
    resolvedBlock: block!,
    marketService: {
      createCalculator: async () => ({ getVolume: () => '0', getAmountWithDecimals: unimplemented }),
      createCalculatorInBlock: unimplemented,
      getLatestMarketData: async () => undefined,
    },
  });

  const cellbase = prepared[0]!;
  expect(cellbase.action.action).toBe('Mint');
  expect(cellbase.action.assetId).toBe(NATIVE_ASSETS.BTC);

  const transfer = prepared[1]!;

  expect(transfer.action.action).toBe('Transfer');
  expect(transfer.action.value).toBe(5000000000n);
  expect(transfer.action.assetId).toBe(NATIVE_ASSETS.BTC);

  expect(transfer.actionAddresses[0]?.value).toBe(5000000000n);
});
