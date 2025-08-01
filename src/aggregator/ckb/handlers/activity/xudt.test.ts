import { parseUnit } from '@ckb-lumos/lumos/utils';

import { createTestSourceService } from '~/aggregator/ckb/test-source-service';
import { type ResolvedBlock } from '~/aggregator/ckb/types';
import { asserts } from '~/utils/asserts';
import { unimplemented } from '~/utils/unimplemented';

import prepareXudtActivities from './xudt';

const SEAL_TYPE_HASH = '0x178fb47b597a56d48b549226aff59f750b4784250c7f40f781b64ef090a8a0a7';

async function getResolvedBlock(blockHash: string): Promise<ResolvedBlock> {
  const sourceService = createTestSourceService();
  const block = await sourceService.getResolvedBlock(blockHash);
  return block!;
}

test('activity mint', async () => {
  const resolvedBlock = await getResolvedBlock('0x8c1ef9bf5b31371f88172bc20f13d239379adfcdda6a13a923085f7820a88afb');
  asserts(resolvedBlock);

  const activities = await prepareXudtActivities({
    resolvedBlock,
    marketService: {
      createCalculator: async () => ({ getVolume: () => '1', getAmountWithDecimals: unimplemented }),
      createCalculatorInBlock: unimplemented,
      getLatestMarketData: async () => undefined,
    },
  });

  const mintSealActivity = activities[0]!;
  const TOTAL_SEAL = 21_000_000n * 10n ** 8n;

  const mint = mintSealActivity.action;
  expect(mint.action).toBe('Mint');
  expect(mint.value).toBe(TOTAL_SEAL);
  expect(mint.assetId).toBe(SEAL_TYPE_HASH);
  expect(mint.inputCount).toBe(0);
  expect(mint.outputCount).toBe(1);
  expect(mint.volume).toBe('1');
});

test('activity transfer', async () => {
  const resolvedBlock = await getResolvedBlock('0xdf52b35f3ed33faca0dcffbf997c62d2ff1a4d7bc59aa977c719e63c944d439e');

  const activities = await prepareXudtActivities({
    resolvedBlock,
    marketService: {
      createCalculator: async () => ({ getVolume: () => '0', getAmountWithDecimals: unimplemented }),
      createCalculatorInBlock: unimplemented,
      getLatestMarketData: async () => undefined,
    },
  });

  expect(activities).toHaveLength(2);

  const transfer1 = activities[0]!;

  expect(transfer1.action.txHash).toBe('0xdb8c1b3c154400d950a53cc8b48660d7355006e8f4974592595a19dc8dadd453');
  expect(transfer1.action.action).toBe('Transfer');
  expect(transfer1.action.value).toBe(3n * 10n ** 8n);
  expect(transfer1.action.assetId).toBe(SEAL_TYPE_HASH);
});

test('activity burn', async () => {
  const resolvedBlock = await getResolvedBlock('0xd35c6244abc90e523983be5c175d9988a1d4937e3a46212b0bfa8c078e9cf3e7');

  const activities = await prepareXudtActivities({
    resolvedBlock,
    marketService: {
      createCalculator: async () => ({ getVolume: () => '0', getAmountWithDecimals: unimplemented }),
      createCalculatorInBlock: unimplemented,
      getLatestMarketData: async () => undefined,
    },
  });

  const burn1 = activities[1]!;
  const SEAL_LP_TYPE_HASH = '0x17e3a05e0a33dd00eb601ee4f0115039168930a5ce98c5455e5be456e2ba2de8';

  expect(burn1.action.txHash).toBe('0x86b0549b0fac164470115f299efbe4c12321817004645d81af4d388904f82037');
  expect(burn1.action.action).toBe('Burn');
  expect(burn1.action.assetId).toBe(SEAL_LP_TYPE_HASH);
});

test('variant xudt RUSD', async () => {
  // RUSD mint transaction
  // https://explorer.nervos.org/transaction/0xf55e5ba3ae2159565cb4760b7b34f9c0a893186f34bb8ecd274fb3a99e75e213
  const resolvedBlock = await getResolvedBlock('0x2482764d5f7a37c62bab630009a4b46ba05ceb3b0f7db5a0c5c4907b566edde5');

  const activites = await prepareXudtActivities({
    resolvedBlock,
    marketService: {
      createCalculator: async () => ({ getVolume: () => '0', getAmountWithDecimals: unimplemented }),
      createCalculatorInBlock: unimplemented,
      getLatestMarketData: unimplemented,
    },
  });

  // https://explorer.nervos.org/xudt/0x71ff665b40ba044b1981ea9a8965189559c8e01e8cdfa34a3cc565e1f870a95c
  const RUSD_TYPE_HASH = '0x71ff665b40ba044b1981ea9a8965189559c8e01e8cdfa34a3cc565e1f870a95c';

  expect(activites).toHaveLength(1);
  expect(activites[0]!.action.action).toBe('Mint');
  // 110 RUSD, RUSD is 8 decimals
  expect(activites[0]!.action.value).toBe(parseUnit('110', 8).toBigInt());
  expect(activites[0]!.action.assetId).toBe(RUSD_TYPE_HASH);

  expect(activites[0]!.actionAddresses).toHaveLength(3);
});
