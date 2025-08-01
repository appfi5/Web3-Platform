import { from, lastValueFrom, tap } from 'rxjs';

import { type Logger } from '~/aggregator/types';

import { type ResolvedBlock } from '../../types';

type TracerConfig = { traceKey: string; warningSlowThresholdMs?: number; logger: Logger };

export function createTracer({ traceKey, logger, warningSlowThresholdMs = 30 }: TracerConfig) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <Fn extends (ctx: any, ...args: unknown[]) => PromiseLike<unknown>>(fn: Fn) => {
    return (ctx: { resolvedBlock: ResolvedBlock }, ...args: unknown[]): ReturnType<Fn> => {
      const { resolvedBlock } = ctx;
      const blockInfo = { blockNumber: Number(resolvedBlock.header.number), blockHash: resolvedBlock.header.hash };
      const startTime = performance.now();

      const traced$ = from(fn(ctx, ...args)).pipe(
        tap({
          next: () => {
            const endTime = performance.now();
            if (endTime - startTime > warningSlowThresholdMs) {
              logger.warn(`${traceKey} at block ${blockInfo.blockNumber} usage: ${performance.now() - startTime}ms`);
            }
          },
          error: (error: Error) => {
            logger.error({
              error,
              msg: `${traceKey}: Error occurred in when processing block ${blockInfo.blockNumber}(${blockInfo.blockHash})`,
            });
          },
        }),
      );

      return lastValueFrom(traced$) as ReturnType<Fn>;
    };
  };
}
