import { NATIVE_ASSETS } from '~/constants';
import { unimplemented } from '~/utils/unimplemented';

import { createTestSourceService } from '../../test-source-service';
import { prepareCkbActivities } from './ckb';

test('prepareCkbActivities normal', async () => {
  const service = createTestSourceService();

  // https://explorer.nervos.org/en/transaction/0x715fd5ffabdfc867648b6b877c463ccea23c626941701de715407b8572fd7ff2
  const block = await service.getResolvedBlock('0x19f8581ce44134820156f28b40fb8d9409781ff8474c867183cc934cb389fa34');
  const prepared = await prepareCkbActivities({
    resolvedBlock: block!,
    marketService: {
      createCalculator: async () => ({ getVolume: () => '0', getAmountWithDecimals: unimplemented }),
      createCalculatorInBlock: unimplemented,
      getLatestMarketData: async () => undefined,
    },
  });

  const cellbase = prepared[0]!;
  expect(cellbase.action.action).toBe('Mint');
  expect(cellbase.action.assetId).toBe(NATIVE_ASSETS.CKB);

  const transfer = prepared[1]!;

  expect(transfer.action.action).toBe('Transfer');
  expect(transfer.action.value).toBe(19096160596n);
  expect(transfer.action.assetId).toBe(NATIVE_ASSETS.CKB);

  expect(transfer.actionAddresses[0]?.value).toBe(19096160596n);
  expect(transfer.actionAddresses[1]?.value).toBe(6600000000n);
  expect(transfer.actionAddresses[2]?.value).toBe(12496158712n);
});
