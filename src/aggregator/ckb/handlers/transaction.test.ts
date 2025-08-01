import { createTestSourceService } from '~/aggregator/ckb/test-source-service';
import { nonNullable } from '~/utils/asserts';

import { type ResolvedBlock } from '../types';
import { generateInsertTxs } from './transaction';

function getResolvedBlock(blockHash: string): Promise<ResolvedBlock> {
  const sourceService = createTestSourceService();
  return sourceService.getResolvedBlock(blockHash).then((block) => nonNullable(block));
}

test('prepare ckb tx', async () => {
  const resolvedBlock = await getResolvedBlock('0xdd4829797798f549f55ef1db67d1d291b0714112ac0f44c421cacdfb8cf90675');
  const txs = await generateInsertTxs({ priceMap: {}, block: resolvedBlock, existAssets: new Map() });

  expect(txs.length).toBe(6);
  expect(txs[0]?.inputCount).toBe(0);
  expect(txs[0]?.outputCount).toBe(1);
  expect(txs[2]?.inputCount).toBe(2);
  expect(txs[2]?.outputCount).toBe(2);
  expect(txs[2]?.from).toStrictEqual(resolvedBlock.transactions[2]?.inputs[0]?.cellOutput.lock);
  expect(txs[2]?.to).toStrictEqual(resolvedBlock.transactions[2]?.outputs[1]?.cellOutput.lock);
  expect(txs[2]?.value).toBe(BigInt(25970483237));
});

test('prepare xudt tx', async () => {
  const resolvedBlock = await getResolvedBlock('0x4a3cfae42285ef400876ea740ae1b876871c52ee99b0fa87ff2760574e699176');
  const txs = await generateInsertTxs({
    priceMap: {},
    block: resolvedBlock,
    existAssets: new Map([['0x178fb47b597a56d48b549226aff59f750b4784250c7f40f781b64ef090a8a0a7', 8]]),
  });

  expect(txs.length).toBe(34);
  expect(txs[6]?.inputCount).toBe(5);
  expect(txs[6]?.outputCount).toBe(3);
  expect(txs[6]?.tokenId).toBe('0x178fb47b597a56d48b549226aff59f750b4784250c7f40f781b64ef090a8a0a7');
});
