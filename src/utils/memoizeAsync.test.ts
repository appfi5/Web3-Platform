import { decorate } from './memoizeAsync';

test('decorate should memoize async function', async () => {
  const fn = jest.fn().mockImplementation(async (x: unknown) => x);
  const memoized = decorate(fn);

  await expect(Promise.all([memoized(1), memoized(1)])).resolves.toEqual([1, 1]);
  expect(fn).toHaveBeenCalledTimes(1);
  memoized.delete(1);
  await memoized(1);
  expect(fn).toHaveBeenCalledTimes(2);
});

test('decorate should delete cache when the cache size is exceeded', async () => {
  const fn = jest.fn().mockImplementation(async (x: unknown) => x);
  const memoized = decorate(fn, { maxCacheSize: 1 });

  await expect(memoized({ param: 1 })).resolves.toEqual({ param: 1 });
  await expect(memoized({ param: 2 })).resolves.toEqual({ param: 2 });
  expect(fn).toHaveBeenCalledTimes(2);
  await expect(memoized({ param: 1 })).resolves.toEqual({ param: 1 });
  expect(fn).toHaveBeenCalledTimes(3);
});

test('should delete cache when the promise is rejected', async () => {
  const fn = jest.fn().mockImplementation(async (x: unknown) => {
    throw new Error('test');
  });
  const memoized = decorate(fn);

  await expect(memoized(1)).rejects.toThrow('test');
  expect(fn).toHaveBeenCalledTimes(1);
  await expect(memoized(1)).rejects.toThrow('test');
  expect(fn).toHaveBeenCalledTimes(2);
});
