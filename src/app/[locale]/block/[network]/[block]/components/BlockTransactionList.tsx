'use client';
import * as Tooltip from '@radix-ui/react-tooltip';
import { keepPreviousData } from '@tanstack/react-query';
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type PaginationState,
  useReactTable,
} from '@tanstack/react-table';
import BigNumber from 'bignumber.js';
import { ChevronLeft, ChevronRight, LoaderCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { type ComponentProps, type ReactNode, useEffect, useState } from 'react';

import AddressAvatar from '~/components/AddressAvatar';
import HashViewer from '~/components/HashViewer';
import { TxCountBadge } from '~/components/TxCountBadge';
import { Button } from '~/components/ui/button';
import { CardContent } from '~/components/ui/card';
import { Pagination, PaginationContent, PaginationItem } from '~/components/ui/pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table';
import { TooltipContent } from '~/components/ui/tooltip';
import { UNKNOWN } from '~/lib/address';
import { cn, formatHash } from '~/lib/utils';
import { type Network, type PickPaginationOutputResult } from '~/server/api/routers/zod-helper';
import { api, isVerificationError, type RouterOutputs } from '~/trpc/react';
import { formatWithDecimal, parseNumericAbbr, trunkLongStr } from '~/utils/utility';

import AddressFilter from './AddressFilter';
import Search from './Search';
import SortIcon from './sort.svg';
import TransferIcon from './transfer.svg';
export interface Transaction {
  txHash: string;
  from: string;
  to: string;
  fromCount: number;
  toCount: number;
  amount: string;
  volume: bigint;
}

function RenderInputOrOutput({
  address,
  network,
  fromOrToCount,
  txHash,
}: {
  address: string;
  network: Network;
  fromOrToCount: number;
  txHash: string;
}) {
  if (address === 'coinbase') {
    return network === 'ckb' ? 'cellbase' : 'coinbase';
  }
  if (address === UNKNOWN) {
    return (
      <div>
        <span className="md:hidden">{address}</span>
        <span className="hidden md:block">{address}</span>
        {fromOrToCount > 1 && <TxCountBadge count={fromOrToCount} hash={txHash} />}
      </div>
    );
  }
  return (
    <Tooltip.Provider>
      <Tooltip.Root>
        <Tooltip.Trigger>
          <div className="text-primary flex gap-[4px] items-center">
            <AddressAvatar address={address} />
            <Link
              className="cursor-pointer inconsolata hover:opacity-80 active:opacity-60"
              href={`/address/${address}`}
            >
              <span className="md:hidden">{trunkLongStr(address, 4, 4)}</span>
              <span className="hidden md:block">{trunkLongStr(address)}</span>
            </Link>
            {fromOrToCount > 1 && <TxCountBadge count={fromOrToCount} hash={txHash} />}
          </div>
        </Tooltip.Trigger>
        <TooltipContent>
          <p className="max-w-[400px] break-all">{address}</p>
        </TooltipContent>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

export const BlockTransactionList = ({
  blockHash,
  initialData,
  network,
}: ComponentProps<'div'> & {
  blockHash: string;
  initialData: RouterOutputs['v0']['blocks']['txs'];
  network: Network;
}) => {
  const t = useTranslations('BlockPage');
  const [sort, setSort] = useState<'asc' | 'desc' | undefined>(undefined);
  const [fromFilter, setFromFilter] = useState<string | undefined>(undefined);
  const [toFilter, setToFilter] = useState<string | undefined>(undefined);
  const [addressCondition, setAddressCondition] = useState<'or' | 'and' | undefined>(undefined);
  const [txHashFilter, setTxHashFilter] = useState<string | undefined>(undefined);

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const columns: ColumnDef<PickPaginationOutputResult<RouterOutputs['v0']['blocks']['txs']>>[] = [
    {
      accessorKey: 'no',
      header: 'No.',
      cell: ({ row }) => (
        <div className="flex items-center">{row.index + 1 + pagination.pageIndex * pagination.pageSize}</div>
      ),
    },
    {
      accessorKey: 'hash',
      header: () => {
        return (
          <div className="flex items-center gap-2">
            <div className="whitespace-nowrap">{t('transactions.hash')}</div>
            <Search onChange={setTxHashFilter} />
          </div>
        );
      },
      cell: ({ row }) => (
        <div className="flex items-center text-primary">
          <Link className="cursor-pointer inconsolata" href={`/transaction/${row.original.hash}`}>
            <HashViewer
              formattedValue={trunkLongStr(formatHash(row.original.hash, network), 4, 4)}
              value={row.original.hash}
            />
          </Link>
        </div>
      ),
    },
    {
      accessorKey: 'from',
      header: () => (
        <div className="flex items-center">
          <span>From</span>
          <AddressFilter
            addressConditionFilter={addressCondition}
            fromFilter={fromFilter}
            setAddressConditionFilter={setAddressCondition}
            setFromFilter={setFromFilter}
            setToFilter={setToFilter}
            toFilter={toFilter}
          />
        </div>
      ),
      cell: ({ row }) => (
        <RenderInputOrOutput
          address={row.original.from}
          network={network}
          fromOrToCount={row.original.fromCount}
          txHash={row.original.hash}
        />
      ),
    },
    {
      accessorKey: 'transferIcon',
      header: '',
      cell: () => <TransferIcon />,
    },
    {
      accessorKey: 'to',
      header: () => <div className="flex items-center">To</div>,
      cell: ({ row }) => (
        <RenderInputOrOutput
          address={row.original.to}
          network={network}
          fromOrToCount={row.original.toCount}
          txHash={row.original.hash}
        />
      ),
    },
    {
      accessorKey: 'amount',
      header: () => (
        <div className="flex items-center">
          <span>Amount</span>
          {/* TODO: Because of the change of the production request, the asset filter will be used in the future */}
          {/* <AssetFilter assetFilter={assetFilter} blockNumber={blockNumber} setAssetFilter={setAssetFilter} /> */}
        </div>
      ),
      cell: ({ row }) => {
        const amount = BigNumber(formatWithDecimal(row.original.amount, row.original.asset?.decimals ?? 0)).toFormat(
          8,
          3,
        );
        return (
          <span className="whitespace-nowrap">
            {amount.split('.')[0]}.<span className="text-xs text-muted-foreground">{amount.split('.')[1]}</span>{' '}
            {row.original.asset?.symbol ?? ''}
          </span>
        );
      },
    },
    {
      accessorKey: 'volume',
      header: () => (
        <div className="flex items-center justify-end">
          <span>Volume</span>
          <button className="cursor-pointer" onClick={() => (sort === 'asc' ? setSort('desc') : setSort('asc'))}>
            <SortIcon className={cn(sort && 'text-primary', sort === 'desc' && 'rotate-180')} />
          </button>
        </div>
      ),
      cell: ({ row }) => (
        <span className="whitespace-nowrap">$ {parseNumericAbbr(row.original.amountUsd.toString(), 2)}</span>
      ),
    },
  ];

  const query = api.v0.blocks.txs.useQuery(
    {
      blockHash,
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      from: fromFilter,
      to: toFilter,
      orderDirection: sort,
      addressFilterOperator: addressCondition,
      txHash: txHashFilter,
    },
    {
      initialData: () => (pagination.pageIndex === 0 ? initialData : undefined),
      refetchOnMount: false,
      placeholderData: keepPreviousData,
      retry(failureCount, error) {
        if (isVerificationError(error)) {
          return false; // Do not retry on verification errors
        }
        return failureCount < 3; // Retry up to 3 times for other errors
      },
    },
  );

  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    // query.refetch();
  }, [txHashFilter]);

  const table = useReactTable({
    data: query.data.result,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onPaginationChange: setPagination,
    manualPagination: true,
    rowCount: query.data.total,
    state: { pagination },
  });

  return (
    <div className="bg-[#101215] md:bg-muted rounded-lg p-0 md:p-2 pb-6">
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead className="p-4 h-8 last:text-right" key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {query.isError ? (
              <TableCell className="h-24 text-center" colSpan={columns.length}>
                <Image alt="no-result" className="mx-auto" height={120} src="/img/no-result.png" width={96} />
              </TableCell>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  className="border-0 even:bg-[#171A1F] hover:bg-opacity-100 odd:bg-[#1C2024] odd:py-[2rem]"
                  key={row.id}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell className="first:rounded-l-md last:rounded-r-md last:text-right" key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell className="h-24 text-center" colSpan={columns.length}>
                  <Image alt="no-result" className="mx-auto" height={120} src="/img/no-result.png" width={96} />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="block md:hidden">
        <CardContent className="bg-[#101214] p-2 flex flex-col gap-4 border border-[#222] rounded-lg">
          {table.getHeaderGroups().map((headerGroup) => {
            const items = headerGroup.headers.reduce<Record<string, ReactNode>>((acc, header) => {
              acc[header.id] = (
                <div key={header.id}>
                  {header.column.columnDef.header && flexRender(header.column.columnDef.header, header.getContext())}
                </div>
              );
              return acc;
            }, {});
            return (
              <div className="flex flex-col gap-4" key={headerGroup.id}>
                <div className="flex justify-between">
                  <span className="text-muted-foreground min-h-[1.5rem] block">{items.hash}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground min-h-[1.5rem] block">{items.from}</span>
                  <span className="text-muted-foreground min-h-[1.5rem] block">{items.amount}</span>
                  <span className="text-muted-foreground min-h-[1.5rem] block">{items.volume}</span>
                </div>
              </div>
            );
          })}
          {query.isError ? (
            <Image alt="no-result" className="mx-auto" height={120} src="/img/no-result.png" width={96} />
          ) : table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => {
              const items = row.getVisibleCells().reduce<Record<string, ReactNode>>((acc, cell) => {
                const id = cell.id.slice(2);
                acc[id] = (
                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground min-h-[1.5rem] block">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {id === 'transferIcon' ? '' : t(`transactions.${id}` as any)}
                    </span>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </div>
                );
                return acc;
              }, {});
              return (
                <div className="flex flex-col gap-4 bg-muted p-2 rounded-lg" key={row.id}>
                  {items.hash}
                  <div className="flex justify-between">
                    <div className="flex-1">{items.from}</div>
                    <div className="flex-1 flex justify-center">{items.transferIcon}</div>
                    <div className="flex-1 flex justify-start">{items.to}</div>
                  </div>
                  <div className="flex justify-between">
                    <div className="flex-1">{items.amount}</div>
                    <div className="flex-1 flex justify-center">{items.volume}</div>
                  </div>
                </div>
              );
            })
          ) : query.isLoading ? (
            <LoaderCircle className="mx-auto animate-spin" />
          ) : (
            <Image alt="no-result" className="mx-auto" height={120} src="/img/no-result.png" width={96} />
          )}
        </CardContent>
      </div>

      <Pagination className="mt-4">
        <PaginationContent className="flex items-center gap-4">
          <PaginationItem>
            <Button
              className="text-muted-foreground hover:bg-transparent"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
              size="sm"
              variant="ghost"
            >
              <ChevronLeft size={16} />
            </Button>
          </PaginationItem>
          <PaginationItem>
            <Button
              className="bg-border text-muted-foreground border-0 hover:bg-border/90"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.setPageIndex(0)}
              size="sm"
              variant="outline"
            >
              First
            </Button>
          </PaginationItem>

          <PaginationItem className="text-muted-foreground">
            {table.getState().pagination.pageIndex + 1}/{table.getPageCount() || 1}
          </PaginationItem>
          <PaginationItem>
            <Button
              className="bg-border text-muted-foreground border-0 hover:bg-border/90"
              disabled={!table.getCanNextPage()}
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              size="sm"
              variant="outline"
            >
              Last
            </Button>
          </PaginationItem>
          <PaginationItem>
            <Button
              className="text-muted-foreground hover:bg-transparent"
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
              size="sm"
              variant="ghost"
            >
              <ChevronRight size={16} />
            </Button>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
};
