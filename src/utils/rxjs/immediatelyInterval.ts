import { interval, map, merge, of } from 'rxjs';

export function immediatelyInterval(period: number) {
  return merge(of(0), interval(period).pipe(map((value) => value + 1)));
}
