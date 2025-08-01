import { takeUntil, timer } from 'rxjs';

import { immediatelyInterval } from './immediatelyInterval';

test('immediatelyInterval', (done) => {
  const subscription = jest.fn();

  immediatelyInterval(50)
    .pipe(takeUntil(timer(80)))
    .subscribe({
      next: subscription,
      complete: () => {
        expect(subscription).toHaveBeenCalledTimes(2);

        expect(subscription).toHaveBeenCalledWith(0);
        expect(subscription).toHaveBeenCalledWith(1);

        done();
      },
    });
});
