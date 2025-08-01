import pino from 'pino';
import pretty from 'pino-pretty';
import { defer, first, forkJoin, from, lastValueFrom, map, mergeMap, of, repeat, retry } from 'rxjs';

import { createTracer } from '~/aggregator/btc/handlers/extensions';
import { type BTCSourceService, type ResolvedBlock } from '~/aggregator/btc/types';
import { type SubHandler } from '~/aggregator/core';
import { combineSubHandlers as combineHandlers } from '~/aggregator/core';
import { type MarketService } from '~/aggregator/services/types';
import { type DbTransaction, type Logger, type SequenceBlockHandler } from '~/aggregator/types';
import { db } from '~/server/db';

type BasicCtx = { resolvedBlock: ResolvedBlock; logger: Logger; marketService: MarketService };
type TransactionalCtx = { tx: DbTransaction };

export type BTCSubHandler<T> = SubHandler<BasicCtx, BasicCtx & TransactionalCtx, BasicCtx & TransactionalCtx, T>;
// TODO use container API to inject logger
const logger = pino(pretty({ colorize: true }));

export function createBTCSubHandler<T>(handler: BTCSubHandler<T>): typeof handler {
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
 * @param handlers
 * @param sourceService {@link BTCSourceService}
 * @param resolveBlockInterval interval of re-fetch block if it is empty
 */
export function combineSubHandlers(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handlers: Array<BTCSubHandler<any>>,
  {
    sourceService,
    marketService,
    resolveBlockInterval = 1000,
    logger,
  }: { sourceService: BTCSourceService; marketService: MarketService; logger: Logger; resolveBlockInterval?: number },
): SequenceBlockHandler<PreparedMap> {
  const handler = combineHandlers(handlers);

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
          tx,
          resolvedBlock: preparedData.resolvedBlock,
          marketService,
        });
        await lastValueFrom(from(save$));
      }),
    rollback: (blockInfo, preparedData) =>
      db.transaction(async (tx) => {
        const rollback$ = handler.rollback({
          logger,
          preparedData,
          tx,
          resolvedBlock: preparedData.resolvedBlock,
          marketService,
        });
        await lastValueFrom(from(rollback$));
      }),
  };
}
