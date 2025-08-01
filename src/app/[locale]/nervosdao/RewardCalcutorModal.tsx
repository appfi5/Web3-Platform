'use client';

import BigNumber from 'bignumber.js';
import { type FC, type PropsWithChildren, useMemo, useState } from 'react';

import { Alert, AlertDescription } from '~/components/ui/alert';
import { Button } from '~/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { localeNumberString } from '~/utils/utility';

import { RewardLineChart } from './RewardLineChart';

const INIT_DEPOSIT_VALUE = '1000';
const MAX_DECIMAL_DIGITS = 8;
const MIN_DEPOSIT_AMOUNT = 102;

const NERVOS_DAO_RFC_URL =
  'https://www.github.com/nervosnetwork/rfcs/blob/master/rfcs/0023-dao-deposit-withdraw/0023-dao-deposit-withdraw.md';

export const RewardCalcutorModal: FC<PropsWithChildren<{ estimatedApc?: string }>> = ({
  estimatedApc = '0',
  children,
}) => {
  const [depositValue, setDepositValue] = useState<string>(INIT_DEPOSIT_VALUE);
  const [years, setYears] = useState<number>(5);

  const yearReward = useMemo(() => {
    const EMPTY = BigNumber(0);
    if (!estimatedApc) return EMPTY;
    if (!depositValue) return EMPTY;
    const v = BigNumber(depositValue);

    if (v.isNaN() || v.isNegative()) return EMPTY;

    const amount = v.minus(MIN_DEPOSIT_AMOUNT);
    if (amount.isNegative()) return EMPTY;

    const yearReward = amount.multipliedBy(estimatedApc).dividedBy(100);
    return yearReward;
  }, [depositValue, estimatedApc]);

  const monthReward = yearReward.dividedBy(12);

  const handleDepositChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    e.preventDefault();
    const { value } = e.currentTarget;
    const v = value.replace(/,/g, '');
    if (!v) {
      setDepositValue('');
      return;
    }
    setDepositValue(v);
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    e.preventDefault();
    const y = +e.currentTarget.value;
    if (y < 1) {
      setYears(1);
      return;
    }
    if (y > 200) {
      setYears(200);
      return;
    }
    setYears(y);
  };

  const chartData = Array.from({ length: years }, (_, i) =>
    BigNumber(depositValue)
      .multipliedBy(BigNumber(1 + +estimatedApc / 100).exponentiatedBy(i + 1))
      .minus(depositValue)
      .toFixed(2, BigNumber.ROUND_DOWN),
  );

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-[800px] lg:max-w-screen-lg overflow-y-scroll max-h-screen">
        <DialogHeader>
          <DialogTitle>Nervos DAO Compensation Calculator</DialogTitle>
        </DialogHeader>

        <div className="">
          Nervos DAO (generally)requires 102 CKB for hosting cell itself, and this portion of CKB won&apos;t be
          compensated. Please refer to the{' '}
          <a className="text-primary" href={NERVOS_DAO_RFC_URL} rel="noreferrer" target="_blank">
            Nervos DAO RFC
          </a>{' '}
          for more information on Nervos DAO.
        </div>

        <div className="space-y-2">
          <div className="space-y-1">
            <Label>Deposit Amount</Label>
            <div className="relative flex items-center">
              <Input
                onChange={handleDepositChange}
                value={
                  depositValue.endsWith('.')
                    ? `${localeNumberString(depositValue.slice(0, -1))}.`
                    : localeNumberString(depositValue)
                }
              />
              <span className="absolute right-2 text-muted-foreground">CKB</span>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Estimated Compensation</Label>

            <p>Deposit 30 days:</p>
            <div className="relative flex items-center">
              <Input disabled value={localeNumberString(monthReward.toFixed(MAX_DECIMAL_DIGITS))} />
              <span className="absolute right-2 text-muted-foreground">CKB</span>
            </div>

            <p>Deposit 360 days:</p>
            <div className="relative flex items-center">
              <Input disabled value={localeNumberString(yearReward.toFixed(MAX_DECIMAL_DIGITS))} />
              <span className="absolute right-2 text-muted-foreground">CKB</span>
            </div>
          </div>

          <Alert variant="primary">
            <AlertDescription>
              30 days work as a circle, if you didn’t make withdrawal request, the compensation will be calculated in
              compound way.
            </AlertDescription>
          </Alert>

          <div className="space-y-1">
            <Label>Estimated Annual Percentage Compensation(APC)</Label>
            <Input disabled value={`${estimatedApc}%`} />
          </div>

          <div className="flex items-center gap-1">
            Deposit
            <Input className="w-auto" max="200" min="1" onChange={handleYearChange} type="number" value={years} />
            Years
          </div>
        </div>

        <div className="h-[280px] overflow-hidden">
          <RewardLineChart chartData={chartData} />
        </div>

        <DialogClose asChild>
          <Button className="w-full" type="button">
            Done
          </Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
};
