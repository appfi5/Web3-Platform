import pino from 'pino';
import pretty from 'pino-pretty';
import { defer, first, forkJoin, from, lastValueFrom, map, mergeMap, of, repeat, retry } from 'rxjs';

import { type CkbSourceService, type ResolvedBlock } from '~/aggregator/ckb/types';
import { type SubHandler } from '~/aggregator/core';
import { combineSubHandlers as combineHandlers } from '~/aggregator/core';
import { type MarketService } from '~/aggregator/services/types';
import { type DbTransaction, type Logger, type SequenceBlockHandler } from '~/aggregator/types';
import { db } from '~/server/db';

import { createTracer } from './extensions';

export type BasicCtx = { resolvedBlock: ResolvedBlock; logger: Logger; marketService: MarketService };
type TransactionalCtx = { tx: DbTransaction };

export type CkbSubHandler<T> = SubHandler<BasicCtx, BasicCtx & TransactionalCtx, BasicCtx & TransactionalCtx, T>;

// TODO use container API to inject logger
const logger = pino(pretty({ colorize: true }));

export function createCkbSubHandler<T>(handler: CkbSubHandler<T>): typeof handler {
  const tracePrepare = createTracer({ traceKey: handler.name + '.prepare', logger, warningSlowThresholdMs: 50 });
  const prepare = handler.prepare == null ? undefined : tracePrepare(handler.prepare.bind(handler));

  const traceSave = createTracer({ traceKey: handler.name + '.save', logger });
  const save = handler.save == null ? undefined : traceSave(handler.save.bind(handler));

  const traceRollback = createTracer({ traceKey: handler.name + '.rollback', logger });
  const rollback = handler.rollback == null ? undefined : traceRollback(handler.rollback.bind(handler));

  return { ...handler, prepare, save, rollback };
}

type PreparedMap = Record<string, unknown> & {
  resolvedBlock: ResolvedBlock;
};

/**
 * combine multiple `SubHandler`s into one `SequenceBlockHandler`
 * the execution of the combined result is:
 * - `handlers.prepare` executed concurrently
 * - `handlers.save` executed one by one in forward order
 * - `handlers.rollback` executed on by one in reverse order
 * @param subHandlers
 * @param sourceService {@link CkbSourceService}
 * @param resolveBlockInterval interval of re-fetch block if it is empty
 */
export function combineSubHandlers(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  subHandlers: Array<CkbSubHandler<any>>,
  {
    sourceService,
    marketService,
    logger,
    resolveBlockInterval = 1000,
  }: { sourceService: CkbSourceService; logger: Logger; marketService: MarketService; resolveBlockInterval?: number },
): SequenceBlockHandler<PreparedMap> {
  const handler = combineHandlers(subHandlers);

  const getResolvedBlock = (hash: string) =>
    defer(() => sourceService.getResolvedBlock(hash)).pipe(
      repeat({ delay: resolveBlockInterval }),
      retry({ delay: resolveBlockInterval }),
      first((res) => res != null),
    );

  return {
    prepare: (blockInfo) =>
      getResolvedBlock(blockInfo.blockHash).pipe(
        mergeMap((resolvedBlock) =>
          forkJoin({
            preparedData: handler.prepare({ resolvedBlock, logger, marketService }),
            resolvedBlock: of(resolvedBlock),
          }),
        ),
        map(({ preparedData, resolvedBlock }) => ({ ...preparedData, resolvedBlock })),
      ),
    save: (blockInfo, preparedData) =>
      db.transaction(async (tx) => {
        const save$ = handler.save({
          logger,
          preparedData,
          marketService,
          tx,
          resolvedBlock: preparedData.resolvedBlock,
        });
        await lastValueFrom(from(save$));
      }),
    rollback: (blockInfo, preparedData) =>
      db.transaction(async (tx) => {
        const rollback$ = handler.rollback({
          logger,
          preparedData,
          marketService,
          tx,
          resolvedBlock: preparedData.resolvedBlock,
        });
        await lastValueFrom(from(rollback$));
      }),
  };
}
