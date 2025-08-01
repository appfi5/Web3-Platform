import * as R from 'remeda';

import { type BasicBlockInfo } from '~/aggregator/types';

/**
 * get the reorged blocks in the decremental sort
 * @param localBlocks
 * @param sourceBlocks
 */
export function takeReorgBlocks(localBlocks: BasicBlockInfo[], sourceBlocks: BasicBlockInfo[]): BasicBlockInfo[] {
  const sourceBlockMap: Record<number /*block number*/, string /*block hash*/> = R.mapToObj(
    sourceBlocks,
    (blockInfo) => [blockInfo.blockNumber, blockInfo?.blockHash],
  );

  return R.pipe(
    localBlocks,
    R.sortBy([R.prop('blockNumber'), 'asc']),
    R.dropWhile((localBlock) => sourceBlockMap[localBlock.blockNumber] === localBlock.blockHash),
    R.reverse(),
  );
}

type Version = number;

interface SimpleLock {
  readonly version: Version;
  readonly locked: boolean;

  lock: () => void;
  unlock: () => void;
  compare: (other: Version) => boolean;
}

export function createLock(): SimpleLock {
  let version = 0;
  let locked = false;

  return {
    get version() {
      return version;
    },
    get locked() {
      return locked;
    },

    lock: () => {
      if (locked) {
        throw new Error('The lock is locked, can not lock it again');
      }
      version++;
      locked = true;
    },
    unlock: () => {
      locked = false;
    },

    compare: (other: number) => version === other,
  };
}
