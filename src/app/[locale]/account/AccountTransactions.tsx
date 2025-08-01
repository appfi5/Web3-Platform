'use client';
import BigNumber from 'bignumber.js';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { LoaderCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { type ComponentProps, useState } from 'react';

import { SortSwitcher } from '~/components/SortSwitcher';
import Pagination from '~/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { cn } from '~/lib/utils';
import { api, type RouterInputs } from '~/trpc/react';
import { isValidBTCAddress } from '~/utils/bitcoin';
import { formatWithDecimal } from '~/utils/utility';

import { NetworkIcon } from '../address/[address]/utils';
import EmptySvg from './empty.svg';

dayjs.extend(relativeTime);

export const AccountTransactions = ({ className, ...props }: ComponentProps<'div'>) => {
  const [query, setQuery] = useState<
    Partial<{
      chain: 'CKB' | 'BTC';
      asset: string;
      orderKey: RouterInputs['account']['transactions']['orderKey'];
      order: RouterInputs['account']['transactions']['order'];
      page: number;
      pageSize: number;
    }>
  >({});
  const {
    data: transactions = {
      data: [],
      pagination: {
        page: 1,
        pageSize: 10,
        rowCount: 1,
      },
    },
    isLoading,
    error,
  } = api.account.transactions.useQuery({
    ...query,
  });
  const { data: relatedAssets = [] } = api.account.getAssets.useQuery();

  const pageCount = Math.ceil((transactions.pagination.rowCount ?? 0) / transactions.pagination.pageSize);

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

    if (transactions.pagination.rowCount === 0) {
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
        <div className="flex flex-col gap-4">
          {transactions.data.map((tx) => (
            <div
              className="flex justify-between bg-[#1C2024] rounded-sm py-3 px-2 flex-wrap max-w-full gap-4"
              key={tx.txHash}
            >
              <div className="flex gap-8 max-md:w-full flex-wrap">
                <div className="flex items-center gap-2 max-md:mr-auto">
                  <Image
                    alt="nervos dao icon"
                    className="rounded-full"
                    height={16}
                    src={NetworkIcon[tx.network] ?? NetworkIcon.CKB}
                    width={16}
                  />
                  <span>{tx.network} Chain</span>
                </div>
                <div className="flex gap-4">
                  {tx.fromAddresses.length !== 0 && (
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-muted-foreground">From</span>
                      <div className="flex items-center justify-end -space-x-2 relative">
                        {tx.fromAddresses.slice(0, 3).map((address, index) => (
                          <Link href={`/address/${address}`} key={index}>
                            <Image
                              alt="ckb icon"
                              className={cn('rounded-full border border-[#23272C]')}
                              height={20}
                              src={isValidBTCAddress(address) ? '/img/btc.png' : '/img/nervos.png'}
                              width={20}
                            />
                          </Link>
                        ))}
                        {tx.fromAddresses.length > 3 && (
                          <div
                            className={cn(
                              'rounded-full border bg-white border-[#23272C] w-[22px] h-[22px] text-[9px] overflow-hidden text-[#23272C] flex items-center justify-center',
                            )}
                          >
                            {Math.min(tx.fromAddresses.length - 3, 99)}+
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {tx.toAddresses.length !== 0 && (
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-muted-foreground">To</span>
                      <div className="flex items-center justify-end -space-x-2 relative">
                        {tx.toAddresses.slice(0, 3).map((address, index) => (
                          <Link href={`/address/${address}`} key={index}>
                            <Image
                              alt="ckb icon"
                              className={cn('rounded-full border border-[#23272C]')}
                              height={20}
                              src={isValidBTCAddress(address) ? '/img/btc.png' : '/img/nervos.png'}
                              width={20}
                            />
                          </Link>
                        ))}

                        {tx.toAddresses.length > 3 && (
                          <div
                            className={cn(
                              'rounded-full border bg-white border-[#23272C] w-[22px] h-[22px] text-[9px] overflow-hidden text-[#23272C] flex items-center justify-center',
                            )}
                          >
                            {Math.min(tx.toAddresses.length - 3, 99)}+
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-4 md:ml-auto">
                {tx.changes.map((change) => {
                  const assetInfo = tx.assets.find((asset) => asset.id === change.assetId);
                  return (
                    <div className="bg-[#23272C] p-1 px-2 flex items-center gap-2" key={change.assetId}>
                      <Image
                        alt={assetInfo?.symbol ?? 'icon'}
                        className={cn('rounded-full')}
                        height={20}
                        src={assetInfo?.icon ?? '/img/logo.svg'}
                        width={20}
                      />
                      <div>
                        <div className="text-sm">{assetInfo?.symbol}</div>
                        <div className="text-xs">
                          {BigNumber(formatWithDecimal(change.value, assetInfo?.decimals ?? 0)).toFormat(
                            2,
                            BigNumber.ROUND_FLOOR,
                          )}{' '}
                          <span className="text-xs text-muted-foreground">
                            ${BigNumber(change.volume).toFormat(2, BigNumber.ROUND_FLOOR)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-col items-end max-md:items-start max-w-full max-md:w-full">
                <div className="max-md:text-sm max-md:text-muted-foreground">
                  {'('}Block {tx.blockNumber.toLocaleString()}
                  {')'}
                  <span className="ml-2">{dayjs(tx.time).fromNow()}</span>
                </div>
                <Link className="text-primary inconsolata" href={`/transaction/${tx.txHash}`}>
                  {tx.network === 'BTC' ? tx.txHash.slice(2, 10) : tx.txHash.slice(0, 8)}...{tx.txHash.slice(-8)}
                </Link>
              </div>
            </div>
          ))}
        </div>
        <div className="w-full flex justify-center mt-4">
          <Pagination
            current={transactions.pagination.page}
            onChangePage={(page) => setQuery((pre) => ({ ...pre, page }))}
            total={pageCount}
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
            <span>Chain</span>
            <Select
              onValueChange={(value) =>
                setQuery(({ page: _, ...pre }) => ({
                  ...pre,
                  chain: value === 'all' ? undefined : (value as 'BTC' | 'CKB'),
                }))
              }
              value={query.chain ?? 'all'}
            >
              <SelectTrigger className="h-8">
                <SelectValue placeholder="filter token" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ALL</SelectItem>
                <SelectItem value="CKB">CKB</SelectItem>
                <SelectItem value="BTC">BTC</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 items-center">
            <span>Token</span>
            <Select
              onValueChange={(value) =>
                setQuery(({ page: _, ...pre }) => ({ ...pre, asset: value === 'all' ? undefined : value }))
              }
              value={query.asset ?? 'all'}
            >
              <SelectTrigger className="h-8">
                <SelectValue placeholder="filter chain" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ALL</SelectItem>
                {relatedAssets.map((asset) => (
                  <SelectItem key={asset.assetId} value={asset.assetId}>
                    {asset.assetInfo?.symbol}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 ml-auto max-md:w-full max-md:justify-between">
          <SortSwitcher
            className="max-md:px-2"
            onChange={(sort) =>
              setQuery(({ page: _page, ...pre }) =>
                sort === undefined ? pre : { ...pre, orderKey: 'asset', order: sort },
              )
            }
            order={query.orderKey === 'asset' ? query.order : undefined}
            variant="ghost"
          >
            Asset
          </SortSwitcher>
          <SortSwitcher
            className="max-md:px-2"
            onChange={(sort) =>
              setQuery(({ page: _page, ...pre }) =>
                sort === undefined ? pre : { ...pre, orderKey: 'change', order: sort },
              )
            }
            order={query.orderKey === 'change' ? query.order : undefined}
            variant="ghost"
          >
            Change
          </SortSwitcher>
          <SortSwitcher
            className="max-md:px-2"
            onChange={(sort) =>
              setQuery(({ page: _page, ...pre }) =>
                sort === undefined ? pre : { ...pre, orderKey: 'time', order: sort },
              )
            }
            order={query.orderKey === 'time' ? query.order : undefined}
            variant="ghost"
          >
            Time
          </SortSwitcher>
        </div>
      </div>

      {renderList()}
    </div>
  );
};
