/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { LRUCache } from 'lru-cache';

type AnyFn = (...args: any[]) => any;
type Memoized<T extends AnyFn> = T & { delete: (...args: Parameters<T>) => void };

type Options = {
  hash?: (...args: unknown[]) => string;
  maxCacheSize?: number;
  keepRejectedPromise?: boolean;
};

const defaultHash = (...args: unknown[]) => JSON.stringify(args);

/**
 * @deprecated please migrate to {@link decorate}
 * @param fn
 * @param param1
 * @returns
 */
export function memoizeAsync<F extends AnyFn>(fn: F, options?: Options): Memoized<F> {
  return decorate(fn, options);
}

export function decorate<F extends AnyFn>(
  fn: F,
  { hash = defaultHash, maxCacheSize = 500, keepRejectedPromise = false }: Options = {},
): Memoized<F> {
  const map = new LRUCache<string, ReturnType<F>>({ max: maxCacheSize });

  const memoized: Memoized<F> = ((...args: Parameters<F>) => {
    const key = hash(...args);

    const cachedValue = map.get(key);
    if (cachedValue != null) {
      return cachedValue;
    }

    const value = fn(...args);
    map.set(key, value);

    if (typeof value === 'object' && value != null && 'then' in value && !keepRejectedPromise) {
      Promise.resolve(value).then(
        () => undefined,
        () => map.delete(key),
      );
    }

    return value;
  }) as Memoized<F>;

  Object.defineProperty(memoized, 'name', { value: `memoized_${fn.name}`, writable: false });
  Object.defineProperty(memoized, 'delete', {
    value: (...args: Parameters<F>) => {
      const key = hash(...args);
      map.delete(key);
    },
    writable: false,
  });

  return memoized;
}
