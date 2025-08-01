import { type Logger } from './types';

export function noop(): void {
  // do nothing
}

export const noopLogger: Logger = { debug: noop, info: noop, warn: noop, error: noop };

export function createSpanTracer({
  name = 'Avg usage',
  reportInterval = 1000,
  logger = console,

  warnThreshold,
}: { reportInterval?: number; name?: string; logger?: Logger; warnThreshold?: number } = {}) {
  let timespans: number[] = [];

  setInterval(() => {
    if (timespans.length === 0) {
      return;
    }
    const { sum, min, max } = timespans.reduce(
      (acc, curr) => {
        acc.sum += curr;
        acc.min = Math.min(acc.min, curr);
        acc.max = Math.max(acc.max, curr);
        return acc;
      },
      { sum: 0, min: Infinity, max: 0 },
    );

    logger.info('[TRACE]', name, { avg: sum / timespans.length, min, max, count: timespans.length });

    timespans = [];
  }, reportInterval);

  return {
    tracePromise: async <T>(promise: Promise<T>): Promise<T> => {
      const start = performance.now();
      const res = await promise;
      const end = performance.now();
      timespans.push(end - start);
      return res;
    },

    traceAsync: async <T>(cb: () => Promise<T>): Promise<T> => {
      const start = performance.now();
      const res = await cb();
      const end = performance.now();
      timespans.push(end - start);
      return res;
    },
  };
}
