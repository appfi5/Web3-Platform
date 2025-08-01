import { createTestSourceService } from '~/aggregator/btc/test-source-service';
import { nonNullable } from '~/utils/asserts';
import { unimplemented } from '~/utils/unimplemented';

import { type ResolvedBlock } from '../types';
import { prepare } from './transaction';

function getResolvedBlock(blockHash: string): Promise<ResolvedBlock> {
  const sourceService = createTestSourceService();
  return sourceService.getResolvedBlock(blockHash).then((block) => nonNullable(block));
}

test('prepare btc tx', async () => {
  // https://mempool.space/zh/testnet/block/00000000e8c179e8b670caebe911373efd3186a2fd747431201cda0afa19a81e
  const resolvedBlock = await getResolvedBlock('00000000e8c179e8b670caebe911373efd3186a2fd747431201cda0afa19a81e');
  const txs = await prepare({
    marketService: {
      createCalculator: async () => ({ getVolume: () => '0', getAmountWithDecimals: unimplemented }),
      createCalculatorInBlock: unimplemented,
      getLatestMarketData: unimplemented,
    },
    resolvedBlock,
  });

  expect(txs.length).toBe(496);
});
