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
import { ChevronLeft, ChevronRight, LoaderCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { type ComponentProps, type ReactNode, useEffect, useState } from 'react';

import AddressAvatar from '~/components/AddressAvatar';
import { Button } from '~/components/ui/button';
import { CardContent } from '~/components/ui/card';
import { Pagination, PaginationContent } from '~/components/ui/pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table';
import { TooltipContent } from '~/components/ui/tooltip';
import { cn } from '~/lib/utils';
import { type Network, type PickPaginationOutputResult } from '~/server/api/routers/zod-helper';
import { api, isVerificationError, type RouterOutputs } from '~/trpc/react';
import { localeNumberString, parseNumericAbbr, shannonToCkb, trunkLongStr } from '~/utils/utility';

import BlockAddressTransfers from './BlockAddressTransfers';
import Search from './Search';
import SortIcon from './sort.svg';

export const BlockAddresses = ({
  network,
  blockHash,
}: ComponentProps<'div'> & {
  network: Network;
  blockHash: string;
}) => {
  const t = useTranslations('BlockPage');
  const [sort, setSort] = useState<'asc' | 'desc' | undefined>(undefined);

  const [addressFilter, setAddressFilter] = useState<string | undefined>(undefined);

  const columns: ColumnDef<PickPaginationOutputResult<RouterOutputs['v0']['blocks']['addressChangeList']>>[] = [
    {
      accessorKey: 'address',
      header: () => {
        return (
          <div className="flex items-center gap-2">
            <div>{t('statistic.address.address')}</div>
            <Search onChange={setAddressFilter} />
          </div>
        );
      },
      cell: ({ row }) => (
        <div className="flex items-center text-primary">
          <Tooltip.Provider>
            <Tooltip.Root>
              <Tooltip.Trigger>
                <div className="text-primary flex gap-[4px] items-center">
                  <AddressAvatar address={row.original.address} />
                  <Link
                    className="cursor-pointer hover:opacity-80 active:opacity-60"
                    href={`/address/${row.original.address}`}
                  >
                    {trunkLongStr(row.original.address)}
                  </Link>
                </div>
              </Tooltip.Trigger>
              <TooltipContent>
                <p className="max-w-[400px] break-all">{row.original.address}</p>
              </TooltipContent>
            </Tooltip.Root>
          </Tooltip.Provider>
        </div>
      ),
    },
    {
      accessorKey: 'asset',
      header: t('statistic.address.asset'),
      cell: ({ row }) => (
        <div className="flex gap-[16px] no-wrap">
          <span className={`${row.original.amount >= 0n ? 'text-[#17B830]' : 'text-[#FF2929]'} whitespace-nowrap`}>
            {`${`${row.original.amount >= 0n ? '+' : '-'} ${localeNumberString(shannonToCkb(row.original.amount?.toString().replace('-', '') ?? 0).toString(), 8)}`}
            ${network.toUpperCase()}`}
          </span>
          {row.original.sendTokens > 0 && (
            <span className="text-[#17B830] whitespace-nowrap">{`+ ${row.original.sendTokens} Tokens`}</span>
          )}
          {row.original.receiveTokens > 0 && (
            <span className="text-[#FF2929] whitespace-nowrap">{`- ${row.original.receiveTokens} Tokens`}</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'change',
      header: () => (
        <div className="flex items-center">
          <span>{t('statistic.address.change')}</span>
          <button className="cursor-pointer" onClick={() => (sort === 'asc' ? setSort('desc') : setSort('asc'))}>
            <SortIcon className={cn(sort && 'text-primary', sort === 'desc' && 'rotate-180')} />
          </button>
        </div>
      ),
      cell: ({ row }) => {
        if (row.original.amountUsd === null) {
          return null;
        }

        const isNegative = row.original.amountUsd < 0;
        const amountUsd = Math.abs(row.original.amountUsd);
        const color = isNegative ? 'text-[#FF2929]' : 'text-[#17B830]';

        return (
          <span
            className={cn('whitespace-nowrap', color)}
          >{`${isNegative ? '-' : '+'} $ ${parseNumericAbbr(amountUsd, 2)}`}</span>
        );
      },
    },
    {
      accessorKey: 'action',
      header: t('statistic.address.action'),
      cell: ({ row }) => <BlockAddressTransfers address={row.original.address} blockHash={blockHash} />,
    },
  ];

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const query = api.v0.blocks.addressChangeList.useQuery(
    {
      blockHash,
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      orderDirection: sort,
      address: addressFilter,
    },
    {
      refetchOnMount: false,
      placeholderData: keepPreviousData,
      retry(failureCount, error) {
        if (isVerificationError(error)) {
          return false;
        }
        return failureCount < 3;
      },
    },
  );

  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [addressFilter]);

  const table = useReactTable({
    data: query.data?.result ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onPaginationChange: setPagination,
    manualPagination: true,
    rowCount: query.data?.total ?? 0,
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
                  <TableHead className="p-1 h-8 last:text-right" key={header.id}>
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
                    <TableCell className="px-1 first:rounded-l-md last:rounded-r-md last:text-right" key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell className="h-24 text-center" colSpan={columns.length}>
                  {query.isLoading ? (
                    <LoaderCircle className="mx-auto animate-spin" />
                  ) : (
                    <Image alt="no-result" className="mx-auto" height={120} src="/img/no-result.png" width={96} />
                  )}
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
              <div className="flex justify-between" key={headerGroup.id}>
                <span className="text-muted-foreground min-h-[1.5rem] block">{items.address}</span>
                <span className="text-muted-foreground min-h-[1.5rem] block">{items.change}</span>
              </div>
            );
          })}
          {query.isError ? (
            <Image alt="no-result" className="mx-auto" height={120} src="/img/no-result.png" width={96} />
          ) : table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => {
              const items = row.getVisibleCells().reduce<Record<string, ReactNode>>((acc, cell, index) => {
                const id = cell.id.slice(2);
                acc[id] = (
                  <div className="flex flex-col gap-1">
                    <div className="text-muted-foreground min-h-[1.5rem] flex justify-between">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {id === 'transferIcon' ? '' : t(`statistic.address.${id}` as any)}
                      {index === 0 && <BlockAddressTransfers address={row.original.address} blockHash={blockHash} />}
                    </div>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </div>
                );
                return acc;
              }, {});
              return (
                <div className="flex flex-col gap-4 bg-muted p-2 rounded-lg" key={row.id}>
                  {items.address}
                  {items.asset}
                  {items.change}
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
          <Button
            className="text-muted-foreground hover:bg-transparent"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
            size="sm"
            variant="ghost"
          >
            <ChevronLeft size={16} />
          </Button>
          <Button
            className="bg-border text-muted-foreground border-0 hover:bg-border/90"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.setPageIndex(0)}
            size="sm"
            variant="outline"
          >
            First
          </Button>
          <span className="text-muted-foreground">
            {`${table.getState().pagination.pageIndex + 1}/${table.getPageCount() || 1}`}
          </span>
          <Button
            className="bg-border text-muted-foreground border-0 hover:bg-border/90"
            disabled={!table.getCanNextPage()}
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            size="sm"
            variant="outline"
          >
            Last
          </Button>
          <Button
            className="text-muted-foreground hover:bg-transparent"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
            size="sm"
            variant="ghost"
          >
            <ChevronRight size={16} />
          </Button>
        </PaginationContent>
      </Pagination>
    </div>
  );
};
