import { EventEmitter } from 'node:events';

import * as R from 'remeda';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  concatMap,
  defer,
  delay,
  EMPTY,
  first,
  forkJoin,
  from,
  fromEvent,
  interval,
  last,
  map,
  merge,
  mergeMap,
  NEVER,
  type Observable,
  of,
  race,
  repeat,
  retry,
  share,
  skip,
  skipWhile,
  takeUntil,
  tap,
  throttle,
  timeout,
} from 'rxjs';

import { asserts } from '~/utils/asserts';

import {
  type BasicBlockInfo,
  type BasicBlockInfoService,
  type Hash,
  type Logger,
  type SequenceBlockHandler,
} from '../types';
import { createPrepareDataStorage, type KVStorage } from './prepare-storage';
import { createLock, takeReorgBlocks } from './reorg';

type BlockEvents<Prepared> = {
  prepareStart: [{ blockNumber: number }];
  prepareEnd: [{ reorgVersion: number; blockInfo: BasicBlockInfo; preparedData: Prepared }];

  saveStart: [{ blockInfo: BasicBlockInfo }];
  saveEnd: [{ blockInfo: BasicBlockInfo }];

  rollbackStart: [{ startBlockNumber: number; endBlockNumber: number }];
  rollbackEnd: [{ startBlockNumber: number }];
};

export function startProcessBlocks<Prepared>({
  localInfo,
  sourceInfo,
  confirmation,
  handler,
  startBlockNumber,
  validTargetBlockNumber,
  handlerRetryDelay = 1000,
  logStateInterval = 1000,
  disableLogState = false,
  scanNewBlockInterval = 1000,
  maxSaveRetry = 3,
  shouldStopSaveBlock = () => false,

  preparationConcurrency = 35,
  preparationBufferSize = 1000,
  preparationTimeout = 20000,

  storage,
  logger = noopLogger,
}: {
  sourceInfo: BasicBlockInfoService;
  localInfo: BasicBlockInfoService;
  handler: SequenceBlockHandler<Prepared>;

  confirmation: number;
  startBlockNumber: number;
  validTargetBlockNumber: number;
  handlerRetryDelay?: number;
  logStateInterval?: number;
  scanNewBlockInterval?: number;
  disableLogState?: boolean;
  // if the save process retry more than maxSaveRetry times,
  // the save will be relaunched from the local last block
  maxSaveRetry?: number;

  preparationConcurrency?: number;
  preparationBufferSize?: number;
  preparationTimeout?: number;
  shouldStopSaveBlock?: (blockInfo: BasicBlockInfo) => boolean;
  storage: KVStorage;
  logger?: Logger;
}) {
  const prepareNumber$ = new BehaviorSubject(startBlockNumber);
  const saveNumber$ = new BehaviorSubject(startBlockNumber);

  const prepareStore = createPrepareDataStorage<Prepared>({ storage });

  // a versioning lock locked when reorg occurs
  // to ensure that the prepared data is not outdated
  const reorgLock = createLock();

  // a counter of the working preparation processes
  // when a preparation job start, increase 1
  // when a preparation job end, decrease 1
  let workingPreparationCount = 0;

  const emitter = new EventEmitter<BlockEvents<Prepared>>();

  const tapError = <T>(header?: string) =>
    tap<T>({
      error: (error: Error) => {
        logger.error({ err: error, msg: `❌ ${header ?? ''}` });
      },
    });

  // a multicast observable of the reorg events
  const rollbackEvent$ = merge(fromEvent(emitter, 'rollbackStart'), fromEvent(emitter, 'rollbackEnd')).pipe(share());

  // log the preparation and save events every second
  if (!disableLogState) {
    combineLatest([
      fromEvent(emitter, 'prepareEnd', ({ blockInfo }: { blockInfo: BasicBlockInfo }) => blockInfo),
      fromEvent(emitter, 'saveEnd', ({ blockInfo }: { blockInfo: BasicBlockInfo }) => blockInfo),
    ])
      .pipe(
        throttle(() => interval(logStateInterval)),
        mergeMap(([lastPrepare, lastSave]) =>
          forkJoin({
            lastPrepare: of(lastPrepare),
            lastSave: of(lastSave),
            preparedSize: prepareStore.getSize(),
          }),
        ),
      )
      .subscribe(({ lastPrepare, lastSave, preparedSize }) => {
        logger.info(`state report:
- prepare buffer size: ${preparedSize}/${preparationBufferSize}
- working preparation: ${workingPreparationCount}/${preparationConcurrency}
- last prepared block: ${lastPrepare.blockNumber}(${lastPrepare.blockHash})
- last saved block: ${lastSave.blockNumber}(${lastSave.blockHash})
`);
      });
  }

  emitter
    .addListener('prepareStart', ({ blockNumber }) => {
      workingPreparationCount++;
      logger.debug(`🛠️🚀 prepare start for block ${blockNumber}`);
    })
    .addListener('prepareEnd', ({ reorgVersion, preparedData, blockInfo }) => {
      const blockTemplate = `block ${blockInfo.blockNumber}(${blockInfo.blockHash})`;
      logger.debug(`🛠️🏁 prepare end for ${blockTemplate}`);

      const savePreparedData$ = defer(() =>
        prepareStore.set(blockInfo.blockNumber, blockInfo.blockHash, preparedData),
      ).pipe(timeout(10_000), retry());

      const waitForAvailableBuffer$ = defer(prepareStore.getSize).pipe(
        timeout(100),
        retry({ delay: 50 }),
        repeat(),
        // the purpose of the minus 1 is to deduct the current preparation worker
        first((preparedSize) => preparedSize + workingPreparationCount - 1 < preparationBufferSize),
      );

      const prepareNextBlock = () => {
        if (reorgLock.locked) {
          logger.info(`reorg process is running, stop saving the prepared data for ${blockTemplate}`);
          return;
        }
        if (reorgVersion !== reorgLock.version) {
          logger.info(`reorg log version unmatched, stop saving the prepare data for ${blockTemplate}`);
          return;
        }

        workingPreparationCount--;
        prepareNumber$.next(prepareNumber$.getValue() + 1);
      };

      savePreparedData$
        .pipe(
          mergeMap(() => waitForAvailableBuffer$),
          takeUntil(rollbackEvent$),
        )
        .subscribe(prepareNextBlock);
    })
    .addListener('saveStart', ({ blockInfo }) => {
      logger.debug(`💾🚀 save start for block ${blockInfo.blockNumber}(${blockInfo.blockHash})`);
    })
    .addListener('saveEnd', ({ blockInfo }) => {
      logger.debug(`💾🏁 save end for block ${blockInfo.blockNumber}(${blockInfo.blockHash})`);

      const confirmedBlockNumber = blockInfo.blockNumber - confirmation;
      if (confirmedBlockNumber >= 0) {
        logger.debug(`remove confirmed block ${confirmedBlockNumber} from the buffer`);
        void prepareStore.deleteByHeight(confirmedBlockNumber);
      }

      if (!reorgLock.locked) {
        saveNumber$.next(saveNumber$.getValue() + 1);
      }
    })
    .addListener('rollbackStart', ({ startBlockNumber, endBlockNumber }) => {
      logger.info(`🔄🚀 reorg blocks found, from ${startBlockNumber} to ${endBlockNumber}`);
      reorgLock.lock();
    })
    .addListener('rollbackEnd', ({ startBlockNumber }) => {
      logger.info(`🔄🏁 reorg end, restart from block ${startBlockNumber}`);

      void cleanPreparedData({ cleanUnconfirmed: true }).then(() => {
        // reset the preparation count
        workingPreparationCount = 0;

        reorgLock.unlock();

        kickstartPrepare(startBlockNumber);
        saveNumber$.next(startBlockNumber);
      });
    });

  const kickstartPrepare = (startBlockNumber: number) => {
    const preparationBlockNumbers = R.range(workingPreparationCount, preparationConcurrency);
    logger.info(`kickstart from the block ${startBlockNumber} to block ${R.last(preparationBlockNumbers)}`);
    if (workingPreparationCount < preparationConcurrency) {
      preparationBlockNumbers.forEach((_, i) => {
        prepareNumber$.next(startBlockNumber + i);
      });
    }
  };

  // TODO prefetch the block info to improve the synchronization performance
  //  instead of fetching while needing
  const getSourceBlockInfo = (blockNumber: number): Observable<BasicBlockInfo> =>
    defer(() => sourceInfo.getBlockInfosByHeights([blockNumber])).pipe(
      tapError(`fetch source block info failed`),
      retry(),
      repeat({ delay: scanNewBlockInterval }),
      map((list) => list?.[0]),
      first((info) => info != null),
    );

  const getPreparedData = (blockHash: Hash): Observable<Prepared> =>
    race(
      defer(() => prepareStore.getByHash(blockHash)).pipe(
        repeat({ delay: 100 }),
        first((res) => res != null),
      ),
      prepare$.pipe(
        first(({ blockInfo }) => blockInfo.blockHash === blockHash),
        map(({ preparedData: prepared }) => prepared),
      ),
    );

  const prepareBlock = (
    blockNumber: number,
  ): Observable<{ reorgVersion: number; blockInfo: BasicBlockInfo; preparedData: Prepared }> =>
    defer(() =>
      forkJoin({
        blockInfo: getSourceBlockInfo(blockNumber),
        reorgVersion: of(reorgLock.version),
      }),
    ).pipe(
      mergeMap(({ blockInfo, reorgVersion }) =>
        forkJoin({
          preparedData: defer(() => handler.prepare(blockInfo)).pipe(timeout(preparationTimeout)),
          blockInfo: of(blockInfo),
          reorgVersion: of(reorgVersion),
        }),
      ),
      tapError(`prepare failed for the block ${blockNumber}`),
      retry({ delay: 50 }),
    );

  // check and return the reorged blocks from the latest block to the reorged block
  const checkReorg = async (): Promise<BasicBlockInfo[]> => {
    const localBlocks = await localInfo.getLastNBlockInfos(confirmation);
    asserts(localBlocks.every(R.isNonNull));
    const latestHeights = localBlocks.map((info) => info.blockNumber);

    const sourceBlocks = await sourceInfo.getBlockInfosByHeights(latestHeights);
    asserts(sourceBlocks.every(R.isNonNull));

    const reorgBlocks = takeReorgBlocks(localBlocks, sourceBlocks);
    return reorgBlocks;
  };

  // clear the early confirmed prepareData to free the buffer size
  const cleanPreparedData = async ({ cleanUnconfirmed = false }: { cleanUnconfirmed?: boolean } = {}) => {
    const localBlockInfo = await localInfo.getLastBlockInfo();
    // clear the storage if no block saved yet
    if (!localBlockInfo) {
      logger.debug(`clear all data from the prepared data buffer since there is no block saved yet`);
      await prepareStore.clear();
      return;
    }

    const keys = await prepareStore.getKeys();
    const lastSavedBlockNumber = localBlockInfo.blockNumber;
    const confirmedBlockNumber = lastSavedBlockNumber - confirmation;
    const deleteKeys = keys.filter(
      ({ blockNumber }) =>
        blockNumber <= confirmedBlockNumber || (cleanUnconfirmed && blockNumber > lastSavedBlockNumber),
    );
    await Promise.all(deleteKeys.map((key) => prepareStore.delete(key.blockNumber, key.blockHash)));
    logger.info(
      `last saved block: ${localBlockInfo.blockNumber}, confirmed block: ${confirmedBlockNumber}, remove unused prepare data ${deleteKeys.map((item) => item.raw).join(',')}`,
    );
  };

  const rollback = (reorgedBlocks: [BasicBlockInfo, ...BasicBlockInfo[]]): Observable<number | null> => {
    emitter.emit('rollbackStart', {
      startBlockNumber: R.last(reorgedBlocks).blockNumber,
      endBlockNumber: R.first(reorgedBlocks).blockNumber,
    });

    return from(reorgedBlocks).pipe(
      concatMap((blockInfo) =>
        forkJoin({ blockInfo: of(blockInfo), preparedData: getPreparedData(blockInfo.blockHash) }),
      ),
      // rollback the block and return the block number
      concatMap(({ blockInfo, preparedData }) =>
        defer(() => handler.rollback(blockInfo, preparedData)).pipe(
          tapError(`rollback error block ${blockInfo.blockNumber}(${blockInfo.blockHash})`),
          map(() => blockInfo.blockNumber),
        ),
      ),
      retry({ delay: handlerRetryDelay }),
      last(),
      tap((startBlockNumber) => R.isNonNull(startBlockNumber) && emitter.emit('rollbackEnd', { startBlockNumber })),
    );
  };

  const saveBlock = (blockInfo: BasicBlockInfo): Observable<BasicBlockInfo> =>
    forkJoin({ blockInfo: of(blockInfo), preparedData: getPreparedData(blockInfo.blockHash) }).pipe(
      tap(({ blockInfo }) => emitter.emit('saveStart', { blockInfo })),
      concatMap(({ blockInfo, preparedData }) =>
        defer(() => handler.save(blockInfo, preparedData)).pipe(
          map(() => blockInfo),
          // TODO move the error handler outside of the saveBlock
          //  for more understanding
          tapError(`save error block ${blockInfo.blockNumber}(${blockInfo.blockHash})`),
          retry({ count: maxSaveRetry, delay: handlerRetryDelay }),
          catchError((error: Error) => {
            defer(() => localInfo.getLastBlockInfo()).subscribe((blockInfo) => {
              const nextBlockNumber = blockInfo ? blockInfo.blockNumber + 1 : 0;
              logger.error({
                err: error,
                msg: `❌ retry save more than ${maxSaveRetry} times, will try to start saving from block ${nextBlockNumber}`,
              });
              saveNumber$.next(nextBlockNumber);
            });
            return EMPTY;
          }),
        ),
      ),
      tap((blockInfo) => emitter.emit('saveEnd', { blockInfo })),
    );

  const prepare$ = prepareNumber$.pipe(
    // skip the first value emitted from BehaviorSubject
    skip(1),
    skipWhile(() => reorgLock.locked),
    tap((blockNumber) => emitter.emit('prepareStart', { blockNumber })),
    mergeMap((blockNumber) => prepareBlock(blockNumber).pipe(takeUntil(rollbackEvent$)), preparationConcurrency),
    delay(10),
    share(),
  );

  const prepareSubscription = prepare$.subscribe({
    next: ({ reorgVersion, blockInfo, preparedData }) => {
      emitter.emit('prepareEnd', { reorgVersion, blockInfo, preparedData });
    },
  });

  const saveSubscription = saveNumber$
    .pipe(
      // skip the first value emitted from BehaviorSubject
      skip(1),
      concatMap((blockNumber) =>
        defer(() => prepareStore.getBlockInfo(blockNumber)).pipe(
          tapError(`cannot get the blockInfo from the prepareStore for block ${blockNumber}`),
          timeout(100),
          retry(),
          repeat({ delay: 50 }),
          first((blockInfo) => blockInfo != null),
        ),
      ),
      concatMap((blockInfo) =>
        from(Promise.resolve(shouldStopSaveBlock(blockInfo))).pipe(
          tap((shouldStop) => {
            if (!shouldStop) return;
            logger.info(`shouldStopSaveBlock will stop the process on block ${blockInfo.blockNumber}`);
            stopProcess();
          }),
          mergeMap((shouldStop) => (shouldStop ? NEVER : of(blockInfo))),
        ),
      ),
      concatMap((blockInfo) =>
        blockInfo.blockNumber < validTargetBlockNumber
          ? saveBlock(blockInfo)
          : from(checkReorg()).pipe(
              concatMap((reorgedBlocks) =>
                R.hasAtLeast(reorgedBlocks, 1) ? rollback(reorgedBlocks) : saveBlock(blockInfo),
              ),
            ),
      ),
    )
    .subscribe({});

  // remove the unused prepare data at first since the {@link blockInfoCache} does not include the block hash of them
  // and save process cannot remove them
  void cleanPreparedData({ cleanUnconfirmed: true }).then(() => {
    kickstartPrepare(startBlockNumber);
    saveNumber$.next(startBlockNumber);
  });

  const stopProcess = (): void => {
    emitter.removeAllListeners();
    prepareSubscription.unsubscribe();
    saveSubscription.unsubscribe();
  };

  return { stop: stopProcess };
}

function noop(): void {
  // do nothing
}

const noopLogger: Logger = { debug: noop, error: noop, info: noop, warn: noop };
