'use client';
import BigNumber from 'bignumber.js';
import dayjs from 'dayjs';
import { LoaderCircle } from 'lucide-react';
import Image from 'next/image';
import { type ComponentProps } from 'react';
import * as R from 'remeda';

import { AccountValueChart } from '~/components/Address/AccountValueChart';
import { cn } from '~/lib/utils';
import { api } from '~/trpc/react';

import EmptySvg from './empty.svg';
import { getAssetNetwork, NetworkIcon } from './utils';

export const AddressValueCard = ({ address, className, ...props }: ComponentProps<'div'> & { address: string }) => {
  const { data: assets = [] } = api.v0.address.assets.useQuery({ address });
  const { data, isLoading, error } = api.v0.address.dailyUsdSnapshot.useQuery({ address, recentDays: 3 });
  const historyMap = data
    ? data.reduce(
        (acc: Record<string, BigNumber>, cur) => {
          const currentCur = acc[cur.date];
          if (currentCur) {
            return {
              ...acc,
              [cur.date]: currentCur.plus(new BigNumber(cur.amountUsd)),
            };
          }
          return {
            ...acc,
            [cur.date]: new BigNumber(cur.amountUsd),
          };
        },
        {} as Record<string, BigNumber>,
      )
    : {};

  const chartData = Object.entries(historyMap)
    .map(([date, value]) => ({ date: dayjs(date).format('MM-DD'), value: value.toNumber() }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const totalValueByChain = R.pipe(
    assets,
    R.groupBy((i) => getAssetNetwork(i.assetInfo)),
    R.entries(),
    R.map(
      ([network, assets]) =>
        [network, assets.reduce((acc, cur) => acc.plus(cur.amountUsd ?? 0), BigNumber(0))] as const,
    ),
  );

  const renderChart = () => {
    if (isLoading) {
      return (
        <div className="w-full h-full flex items-center justify-center min-h-[136px]">
          <LoaderCircle className="animate-spin" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center min-h-[136px]">
          <EmptySvg className="w-24" />
          <p>{error.message}</p>
        </div>
      );
    }

    return <AccountValueChart chartData={chartData} className="h-24 w-full py-1" />;
  };

  return (
    <div className={cn('flex-1 flex flex-col gap-4 md:p-3 rounded-lg bg-muted min-w-64 p-2', className)} {...props}>
      <div className="flex gap-2">
        {totalValueByChain.map(([network, totalValue]) => (
          <div className="flex p-2 rounded-md gap-1 bg-[#23272C]" key={network}>
            <Image alt="icon" className="rounded-full" height={24} src={NetworkIcon[network]} width={24} />${' '}
            {totalValue.toFormat(2, BigNumber.ROUND_FLOOR)}
          </div>
        ))}
      </div>

      {renderChart()}
    </div>
  );
};
