'use client';
import { LoaderCircle } from 'lucide-react';
import { type ComponentProps, type PropsWithChildren } from 'react';

import { cn } from '~/lib/utils';
import { api } from '~/trpc/react';

const AddressOverviewItem: React.FC<PropsWithChildren<{ title: string; isLoading?: boolean }>> = ({
  children,
  title,
  isLoading = false,
}) => {
  return (
    <div
      className={cn(
        'md:flex md:flex-col flex-row gap-2 md:items-center items-baseline justify-center grid grid-cols-2',
        {
          ['items-center']: isLoading,
        },
      )}
    >
      <span className="text-sm text-muted-foreground">{title}</span>
      <span className="md:text-xl font-semibold text-base">
        {isLoading ? <LoaderCircle className="animate-spin" /> : children}
      </span>
    </div>
  );
};

export const AddressOverview = ({ address, className, ...props }: ComponentProps<'div'> & { address: string }) => {
  const { data, isLoading } = api.v0.address.metrics.useQuery({ address });

  return (
    <div className="grid md:grid-cols-4 md:gap-4 bg-muted py-4 md:px-3 rounded-lg px-2 grid-cols-1 gap-3">
      <AddressOverviewItem isLoading={isLoading} title="Total Received">
        ${data?.receivedUsd ? Number(data?.receivedUsd).toLocaleString(undefined, { minimumFractionDigits: 2 }) : 0}
      </AddressOverviewItem>
      <AddressOverviewItem isLoading={isLoading} title="Total Sent">
        ${data?.sentUsd ? Number(data?.sentUsd).toLocaleString(undefined, { minimumFractionDigits: 2 }) : 0}
      </AddressOverviewItem>
      <AddressOverviewItem isLoading={isLoading} title="Total Volume">
        ${data?.volume ? Number(data?.volume).toLocaleString(undefined, { minimumFractionDigits: 2 }) : 0}
      </AddressOverviewItem>
      <AddressOverviewItem isLoading={isLoading} title="Total Transaction">
        {data?.txCounts.toLocaleString() ?? 0}
      </AddressOverviewItem>
    </div>
  );
};
