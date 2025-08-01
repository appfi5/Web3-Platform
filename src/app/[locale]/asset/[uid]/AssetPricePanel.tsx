'use client';
import { type ComponentProps } from 'react';

import { cn } from '~/lib/utils';

import PriceChart from '../../home/components/PriceChart';

export const AssetPricePanel = ({
  uid,
  className,
  ...props
}: ComponentProps<'div'> & { uid: string; recentDays?: number }) => {
  return (
    <div className={cn('flex-1 flex flex-col gap-4 p-3 rounded-lg bg-muted min-w-80', className)} {...props}>
      <PriceChart assetId={uid} className="w-full py-1 h-[136px]" />
    </div>
  );
};
