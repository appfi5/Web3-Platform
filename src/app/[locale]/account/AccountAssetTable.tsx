'use client';
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type PaginationState,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table';
import BigNumber from 'bignumber.js';
import { LoaderCircle } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

import Pagination from '~/components/ui/pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table';
import { cn } from '~/lib/utils';
import { api, type RouterOutputs } from '~/trpc/react';
import { localeNumberString } from '~/utils/og';

import { getAssetNetwork, NetworkIcon } from '../address/[address]/utils';
import EmptySvg from './empty.svg';

const columns: ColumnDef<RouterOutputs['account']['getAssets'][0]>[] = [
  {
    accessorKey: 'no',
    header: '#',
    cell: ({ row }) => <div>{row.index + 1}</div>,
  },
  {
    accessorKey: 'assetInfo.symbol',
    header: 'Chain',
    cell: ({ row }) => (
      <div className="flex items-center">
        <Image
          alt="icon"
          className="rounded-full mr-1"
          height={28}
          src={NetworkIcon[getAssetNetwork(row.original.assetInfo)]}
          width={28}
        />
        {row.original.assetInfo?.symbol}
      </div>
    ),
  },
  {
    accessorKey: 'assetAmount',
    header: 'Holdings',
    cell: ({ row }) => <div>{BigNumber(row.original.assetAmount).toFormat(2, BigNumber.ROUND_FLOOR)}</div>,
  },
  {
    accessorKey: 'value',
    enableSorting: true,
    cell: ({ row }) => (
      <div className="flex items-center">$ {BigNumber(row.original.value ?? 0).toFormat(2, BigNumber.ROUND_FLOOR)}</div>
    ),
  },
  {
    accessorKey: 'PNL',
    enableSorting: true,
    cell: ({ row }) => (
      <div
        className={cn(
          'text-[18px] font-semibold flex items-center',
          Number(row.original.percentChange24h || 0) > 0 ? 'text-rise' : 'text-down',
        )}
      >
        {localeNumberString(row.original.percentChange24h || 0, 2)}%
        <Image
          alt={'pnl'}
          height={16}
          src={`/img/${Number(row.original.percentChange24h || 0) > 0 ? 'ups' : 'downs'}.svg`}
          width={16}
        />
        <span className="text-secondary text-[13px] font-normal ml-1">(24H)</span>
      </div>
    ),
  },
];

export function AccountAssetTable({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  const { data = [], isLoading } = api.account.getAssets.useQuery();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    state: {
      pagination,
      sorting,
    },
  });

  return (
    <div className={cn('bg-muted rounded-md p-2 pb-6', className)} {...props}>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow
              className="max-md:flex max-md:flex-wrap max-md:items-center max-md:justify-between"
              key={headerGroup.id}
            >
              {headerGroup.headers.map((header) => {
                const canSort = header.column.getCanSort() && header.column.columnDef.enableSorting;

                if (canSort) {
                  return (
                    <TableHead
                      className={cn('p-1 h-8', { ['cursor-pointer select-none']: canSort })}
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div className="flex items-center">
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                        <div className="flex flex-col ml-1">
                          <span
                            className={cn(
                              { 'text-primary': header.column.getIsSorted() === 'asc' },
                              'text-[8px] -mb-[10px]',
                            )}
                          >
                            ▲
                          </span>
                          <span
                            className={cn({ 'text-primary': header.column.getIsSorted() === 'desc' }, 'text-[8px]')}
                          >
                            ▼
                          </span>
                        </div>
                      </div>
                    </TableHead>
                  );
                }

                return (
                  <TableHead className="p-1 h-8" key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <div className="flex flex-col gap-2 md:hidden">
          {table.getRowModel().rows?.map((row) => (
            <div
              className="py-2 px-1 bg-[#1C2024] rounded-md"
              data-state={row.getIsSelected() && 'selected'}
              key={row.id}
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center">
                  <Image
                    alt="icon"
                    className="rounded-full mr-2"
                    height={24}
                    src={NetworkIcon[getAssetNetwork(row.original.assetInfo)]}
                    width={24}
                  />
                  {row.original.assetInfo?.symbol}
                </div>
              </div>

              <div className="grid grid-cols-2 mt-3 gap-3">
                <div className="flex flex-col gap-1">
                  <div className="text-muted-foreground">Amount</div>
                  <div>{BigNumber(row.original.assetAmount).toFormat(2, BigNumber.ROUND_FLOOR)}</div>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="text-muted-foreground">By Value</div>
                  <div>$ {BigNumber(row.original.value ?? 0).toFormat(2, BigNumber.ROUND_FLOOR)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <TableBody className="relative max-md:hidden">
          {table.getRowModel().rows?.map((row) => (
            <TableRow
              className="border-0 even:bg-[#171A1F] hover:bg-opacity-100 odd:bg-[#1C2024]"
              data-state={row.getIsSelected() && 'selected'}
              key={row.id}
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell className="first:rounded-l-md last:rounded-r-md p-1" key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {!isLoading && table.getRowModel().rows?.length !== 0 && (
        <div className="w-full flex justify-center mt-2">
          <Pagination
            current={pagination.pageIndex + 1}
            onChangePage={(page) => setPagination((pre) => ({ ...pre, pageIndex: page - 1 }))}
            total={data.length / pagination.pageSize}
          />
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center w-full h-64">
          <LoaderCircle className="animate-spin" />
        </div>
      )}

      {!isLoading && table.getRowModel().rows?.length === 0 && (
        <div className="w-full h-full min-h-64 flex flex-col justify-center items-center">
          <EmptySvg className="w-24 text-center" />
          <p>No Data</p>
        </div>
      )}
    </div>
  );
}
