import { createTestSourceService } from '~/aggregator/ckb/test-source-service';
import { type ResolvedBlock } from '~/aggregator/ckb/types';
import { asserts } from '~/utils/asserts';
import { unimplemented } from '~/utils/unimplemented';

import prepareSporeActivities from './spore';

async function getResolvedBlock(blockHash: string): Promise<ResolvedBlock> {
  const sourceService = createTestSourceService();
  const block = await sourceService.getResolvedBlock(blockHash);
  return block!;
}

test('activity mint', async () => {
  // check the burn transaction on https://testnet.explorer.nervos.org/transaction/0xc4b1bede4ff91f060fa0e8e06f71372db27fdc74fa5bc11df15e499b4247bcac
  const resolvedBlock = await getResolvedBlock('0x155943df65413ae97d8c42fc4174aef1ba01465120fe3567778cd9ae87b0d5e6');
  asserts(resolvedBlock);

  const activities = await prepareSporeActivities({
    resolvedBlock,
    marketService: {
      createCalculator: async () => ({ getVolume: () => '1', getAmountWithDecimals: unimplemented }),
      createCalculatorInBlock: unimplemented,
      getLatestMarketData: async () => undefined,
    },
  });

  const mintSporeActivity = activities[0]!;
  const mint = mintSporeActivity.action;
  expect(mint.action).toBe('Mint');
  expect(mint.value).toBe(1n);
  expect(mint.assetId).toBe('0x332615fae14ae5e36a03701b60b5bb62c585e29040eb54dfd3ae3e4166dfc080');
  expect(mint.inputCount).toBe(0);
  expect(mint.outputCount).toBe(1);
  expect(mint.volume).toBeUndefined();
});

test('activity transfer to order with omiga dex', async () => {
  // check the burn transaction on https://testnet.explorer.nervos.org/transaction/0xc2d16b3f8c4b951a16db72dbae8dd7b5dd72f67482eb5eb183f4c31e927f73c0
  const resolvedBlock = await getResolvedBlock('0xfbf799d6e900e7b6013de5286e54ebe4247ff51a430d6c7b9734ab6630f3d6ca');

  const activities = await prepareSporeActivities({
    resolvedBlock,
    marketService: {
      createCalculator: async () => ({ getVolume: () => '1', getAmountWithDecimals: unimplemented }),
      createCalculatorInBlock: unimplemented,
      getLatestMarketData: async () => undefined,
    },
  });

  expect(activities).toHaveLength(3);

  const transfer1 = activities[0]!;

  expect(transfer1.action.txHash).toBe('0xc2d16b3f8c4b951a16db72dbae8dd7b5dd72f67482eb5eb183f4c31e927f73c0');
  expect(transfer1.action.action).toBe('Transfer');
  expect(transfer1.action.value).toBe(1n);
  expect(transfer1.action.assetId).toBe('0x26787eed29da7253cc773b051a2578f2a76e1ab0fa6157b356ff4dd8d400a65c');
  expect(transfer1.action.volume).toBe('1');

  const transfer2 = activities[1]!;

  expect(transfer2.action.txHash).toBe('0xc2d16b3f8c4b951a16db72dbae8dd7b5dd72f67482eb5eb183f4c31e927f73c0');
  expect(transfer2.action.action).toBe('Transfer');
  expect(transfer2.action.value).toBe(1n);
  expect(transfer2.action.assetId).toBe('0xf0624e4601c71c79f52c6fdd4f1186ee86f2019b5e675d42266f089bff826c21');
  expect(transfer2.action.volume).toBe('1');

  const transfer3 = activities[2]!;

  expect(transfer3.action.txHash).toBe('0xc2d16b3f8c4b951a16db72dbae8dd7b5dd72f67482eb5eb183f4c31e927f73c0');
  expect(transfer3.action.action).toBe('Transfer');
  expect(transfer3.action.value).toBe(1n);
  expect(transfer3.action.assetId).toBe('0xd600035d420ce5411be2fd9301131771cedb6a9f4b31f152472de9072b072ef7');
  expect(transfer3.action.volume).toBe('1');
});

test('activity burn', async () => {
  // check the burn transaction on https://testnet.explorer.nervos.org/transaction/0xff64bd3660074327f3a653330e79d67d642b64cb5639a43f523d4e642f9b5752
  const resolvedBlock = await getResolvedBlock('0x5ac28030afdb1b06630da8fe80deeea012dcbd98babb08d3830811162fdc05f8');

  const activities = await prepareSporeActivities({
    resolvedBlock,
    marketService: {
      createCalculator: async () => ({ getVolume: () => '1', getAmountWithDecimals: unimplemented }),
      createCalculatorInBlock: unimplemented,
      getLatestMarketData: async () => undefined,
    },
  });

  expect(activities).toHaveLength(1);
  const burn = activities[0]!;
  expect(burn.action.txHash).toBe('0xff64bd3660074327f3a653330e79d67d642b64cb5639a43f523d4e642f9b5752');
  expect(burn.action.action).toBe('Burn');
  expect(burn.action.assetId).toBe('0x8de8819f142c2d06a73782daf9ebe8af2efe85da5012e95eb4b4a00fb8d70355');
});
