import { defer, firstValueFrom, type Observable, type ObservableInput, retry, shareReplay } from 'rxjs';

export function createCachedFetch<T>(
  factory: () => ObservableInput<T>,
  { cacheTime = 30 * 1000 }: { cacheTime?: number } = {},
) {
  let lastUpdate = 0;
  let lastValue$: Observable<T>;

  return () => {
    const now = Date.now();
    if (lastUpdate < now - cacheTime) {
      lastUpdate = now;
      lastValue$ = defer(factory).pipe(retry({ delay: 500 }), shareReplay(1));
    }

    return firstValueFrom(lastValue$);
  };
}
