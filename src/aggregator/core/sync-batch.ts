import {
  BehaviorSubject,
  catchError,
  combineLatest,
  concatMap,
  defer,
  delay,
  EMPTY,
  filter,
  first,
  from,
  interval,
  map,
  mergeMap,
  type Observable,
  of,
  retry,
  share,
  skip,
  tap,
  throttle,
  throwError,
  timeout,
  timer,
} from 'rxjs';

import { noopLogger } from '../internal';
import { type Logger } from '../types';

type BatchBlock<PreparedData> = { blockNumber: number; preparedData: PreparedData };
export type BatchBlocks<PreparedData> = [BatchBlock<PreparedData>, ...BatchBlock<PreparedData>[]];
export type BatchHandler<PreparedData> = {
  prepare: (payload: { blockNumber: number }) => Promise<PreparedData>;
  save: (payload: BatchBlocks<PreparedData>) => Promise<void>;
};

export function startBatchSync<PreparedData>({
  startBlockNumber,
  endBlockNumber,

  handler,

  handlerRetryDelay = 1000,
  preparationConcurrency = 5,
  preparationBufferSize = 1000,
  preparationTimeout = 20000,

  saveDelay = 3000,
  maxSaveRetry = 3,
  logStateInterval = 1000,

  getLastSavedBlockNumber,
  logger = noopLogger,
}: {
  handler: BatchHandler<PreparedData>;
  startBlockNumber: number;
  endBlockNumber: number;

  handlerRetryDelay?: number;

  preparationConcurrency?: number;
  preparationBufferSize?: number;
  preparationTimeout?: number;
  saveDelay?: number;
  maxSaveRetry?: number;
  logStateInterval?: number;

  /**
   * This callback will be called when too many retries occured
   * to determine the next block number to start from.
   * @returns
   */
  getLastSavedBlockNumber?: () => Promise<number>;
  logger?: Logger;
}) {
  const prepareBlockNumber$ = new BehaviorSubject<number>(-1);
  const saveBlockNumber$ = new BehaviorSubject<number>(-1);

  const buffer = new Map<number, PreparedData>();

  const logError = ({ err, header }: { err: unknown; header?: string }) => {
    logger.error({ err, msg: `❌ ${header ?? ''}` });
  };

  const tapError = <T>(header?: string) =>
    tap<T>({
      error: (error: Error) => {
        logError({ err: error, header });
      },
    });

  const prepareBlock = ({ blockNumber }: { blockNumber: number }) =>
    defer(() => handler.prepare({ blockNumber })).pipe(
      timeout(preparationTimeout),
      tapError(`error occurred when preparing block ${blockNumber}`),
      retry({ delay: handlerRetryDelay }),
      map((preparedData) => ({ blockNumber, preparedData })),
    );

  const prepare$ = prepareBlockNumber$.pipe(
    // skip the first emit from BehaviorSubject
    skip(1),
    filter((blockNumber) => blockNumber <= endBlockNumber),
    tap((blockNumber) => logger.debug(`🛠️🚀 prepare start for block ${blockNumber}`)),
    mergeMap((blockNumber) => prepareBlock({ blockNumber }), preparationConcurrency),
    tap(({ blockNumber }) => logger.debug(`🛠️🏁 prepare end for block ${blockNumber}`)),
    share(),
  );

  function prepareNextBlock() {
    prepareBlockNumber$.next(prepareBlockNumber$.getValue() + 1);
  }

  const prepareSubscription = prepare$.subscribe(({ blockNumber, preparedData }) => {
    buffer.set(blockNumber, preparedData);

    if (buffer.size + preparationConcurrency < preparationBufferSize) {
      prepareNextBlock();
      return;
    }

    timer(0, 50)
      .pipe(first(() => buffer.size + preparationConcurrency < preparationBufferSize))
      .subscribe(prepareNextBlock);
  });

  const batchSaveBlocks = (payload: BatchBlocks<PreparedData>) =>
    defer(() => handler.save(payload)).pipe(
      map(() => payload),
      timeout(preparationTimeout),
      retry({
        delay: (error: Error, count) => {
          logError({
            err: error,
            header: `save retry ${count} for blocks ${payload[0]?.blockNumber} to ${payload[payload.length - 1]?.blockNumber}`,
          });
          if (count >= maxSaveRetry) {
            return throwError(() => error);
          }

          return timer(handlerRetryDelay);
        },
      }),
      catchError(() => {
        logger.error(
          `Too many retries occured when saving blocks ${payload[0]?.blockNumber} to ${payload[payload.length - 1]?.blockNumber}`,
        );
        from(getLastSavedBlockNumber ? getLastSavedBlockNumber() : of(saveBlockNumber$.getValue() - 1)).subscribe(
          (lastSavedBlockNumber) => {
            saveBlockNumber$.next(lastSavedBlockNumber);
          },
        );

        return EMPTY;
      }),
    );

  function getPreparedData(leftBlockNumber: number): Observable<BatchBlocks<PreparedData>> {
    const result: { blockNumber: number; preparedData: PreparedData }[] = [];

    let currentBlockNumber = leftBlockNumber;
    while (buffer.has(currentBlockNumber)) {
      result.push({ blockNumber: currentBlockNumber, preparedData: buffer.get(currentBlockNumber)! });
      currentBlockNumber++;
    }

    if (result.length > 0) {
      return of(result as BatchBlocks<PreparedData>);
    }

    return prepare$.pipe(
      first(({ blockNumber }) => blockNumber === leftBlockNumber),
      mergeMap(() => getPreparedData(currentBlockNumber)),
    );
  }

  const save$ = saveBlockNumber$.pipe(
    // skip the first emit from BehaviorSubject
    skip(1),
    filter((blockNumber) => blockNumber <= endBlockNumber),
    delay(saveDelay),
    concatMap(getPreparedData),
    tap((blocks) =>
      logger.debug(`💾🚀 save start for blocks ${blocks[0].blockNumber} to ${blocks[blocks.length - 1]!.blockNumber}`),
    ),
    concatMap(batchSaveBlocks),
    tap((blocks) =>
      logger.debug(`💾🏁 save end for blocks ${blocks[0].blockNumber} to ${blocks[blocks.length - 1]!.blockNumber}`),
    ),
    share(),
  );

  const saveSubscription = save$.subscribe((blocks) => {
    blocks.forEach(({ blockNumber }) => buffer.delete(blockNumber));

    const nextSaveBlockNumber = saveBlockNumber$.getValue() + blocks.length;
    if (nextSaveBlockNumber <= endBlockNumber) {
      saveBlockNumber$.next(nextSaveBlockNumber);
    } else {
      stopSync();
    }
  });

  combineLatest([save$, prepare$])
    .pipe(throttle(() => interval(logStateInterval)))
    .subscribe(([lastSave, lastPrepare]) => {
      logger.info(
        `last save: ${lastSave[lastSave.length - 1]?.blockNumber}, last prepare: ${lastPrepare.blockNumber}, buffer size: ${buffer.size}/${preparationBufferSize}`,
      );
    });

  function stopSync() {
    prepareBlockNumber$.complete();
    saveBlockNumber$.complete();
    prepareSubscription.unsubscribe();
    saveSubscription.unsubscribe();
  }

  if (startBlockNumber > endBlockNumber) {
    logger.debug(
      `Stop soon because startBlockNumber ${startBlockNumber} is greater than endBlockNumber ${endBlockNumber}`,
    );
    stopSync();
  } else {
    // kick off prepare and save
    Array.from({ length: preparationConcurrency }).forEach((_, i) => prepareBlockNumber$.next(startBlockNumber + i));
    saveBlockNumber$.next(startBlockNumber);
  }

  return {
    stop: stopSync,
    onStop: (cb: () => void): void => void saveBlockNumber$.subscribe({ complete: cb }),
  };
}
