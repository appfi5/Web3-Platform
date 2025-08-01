import { sleep } from '~/utils/promise/sleep';

import { createCachedFetch } from './createCachedFetcher';

test('createCachedFetch', async () => {
  const factory = jest.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(2).mockResolvedValueOnce(3);
  const fetch = createCachedFetch(factory, { cacheTime: 20 });

  await expect(fetch()).resolves.toBe(1);
  expect(factory).toHaveBeenCalledTimes(1);
  await expect(fetch()).resolves.toBe(1);
  expect(factory).toHaveBeenCalledTimes(1);

  await sleep(30);
  await expect(fetch()).resolves.toBe(2);
  expect(factory).toHaveBeenCalledTimes(2);
});
