import { defer, type Observable, type ObservableInput, of, retry, timer } from 'rxjs';

export type RetryDeferOptions = {
  count?: number;
  onError?: (error: unknown, retryCount: number) => void;
  delay?: number;
};

export function retryDefer<T>(factory: () => ObservableInput<T>, option?: RetryDeferOptions): Observable<T> {
  const { count, onError, delay } = option ?? {};
  return defer(factory).pipe(
    retry({
      count,
      delay: (error, retryCount) => {
        onError?.(error, retryCount);
        return delay ? timer(delay) : of(1);
      },
    }),
  );
}
