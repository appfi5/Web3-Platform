'use client';
import { LoaderCircle } from 'lucide-react';

import { TransactionCountChart } from '~/components/Address/TransactionCountChart';
import { api } from '~/trpc/react';

import EmptySvg from './empty.svg';

export const TransactionCountCard = () => {
  const { data = [], isLoading } = api.account.historyTransactionCount.useQuery({});
  const totalCount = data.reduce((acc, cur) => (acc += cur.count), 0);

  if (isLoading)
    return (
      <div className="w-full min-h-64 bg-muted flex items-center justify-center">
        <LoaderCircle className="animate-spin" />
      </div>
    );

  if (totalCount === 0) {
    return (
      <div className="w-full min-h-64 bg-muted flex flex-col items-center justify-center">
        <EmptySvg className="w-24" />
        <p>No Data</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-scroll w-full">
      <TransactionCountChart chartData={data} />
    </div>
  );
};
