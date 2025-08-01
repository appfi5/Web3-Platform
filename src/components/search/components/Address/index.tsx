'use client';
import Link from 'next/link';
import { type FC, useCallback, useMemo, useState } from 'react';
import * as R from 'remeda';

import AddressAvatar from '~/components/AddressAvatar';
import { Card, CardContent, CardFooter } from '~/components/ui/card';
import Pagination from '~/components/ui/pagination';
import { Skeleton } from '~/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table';
import { useToast } from '~/hooks/use-toast';
import { api } from '~/trpc/react';
import { dayjs, formatWithDecimal, trunkLongStr } from '~/utils/utility';

import Copy from '../../icon/copy.svg';
import Expand from '../../icon/expand.svg';
import ViewDetail from '../../icon/view-detail.svg';
import AssetIcon from '../AssetIcon';

const Address: FC<{ address: string }> = ({ address }) => {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const { data: assets } = api.v0.address.assets.useQuery({ address });
  const { data, isLoading: isLoadingTx } = api.v0.address.transactions.useQuery({ address, page });
  const { data: firstTx } = api.address.getAddressFirstTx.useQuery(address);
  const pageCount = Math.ceil((data?.total ?? 0) / 10);
  const assetsWithInfo = useMemo(() => assets?.filter((v) => v.assetInfo?.public), [assets]);

  const chains = useMemo(() => {
    const chainIds = new Set<string>();
    return assetsWithInfo
      ?.filter((v) => {
        if (chainIds.has(v.assetId)) return false;
        chainIds.add(v.assetId);
        return true;
      })
      .map((v) => v.assetInfo);
  }, [assetsWithInfo]);

  const onCopy = useCallback(() => {
    void navigator.clipboard.writeText(address);
    toast({ title: 'Copied' });
  }, [address, toast]);

  return (
    <Card className="p-3 h-full flex flex-col gap-2">
      <CardContent className="p-0 grow h-[calc(100%-76px)] flex flex-col">
        <div className="flex items-center text-base gap-1 mb-2">
          Address
          <Link
            className="text-muted-foreground text-xs inconsolata hover:opacity-80"
            href={`/address/${address}`}
            rel="noreferrer noopener"
            target="_blank"
          >
            {trunkLongStr(address)}
          </Link>
          <button className="border-none hover:opacity-80" onClick={onCopy}>
            <Copy />
          </button>
          <Link
            className="flex items-center ml-auto hover:opacity-80"
            href={`/address/${address}`}
            rel="noreferrer noopener"
            target="_blank"
          >
            <Expand className="size-5" />
          </Link>
        </div>
        <Card className="p-3 relative text-muted-foreground text-sm bg-accent mb-4">
          <div>Total Balance</div>
          <div className="flex gap-1">
            {assetsWithInfo?.map((v) => (
              <div className="flex gap-1" key={v.assetId}>
                <AssetIcon icon={v.assetInfo?.icon} symbol={v.assetInfo?.symbol} />
                {v.amountUsd ? `$${v.amountUsd}` : '--'}
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-4">
            <div>
              <div>Chain</div>
              <div className="flex gap-1">
                {chains?.map((v) => (
                  <div className="flex gap-1" key={v?.id}>
                    <AssetIcon icon={v?.icon} symbol={v?.symbol} />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div>Active at</div>
              <div className="flex items-center gap-1">
                <span>{firstTx?.time ? dayjs(firstTx.time).format('YYYY/MM/DD') : '--'}</span>
                <span>on</span>
                <AssetIcon
                  icon={firstTx?.network === 'btc' ? '/img/btc.png' : '/img/nervos.png'}
                  symbol={firstTx?.network}
                />
                <span>{firstTx?.assets[0]?.name}</span>
                <span>Block#{firstTx?.blockNumber}</span>
              </div>
            </div>
          </div>
        </Card>
        <Card className="bg-accent h-40 flex-1 overflow-y-auto">
          {!isLoadingTx && data ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No.</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Asset</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.result.map((v, idx) => {
                  const maxChange = R.pipe(v.changes, R.sortBy(R.prop('amount')), R.first());
                  const maxChangeAsset = v.assets.find((i) => i.id === maxChange?.assetId);
                  return (
                    <TableRow className="border-none [&>td]:odd:bg-[#1c2024] [&>td]:p-2 [&>td]:px-4" key={v.txHash}>
                      <TableCell>{idx + 1 + (page - 1) * 10}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {!v.fromAddresses.length
                            ? `Cellbase for Block`
                            : v.fromAddresses
                                .slice(0, 3)
                                .map((address) => (
                                  <AddressAvatar address={address} key={address} network={v.network} />
                                ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {v.toAddresses.slice(0, 3).map((address) => (
                            <AddressAvatar address={address} key={address} network={v.network} />
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {maxChange?.amount
                          ? formatWithDecimal(maxChange.amount, maxChangeAsset?.decimals ?? 0).replace('-', '')
                          : ''}
                        &nbsp;
                        {maxChangeAsset?.symbol}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <Skeleton className="h-48 w-full bg-accent" />
          )}
        </Card>
      </CardContent>
      <CardFooter className="p-0 flex flex-col gap-1">
        <div className="flex justify-center">
          <Pagination current={page} onChangePage={setPage} total={pageCount} />
        </div>
        <div className="flex justify-end w-full">
          <Link
            className="px-4 h-8 flex items-center gap-1 bg-accent text-xs text-secondary rounded-full hover:opacity-80"
            href={`/address/${address}`}
            target="_blank"
          >
            View All Transaction
            <ViewDetail />
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
};

export default Address;
