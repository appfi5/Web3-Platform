import * as R from 'remeda';

import { type BasicBlockInfo, type BasicBlockInfoService } from '~/aggregator/types';
import { sleep } from '~/utils/promise/sleep';

import { type KVStorage } from './prepare-storage';
import { startProcessBlocks } from './sync';

test('regular sync', async () => {
  const source = [
    { blockNumber: 0, blockHash: '0x0' },
    { blockNumber: 1, blockHash: '0x1' },
  ];
  const context = createFakeSyncContext([], source);

  const handleProcess = startProcessBlocks({
    storage: context.storage,
    localInfo: context.localInfo,
    sourceInfo: context.sourceInfo,
    handler: context.handler,
    startBlockNumber: 0,
    validTargetBlockNumber: 10000000,
    confirmation: 24,
  });

  await sleep(100);
  handleProcess.stop();

  expect(context.handler.prepare).toHaveBeenCalledWith(source[0]);
  expect(context.handler.prepare).toHaveBeenCalledWith(source[1]);
  expect(context.handler.save).toHaveBeenCalledWith(source[0], `prepared 0x0`);
  expect(context.handler.save).toHaveBeenCalledWith(source[1], `prepared 0x1`);
  expect(context.handler.rollback).not.toHaveBeenCalled();
});

test('retry when writing to db unexpected', async () => {
  const source = [{ blockNumber: 0, blockHash: '0x0' }];
  const context = createFakeSyncContext([], source);

  context.handler.save
    .mockRejectedValueOnce(new Error('write error1'))
    .mockRejectedValueOnce(new Error('write error2'));

  const handleProcess = startProcessBlocks({
    storage: context.storage,
    localInfo: context.localInfo,
    sourceInfo: context.sourceInfo,
    handler: context.handler,
    startBlockNumber: 0,
    validTargetBlockNumber: 0,
    confirmation: 24,
    handlerRetryDelay: 0,
  });

  await sleep(100);
  handleProcess.stop();

  expect(context.handler.save).toHaveBeenCalledTimes(3);
});

test('rollback should be called when reorg occurs', async () => {
  const source = [
    { blockNumber: 0, blockHash: '0x0' },
    { blockNumber: 1, blockHash: '0x1' },
  ];
  const context = createFakeSyncContext([], source);

  const handler = context.handler;
  const handleProcess = startProcessBlocks({
    storage: context.storage,
    localInfo: context.localInfo,
    sourceInfo: context.sourceInfo,
    handler: handler,
    startBlockNumber: 0,
    validTargetBlockNumber: 0,
    confirmation: 24,
    scanNewBlockInterval: 0,
  });

  await sleep(200);
  expect(context.localDb).toEqual(source);

  // when a new longer chain found and then reorg
  const reorgSource = [
    { blockNumber: 0, blockHash: '0xREORG0' },
    { blockNumber: 1, blockHash: '0xREORG1' },
    { blockNumber: 2, blockHash: '0xREORG2' },
  ];

  context.setSourceDb(reorgSource);
  handler.prepare.mockClear();
  handler.save.mockClear();

  await sleep(1500);
  handleProcess.stop();

  // rollback should be called in reversed order
  expect(handler.rollback.mock.calls).toEqual([
    [source[1], 'prepared 0x1'],
    [source[0], 'prepared 0x0'],
  ]);

  expect(handler.prepare).toHaveBeenCalledWith(reorgSource[0]);
  expect(handler.prepare).toHaveBeenCalledWith(reorgSource[1]);
  expect(handler.prepare).toHaveBeenCalledWith(reorgSource[2]);

  expect(context.localDb).toEqual(reorgSource);
});

test('restart from the latest block after retry too many times', async () => {
  const localBlocks = [{ blockNumber: 0, blockHash: '0x0' }];
  const sourceBlocks = [
    { blockNumber: 0, blockHash: '0x0' },
    { blockNumber: 1, blockHash: '0x1' },
  ];
  const context = createFakeSyncContext(localBlocks, sourceBlocks);

  context.handler.save.mockImplementation(async (block) => {
    const hasDuplicated = localBlocks.filter((b) => b.blockNumber === block.blockNumber).length !== 0;
    if (hasDuplicated) {
      throw new Error('duplicated');
    }
    context.localDb.push(block);
  });

  const handleProcess = startProcessBlocks({
    storage: context.storage,
    // mock the duplicated block error
    startBlockNumber: 0,

    localInfo: context.localInfo,
    sourceInfo: context.sourceInfo,
    handler: context.handler,
    validTargetBlockNumber: 0,
    confirmation: 24,
    handlerRetryDelay: 0,
    maxSaveRetry: 1,
  });

  await sleep(200);
  handleProcess.stop();

  expect(context.handler.save).toHaveBeenNthCalledWith(2, { blockNumber: 0, blockHash: '0x0' }, 'prepared 0x0');
  expect(context.handler.save).toHaveBeenCalledWith({ blockNumber: 1, blockHash: '0x1' }, 'prepared 0x1');
});

function createFakeSyncContext(initLocalDb: BasicBlockInfo[], initSourceDb: BasicBlockInfo[]) {
  let localDb: BasicBlockInfo[] = initLocalDb;
  let sourceDb: BasicBlockInfo[] = initSourceDb;

  const localInfo: BasicBlockInfoService = {
    getLastNBlockInfos: async (n) => R.takeLast(localDb, n),
    getLastBlockInfo: async () => R.last(localDb) ?? null,
    getBlockInfosByHeights: async (heights) =>
      heights.map((height) => localDb.find((item) => item.blockNumber === height) ?? null),
  };
  const sourceInfo: BasicBlockInfoService = {
    getBlockInfosByHeights: async (heights) =>
      heights.map((height) => sourceDb.find((item) => item.blockNumber === height) ?? null),
    getLastNBlockInfos: async (n) => R.takeLast(sourceDb, n),
    getLastBlockInfo: async () => R.last(sourceDb) ?? null,
  };

  const setLocalDb = (updateOrValue: BasicBlockInfo[] | ((curr: BasicBlockInfo[]) => BasicBlockInfo[])) => {
    localDb = typeof updateOrValue === 'function' ? updateOrValue(localDb) : updateOrValue;
  };

  const setSourceDb = (updateOrValue: BasicBlockInfo[] | ((curr: BasicBlockInfo[]) => BasicBlockInfo[])) => {
    sourceDb = typeof updateOrValue === 'function' ? updateOrValue(sourceDb) : updateOrValue;
  };

  const prepare = jest.fn(async (blockInfo: BasicBlockInfo) => `prepared ${blockInfo.blockHash}`);
  const save = jest.fn(async (blockInfo: BasicBlockInfo) => setLocalDb((db) => db.concat(blockInfo)));
  const rollback = jest.fn(async (blockInfo: BasicBlockInfo) =>
    setLocalDb((db) => db.filter((item) => item.blockNumber === blockInfo.blockNumber)),
  );

  let db: Record<string, unknown> = {};
  const storage: KVStorage = {
    getItem: async (key) => db[key],
    keys: async <K>() => Object.keys(db) as K[],
    removeItem: async (key) => {
      delete db[key];
    },
    setItem: async (k, v) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      Object.assign(db, { [k]: v });
    },

    clear: async () => {
      db = {};
    },
  };

  return {
    get localDb() {
      return localDb;
    },
    get sourceDb() {
      return sourceDb;
    },
    localInfo,
    sourceInfo,
    setLocalDb,
    setSourceDb,
    storage,

    handler: { prepare, save, rollback },
  };
}
