import { flow } from './flow';

test('utils/flow', () => {
  expect(flow([])).toEqual([]);

  const fn1 = jest.fn((_data: unknown) => 'fn1');
  const fn2 = jest.fn((_data: unknown) => 'fn2');

  const result = flow([1, 2, 3, 4], fn1, fn2);

  expect(fn1).toHaveBeenCalledWith([1, 2, 3, 4]);
  expect(fn2).toHaveBeenCalledWith('fn1');
  expect(result).toEqual('fn2');
});
