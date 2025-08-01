import { createLock, takeReorgBlocks } from './reorg';

test('takeReorgBlocks', () => {
  expect(takeReorgBlocks([], [])).toEqual([]);

  expect(takeReorgBlocks([{ blockNumber: 0, blockHash: '0x0' }], [{ blockNumber: 0, blockHash: '0x0' }])).toEqual([]);

  expect(
    takeReorgBlocks(
      [
        { blockNumber: 0, blockHash: '0x0' },
        { blockNumber: 2, blockHash: '0x2' },
        { blockNumber: 1, blockHash: '0xreorg' },
      ],
      [
        { blockNumber: 2, blockHash: '0x2' },
        { blockNumber: 0, blockHash: '0x0' },
        { blockNumber: 1, blockHash: '0x1' },
      ],
    ),
  ).toEqual([
    { blockNumber: 2, blockHash: '0x2' },
    { blockNumber: 1, blockHash: '0xreorg' },
  ]);
});

test('reorg lock', () => {
  const lock = createLock();

  expect(lock.version).toBe(0);
  lock.lock();

  expect(lock.version).toBe(1);
  expect(() => lock.lock()).toThrow();

  lock.unlock();
  expect(() => lock.lock()).not.toThrow();
});
