export function asserts(condition: unknown, message = 'Assertion failed'): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

export function nonNullable<T>(obj: T, objName = ''): NonNullable<T> {
  asserts(obj != null, `${objName} is not nullable`);
  return obj;
}
