'use client';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { LoaderCircle } from 'lucide-react';
import { type ComponentProps, useState } from 'react';

import Pagination from '~/components/ui/pagination';
import { cn } from '~/lib/utils';
import { api } from '~/trpc/react';

import EmptySvg from './empty.svg';

dayjs.extend(relativeTime);

export const NervosDaoTransactions = ({ className, ...props }: ComponentProps<'div'>) => {
  const [query, setQuery] = useState<
    Partial<{
      address: string;
      page: number;
      pageSize: number;
    }>
  >({
    page: 1,
    pageSize: 10,
  });

  const {
    data: res,
    isLoading,
    error,
  } = api.explorer.nervosDaoTx.useQuery({
    ...query,
  });

  const transactions = res?.data?.data;

  const currentPage = query.page ?? 1;
  const totalPage = res?.data?.meta?.total ?? 1 / (res?.data?.meta?.page_size ?? 1);

  const renderList = () => {
    if (isLoading) {
      return (
        <div className={cn('rounded-lg bg-muted p-3 flex flex-col gap-4', className)} {...props}>
          <div className="flex items-center justify-center w-full h-64">
            <LoaderCircle className="animate-spin" />
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className={cn('rounded-lg bg-muted p-3 flex flex-col gap-4', className)} {...props}>
          <div className="flex flex-col items-center justify-center w-full h-64 text-center">
            <EmptySvg className="w-24" />
            <p>{error.message}</p>
          </div>
        </div>
      );
    }

    if (transactions === undefined || transactions?.length === 0) {
      return (
        <div className={cn('rounded-lg bg-muted p-3 flex flex-col gap-4', className)} {...props}>
          <div className="flex flex-col items-center justify-center w-full h-64">
            <EmptySvg className="w-24" />
            <p>No Data</p>
          </div>
        </div>
      );
    }

    return (
      <>
        <div className="flex flex-col gap-4 overflow-hidden">
          {transactions.map((tx) => (
            <div
              className="flex justify-between bg-[#1C2024] rounded-sm py-3 px-2 flex-wrap max-w-full gap-4"
              key={tx.attributes?.transaction_hash}
            >
              {tx.attributes?.transaction_hash}
            </div>
          ))}
        </div>
        <div className="w-full flex justify-center mt-4">
          <Pagination
            current={currentPage}
            onChangePage={(page) => setQuery((pre) => ({ ...pre, page }))}
            total={totalPage}
          />
        </div>
      </>
    );
  };

  return (
    <div className={cn('rounded-lg bg-muted p-3 flex flex-col gap-4', className)} {...props}>
      <div className="flex text-muted-foreground flex-wrap gap-4">
        <div className="flex flex-wrap gap-4 max-md:w-full max-md:justify-between">
          <div className="flex gap-2 items-center">
            <span>Transaction hash</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 ml-auto max-md:w-full max-md:justify-between">Time</div>
        <div className="flex gap-2 items-center">
          <span>Address</span>
        </div>

        <div className="flex gap-2 items-center">
          <span>Action</span>
        </div>

        <div className="flex gap-2 items-center">
          <span>Amount</span>
        </div>
      </div>

      {renderList()}
    </div>
  );
};
