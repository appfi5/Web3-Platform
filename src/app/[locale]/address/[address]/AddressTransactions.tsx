'use client';
import BigNumber from 'bignumber.js';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { LoaderCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { type ComponentProps, useState } from 'react';

import AddressAvatar from '~/components/AddressAvatar';
import HashViewer from '~/components/HashViewer';
import { SortSwitcher } from '~/components/SortSwitcher';
import Pagination from '~/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { cn } from '~/lib/utils';
import { type NetworkInput } from '~/server/api/routers/zod-helper';
import { api, type RouterInputs, type RouterOutputs } from '~/trpc/react';
import { isValidBTCAddress } from '~/utils/bitcoin';
import { formatWithDecimal } from '~/utils/utility';

import EmptySvg from './empty.svg';
import { NetworkIcon } from './utils';

dayjs.extend(relativeTime);

function AddressIconShow({
  network,
  address,
}: {
  network: RouterOutputs['v0']['address']['transactions']['result'][number]['network'];
  address: string;
}) {
  const image = <AddressAvatar address={address} network={network} />;
  if (network !== 'btc' || isValidBTCAddress(address)) {
    return <Link href={`/address/${address}`}>{image}</Link>;
  }
  return image;
}

export const AddressTransactions = ({ address, className, ...props }: ComponentProps<'div'> & { address: string }) => {
  const [query, setQuery] = useState<
    Partial<{
      network: NetworkInput;
      assetId: string;
      orderKey: RouterInputs['v0']['address']['transactions']['orderKey'];
      orderDirection: RouterInputs['v0']['address']['transactions']['orderDirection'];
      page: number;
      pageSize: number;
    }>
  >({});
  const {
    data: transactions = {
      result: [],
      total: 0,
    },
    isLoading,
    error,
  } = api.v0.address.transactions.useQuery({
    address,
    ...query,
  });

  const pageSize = query.pageSize ?? 10;
  const { data: relatedAssets = [], isLoading: isAssetsLoading } = api.v0.address.assets.useQuery({ address });

  const pageCount = Math.ceil((transactions.total ?? 0) / pageSize);

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

    if (transactions.total === 0) {
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
          {transactions.result.map((tx) => (
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
                      <div className="flex items-center justify-end space-x-1 relative">
                        {tx.fromAddresses.slice(0, 3).map((address, index) => (
                          <AddressIconShow address={address} key={index} network={tx.network} />
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
                      <div className="flex items-center justify-end space-x-1 relative">
                        {tx.toAddresses.slice(0, 3).map((address, index) => (
                          <AddressIconShow address={address} key={index} network={tx.network} />
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
                          {assetInfo?.decimals !== null && assetInfo?.decimals !== undefined
                            ? formatWithDecimal(change.amount, assetInfo.decimals)
                            : '--'}{' '}
                          <span className="text-xs text-muted-foreground">
                            ${BigNumber(change.amountUsd).abs().toFormat(2, BigNumber.ROUND_FLOOR)}
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
                  <HashViewer
                    network={tx.network}
                    type="hash"
                    value={tx.network === 'ckb' ? tx.txHash : tx.txHash.slice(2)}
                  />
                </Link>
              </div>
            </div>
          ))}
        </div>
        <div className="w-full flex justify-center mt-4">
          <Pagination
            current={query.page ?? 1}
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
                  network: value === 'all' ? undefined : (value as NetworkInput),
                }))
              }
              value={query.network ?? 'all'}
            >
              <SelectTrigger className="h-8">
                <SelectValue placeholder="filter token" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ALL</SelectItem>
                <SelectItem value="ckb">CKB</SelectItem>
                <SelectItem value="btc">BTC</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 items-center">
            <span>Token</span>
            <Select
              onValueChange={(value) =>
                setQuery(({ page: _, ...pre }) => ({ ...pre, assetId: value === 'all' ? undefined : value }))
              }
              value={query.assetId ?? 'all'}
            >
              <SelectTrigger className="h-8">
                <SelectValue placeholder="filter chain" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ALL</SelectItem>
                {relatedAssets.map((asset) => (
                  <SelectItem key={asset.assetId} value={asset.assetId}>
                    {asset.assetInfo?.symbol ?? asset.assetId.slice(0, 8)}
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
                sort === undefined
                  ? { ...pre, orderKey: undefined, orderDirection: undefined }
                  : { ...pre, orderKey: 'asset', orderDirection: sort },
              )
            }
            order={query.orderKey === 'asset' ? query.orderDirection : undefined}
            variant="ghost"
          >
            Asset
          </SortSwitcher>
          <SortSwitcher
            className="max-md:px-2"
            onChange={(sort) =>
              setQuery(({ page: _page, ...pre }) =>
                sort === undefined
                  ? { ...pre, orderKey: undefined, orderDirection: undefined }
                  : { ...pre, orderKey: 'change', orderDirection: sort },
              )
            }
            order={query.orderKey === 'change' ? query.orderDirection : undefined}
            variant="ghost"
          >
            Change
          </SortSwitcher>
          <SortSwitcher
            className="max-md:px-2"
            onChange={(sort) =>
              setQuery(({ page: _page, ...pre }) =>
                sort === undefined
                  ? { ...pre, orderKey: undefined, orderDirection: undefined }
                  : { ...pre, orderKey: 'time', orderDirection: sort },
              )
            }
            order={query.orderKey === 'time' ? query.orderDirection : undefined}
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
