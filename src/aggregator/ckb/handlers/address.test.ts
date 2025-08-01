import { createTestSourceService } from '~/aggregator/ckb/test-source-service';
import { TESTNET } from '~/lib/constant';
import { asserts } from '~/utils/asserts';

import { hexifyScript } from '../utils';
import { prepareCKBChanges, prepareSporeChanges, prepareXudtChanges } from './address';

test('prepare address asset', async () => {
  const sourceService = createTestSourceService();
  const block = await sourceService.getResolvedBlock(
    '0xc8684b0f2764c8a25d374fa86c201a0fafd7f26a02c47b62f1cc0487e687c183',
  );
  asserts(block);
  const SEAL_ASSET_ID = '0x178fb47b597a56d48b549226aff59f750b4784250c7f40f781b64ef090a8a0a7';

  const xudtChanges = prepareXudtChanges(block);
  const ckbChanges = prepareCKBChanges(block);

  expect(xudtChanges.length).toEqual(2);
  expect(xudtChanges.reduce((acc, cur) => acc + cur.amount, 0n)).toEqual(0n);
  expect(xudtChanges[0]?.address).toEqual(
    hexifyScript({
      codeHash: '0xd00c84f0ec8fd441c38bc3f87a371f547190f2fcff88e642bc5bf54b9e318323',
      hashType: 'type',
      args: '0x000117caa6f8102d6dea981b68586d00cd6f8280da34',
    }),
  );
  expect(xudtChanges[0]?.assetId).toEqual(SEAL_ASSET_ID);
  expect(xudtChanges[0]?.amount).toEqual(-247496n);

  expect(xudtChanges[1]?.address).toEqual(
    hexifyScript({
      codeHash: '0x393df3359e33f85010cd65a3c4a4268f72d95ec6b049781a916c680b31ea9a88',
      hashType: 'type',
      args: '0x29273406698f36e9bdf46db404176859b0ba3a6bdf7025833f7fd3b49150609a',
    }),
  );
  expect(xudtChanges[1]?.assetId).toEqual(SEAL_ASSET_ID);
  expect(xudtChanges[1]?.amount).toEqual(247496n);

  expect(ckbChanges.length).toEqual(6);
  expect(ckbChanges.reduce((acc, cur) => acc + cur.amount, 0n)).toEqual(70012189136n);

  // cellBase
  const minter = block.transactions[0].outputs[0]?.cellOutput.lock;
  const reward = block.transactions[0].outputs[0]?.cellOutput.capacity;

  asserts(minter);
  asserts(reward);

  expect(ckbChanges.some((c) => c.address === hexifyScript(minter))).toEqual(true);
  expect(ckbChanges.find((c) => c.address === hexifyScript(minter))?.amount).toEqual(BigInt(reward));
});

test('prepare mint spore asset', async () => {
  const sourceService = createTestSourceService();
  const block = await sourceService.getResolvedBlock(
    '0x155943df65413ae97d8c42fc4174aef1ba01465120fe3567778cd9ae87b0d5e6',
  );
  asserts(block);
  const sporeChanges = prepareSporeChanges(block);
  expect(sporeChanges).toHaveLength(1);

  expect(sporeChanges[0]?.assetId).toBe('0x332615fae14ae5e36a03701b60b5bb62c585e29040eb54dfd3ae3e4166dfc080');
  expect(sporeChanges[0]?.address).toBe(
    hexifyScript({
      codeHash: '0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8',
      args: '0xe390d4b9b4c7637ec80799bdaf644ae625cdb922',
      hashType: 'type',
    }),
  );
});

test('prepare transfer spore asset to dex', async () => {
  const sourceService = createTestSourceService();
  const block = await sourceService.getResolvedBlock(
    '0xfbf799d6e900e7b6013de5286e54ebe4247ff51a430d6c7b9734ab6630f3d6ca',
  );
  asserts(block);
  const sporeChanges = prepareSporeChanges(block);
  expect(sporeChanges).toHaveLength(6);

  expect(sporeChanges[0]?.assetId).toBe('0x26787eed29da7253cc773b051a2578f2a76e1ab0fa6157b356ff4dd8d400a65c');
  expect(sporeChanges[0]?.address).toBe(
    hexifyScript({
      codeHash: TESTNET.SCRIPTS.OMIGA_DEX.CODE_HASH,
      args: '0x4b000000100000003000000031000000f329effd1c475a2978453c8600e1eaf0bc2087ee093c3ee64cc96ec6847752cb011600000012ce89ed5396cd63d8034df69fe352fd8a27ce7ee7000400000000000000000000048dc874d600',
      hashType: TESTNET.SCRIPTS.OMIGA_DEX.HASH_TYPE,
    }),
  );
  expect(sporeChanges[0]?.amount.toString()).toBe('5007000000000');

  expect(sporeChanges[3]?.assetId).toBe('0x26787eed29da7253cc773b051a2578f2a76e1ab0fa6157b356ff4dd8d400a65c');
  expect(sporeChanges[3]?.address).toBe(
    hexifyScript({
      codeHash: '0xf329effd1c475a2978453c8600e1eaf0bc2087ee093c3ee64cc96ec6847752cb',
      args: '0x12ce89ed5396cd63d8034df69fe352fd8a27ce7ee700',
      hashType: 'type',
    }),
  );
  expect(sporeChanges[3]?.deleted).toBeTruthy();
});

test('prepare transfer spore asset cancel from dex', async () => {
  const sourceService = createTestSourceService();
  const block = await sourceService.getResolvedBlock(
    '0x0fdd27e10254e30b47509d7d8e616e59160c2ef761c809f1eabb7957615c11f5',
  );
  asserts(block);
  const sporeChanges = prepareSporeChanges(block);
  expect(sporeChanges).toHaveLength(2);

  expect(sporeChanges[0]?.assetId).toBe('0xfb6f321be8bb8d36d785c22e705784f9467a9e6e9c8b875758030cf8d766dabe');
  expect(sporeChanges[0]?.address).toBe(
    hexifyScript({
      codeHash: '0xf329effd1c475a2978453c8600e1eaf0bc2087ee093c3ee64cc96ec6847752cb',
      args: '0x12da063c6055d2e8083ec86291596988617e96373900',
      hashType: 'type',
    }),
  );
  expect(sporeChanges[0]?.amount.toString()).toBe('0');

  expect(sporeChanges[1]?.assetId).toBe('0xfb6f321be8bb8d36d785c22e705784f9467a9e6e9c8b875758030cf8d766dabe');
  expect(sporeChanges[1]?.address).toBe(
    hexifyScript({
      codeHash: TESTNET.SCRIPTS.OMIGA_DEX.CODE_HASH,
      args: '0x4b000000100000003000000031000000f329effd1c475a2978453c8600e1eaf0bc2087ee093c3ee64cc96ec6847752cb011600000012da063c6055d2e8083ec86291596988617e963739000400000000000000000000020706ac9400',
      hashType: TESTNET.SCRIPTS.OMIGA_DEX.HASH_TYPE,
    }),
  );
  expect(sporeChanges[1]?.deleted).toBeTruthy();
});

test('prepare transfer spore asset bought from dex', async () => {
  const sourceService = createTestSourceService();
  const block = await sourceService.getResolvedBlock(
    '0x6ac0edaffc0dc5c53565c1bd28050828cfd552133b6156551ea73b035654e0a8',
  );
  asserts(block);
  const sporeChanges = prepareSporeChanges(block);
  expect(sporeChanges).toHaveLength(4);

  expect(sporeChanges[0]?.assetId).toBe('0x60e2c63a33388db688d32f5292f6d37093e190dd324bf19ad51d9ac91aef206c');
  expect(sporeChanges[0]?.address).toBe(
    hexifyScript({
      codeHash: '0xd23761b364210735c19c60561d213fb3beae2fd6172743719eff6920e020baac',
      args: '0x00014351f28e54c285dc98a06e7067faf74ab461fe34',
      hashType: 'type',
    }),
  );
  expect(sporeChanges[0]?.amount.toString()).toBe('1007000000000');

  expect(sporeChanges[2]?.assetId).toBe('0x60e2c63a33388db688d32f5292f6d37093e190dd324bf19ad51d9ac91aef206c');
  expect(sporeChanges[2]?.address).toBe(
    hexifyScript({
      codeHash: TESTNET.SCRIPTS.OMIGA_DEX.CODE_HASH,
      args: '0x4b000000100000003000000031000000f329effd1c475a2978453c8600e1eaf0bc2087ee093c3ee64cc96ec6847752cb011600000012abaf75a934e8b4da85db7c79a9e8c5a0022a166000040000000000000000000000ea75e09600',
      hashType: TESTNET.SCRIPTS.OMIGA_DEX.HASH_TYPE,
    }),
  );
  expect(sporeChanges[2]?.deleted).toBeTruthy();
});

test('prepare burn spore asset', async () => {
  const sourceService = createTestSourceService();
  const block = await sourceService.getResolvedBlock(
    '0x5ac28030afdb1b06630da8fe80deeea012dcbd98babb08d3830811162fdc05f8',
  );
  asserts(block);
  const sporeChanges = prepareSporeChanges(block);
  expect(sporeChanges).toHaveLength(1);

  expect(sporeChanges[0]?.assetId).toBe('0x8de8819f142c2d06a73782daf9ebe8af2efe85da5012e95eb4b4a00fb8d70355');
  expect(sporeChanges[0]?.address).toBe(
    hexifyScript({
      codeHash: '0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8',
      args: '0xe390d4b9b4c7637ec80799bdaf644ae625cdb922',
      hashType: 'type',
    }),
  );
  expect(sporeChanges[0]?.deleted).toBeTruthy();
});
