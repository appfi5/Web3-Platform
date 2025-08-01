import { timer } from 'rxjs';

export function delayExponent(baseMs: number, exponent = 2) {
  return (_error: unknown, retryCount: number) => {
    return timer(baseMs * Math.pow(exponent, retryCount));
  };
}
