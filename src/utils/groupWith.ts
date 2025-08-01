export function groupWith<T, R>(
  list: T[],
  getKey: (item: T) => string,
  getValue: (result: R, item: T) => R,
  initialValue: R,
): Record<string, R> {
  return list.reduce(
    (result, item) => {
      const key = getKey(item);
      const value = getValue(key in result ? result[key]! : initialValue, item);

      return Object.assign(result, { [key]: value });
    },
    {} as Record<string, R>,
  );
}
