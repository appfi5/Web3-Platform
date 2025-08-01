/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { sleep } from '~/utils/promise/sleep';

import { type BatchBlocks, startBatchSync } from './sync-batch';

test('regular batch sync', async () => {
  const handler = {
    prepare: jest
      .fn<Promise<string>, [{ blockNumber: number }]>()
      .mockImplementation(async ({ blockNumber }) => `prepared ${blockNumber}`),
    save: jest.fn<Promise<void>, [BatchBlocks<string>]>().mockImplementation(async () => undefined),
  };
  const onStop = jest.fn();

  startBatchSync({
    startBlockNumber: 0,
    endBlockNumber: 3,
    handler,
    preparationConcurrency: 2,
    preparationBufferSize: 10,
    saveDelay: 0,
  }).onStop(onStop);

  await sleep(100);

  expect(onStop).toHaveBeenCalled();
  // Should prepare blocks 0-3
  expect(handler.prepare).toHaveBeenCalledWith({ blockNumber: 0 });
  expect(handler.prepare).toHaveBeenCalledWith({ blockNumber: 1 });
  expect(handler.prepare).toHaveBeenCalledWith({ blockNumber: 2 });
  expect(handler.prepare).toHaveBeenCalledWith({ blockNumber: 3 });

  // Should save blocks in batches
  expect(handler.save).toHaveBeenCalled();
  const saveCall = handler.save.mock.calls[0]![0];
  expect(saveCall).toBeInstanceOf(Array);
  expect(saveCall.map((b) => b.blockNumber)).toEqual([0, 1, 2, 3]);
  expect(saveCall.map((b) => b.preparedData)).toEqual(['prepared 0', 'prepared 1', 'prepared 2', 'prepared 3']);
});

test('handles preparation errors with retry', async () => {
  const handler = {
    prepare: jest
      .fn()
      .mockImplementationOnce(async () => Promise.reject(new Error('prep error 1')))
      .mockImplementationOnce(async () => Promise.reject(new Error('prep error 2')))
      .mockImplementation(async ({ blockNumber }) => `prepared ${blockNumber}`),
    save: jest.fn().mockImplementation(async () => undefined),
  };

  startBatchSync({
    startBlockNumber: 0,
    endBlockNumber: 1,
    handler,
    preparationConcurrency: 1,
    preparationBufferSize: 10,
    preparationTimeout: 1000,
    handlerRetryDelay: 0,
    saveDelay: 50,
  });

  await sleep(100);

  expect(handler.prepare).toHaveBeenCalledTimes(4);
  expect(handler.save).toHaveBeenCalledTimes(1);
});

test('handles save errors with retry', async () => {
  const handler = {
    prepare: jest.fn().mockImplementation(async ({ blockNumber }) => `prepared ${blockNumber}`),
    save: jest
      .fn()
      .mockImplementationOnce(async () => Promise.reject(new Error('save error 1')))
      .mockImplementationOnce(async () => Promise.reject(new Error('save error 2')))
      .mockImplementation(async () => undefined),
  };

  const process = startBatchSync({
    startBlockNumber: 0,
    endBlockNumber: 1,
    handler,
    preparationConcurrency: 1,
    preparationBufferSize: 10,
    preparationTimeout: 1000,
    handlerRetryDelay: 0,
    saveDelay: 50,
  });

  await sleep(150);
  process.stop();

  // Should retry saving
  expect(handler.save).toHaveBeenCalledTimes(3);
});

test('handles preparation timeout', async () => {
  const timeoutFn = async ({ blockNumber }: { blockNumber: number }) => {
    await sleep(200); // Delay longer than timeout
    return `prepared ${blockNumber}`;
  };
  const handler = {
    prepare: jest
      .fn()
      .mockImplementationOnce(timeoutFn)
      .mockImplementationOnce(timeoutFn)
      .mockImplementation(async ({ blockNumber }) => `prepared ${blockNumber}`),
    save: jest.fn().mockImplementation(async () => undefined),
  };

  const process = startBatchSync({
    startBlockNumber: 0,
    endBlockNumber: 1,
    handler,
    preparationConcurrency: 1,
    preparationBufferSize: 10,
    preparationTimeout: 100, // Short timeout
    handlerRetryDelay: 0,
  });

  await sleep(250);
  process.stop();

  // Should retry after timeout
  expect(handler.prepare).toHaveBeenCalledTimes(4);
  expect(handler.save).toHaveBeenCalledTimes(0);
});

test('calls getLastSavedBlockNumber after too many save retries', async () => {
  const getLastSavedBlockNumber = jest.fn().mockResolvedValue(1);
  const handler = {
    prepare: jest.fn().mockImplementation(async ({ blockNumber }) => `prepared ${blockNumber}`),
    save: jest
      .fn<Promise<void>, [BatchBlocks<string>]>()
      .mockImplementation(([{ blockNumber }]) =>
        blockNumber === 0 ? Promise.reject(new Error('persistent save error')) : Promise.resolve(),
      ),
  };

  startBatchSync({
    startBlockNumber: 0,
    endBlockNumber: 1,
    handler,
    preparationConcurrency: 1,
    preparationBufferSize: 10,
    preparationTimeout: 1000,
    handlerRetryDelay: 0,
    saveDelay: 0,
    getLastSavedBlockNumber,
  });

  await sleep(200);

  expect(handler.save).toHaveBeenCalledTimes(4);
  // Should call getLastSavedBlockNumber after too many retries
  expect(getLastSavedBlockNumber).toHaveBeenCalledTimes(1);
});

test('stop soon without any prepare and save', async () => {
  const handler = {
    prepare: jest.fn(),
    save: jest.fn(),
  };
  const onStop = jest.fn();

  startBatchSync({
    startBlockNumber: 3,
    endBlockNumber: 1,
    handler: handler,
  }).onStop(onStop);

  expect(onStop).toHaveBeenCalledTimes(1);
  await sleep(100);

  expect(handler.prepare).not.toHaveBeenCalled();
  expect(handler.save).not.toHaveBeenCalled();
});
