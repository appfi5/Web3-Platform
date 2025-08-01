'use client';
import * as SelectPrimitive from '@radix-ui/react-select';
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
import { FilterIcon, LoaderCircle } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import * as R from 'remeda';

import Pagination from '~/components/ui/pagination';
import { Select, SelectContent, SelectItem } from '~/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table';
import { cn } from '~/lib/utils';
import { api, type RouterOutputs } from '~/trpc/react';

import EmptySvg from './empty.svg';
import { getAssetNetwork, NetworkIcon } from './utils';

const columns: ColumnDef<RouterOutputs['v0']['address']['assets'][0]>[] = [
  {
    accessorKey: 'assetInfo.symbol',
    header: 'Chain',
    enableColumnFilter: true,
    filterFn: (row, _, filterValue) => {
      if (!filterValue) return true;
      return filterValue === getAssetNetwork(row.original.assetInfo);
    },
    cell: ({ row }) => (
      <div className="flex items-center">
        <Image
          alt="icon"
          className="rounded-full mr-1"
          height={28}
          src={NetworkIcon[getAssetNetwork(row.original.assetInfo)]}
          width={28}
        />
        {row.original.assetInfo?.symbol ?? (
          <span className="text-muted-foreground">{row.original.assetId.slice(0, 6)}...(UNKNOWN)</span>
        )}
      </div>
    ),
  },
  {
    accessorKey: 'assetAmount',
    header: 'Amount',
    cell: ({ row }) => <div>{BigNumber(row.original.assetAmount).toFormat(2, BigNumber.ROUND_FLOOR)}</div>,
  },
  {
    accessorKey: 'amountUsd',
    enableSorting: true,
    cell: ({ row }) => (
      <div className="flex items-center">
        $ {row.original.amountUsd ? BigNumber(row.original.amountUsd).toFormat(2, BigNumber.ROUND_FLOOR) : '-'}
      </div>
    ),
  },
];

export function AssetTable({
  address,
  className,
  ...props
}: React.HTMLAttributes<HTMLTableElement> & { address: string }) {
  const { data = [], isLoading } = api.v0.address.assets.useQuery({ address });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });

  const filterOptions = R.pipe(
    data.map((d) => getAssetNetwork(d.assetInfo)),
    R.unique(),
    R.map((i) => ({ key: i, label: i })),
  );

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
                const canFilter = header.column.getCanFilter() && header.column.columnDef.enableColumnFilter;
                const columnFilterValue = header.column.getFilterValue();

                if (canFilter) {
                  return (
                    <TableHead className={cn('p-1 h-8')} key={header.id}>
                      <Select
                        onValueChange={(value) => header.column.setFilterValue(value)}
                        value={columnFilterValue?.toString() ?? ''}
                      >
                        <SelectPrimitive.Trigger asChild>
                          <div className="flex items-center cursor-pointer">
                            {header.isPlaceholder
                              ? null
                              : flexRender(header.column.columnDef.header, header.getContext())}
                            <FilterIcon
                              className={cn('text-muted-foreground w-4 h-4', {
                                ['text-primary']: Boolean(columnFilterValue),
                              })}
                            />
                          </div>
                        </SelectPrimitive.Trigger>
                        <SelectContent>
                          <SelectItem value={null as unknown as string}>All</SelectItem>
                          {filterOptions.map(({ key, label }) => (
                            <SelectItem key={key} value={key}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableHead>
                  );
                }

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
          {table.getRowModel().rows?.length !== 0 &&
            table.getRowModel().rows.map((row) => (
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
                    <div>
                      ${' '}
                      {row.original.amountUsd
                        ? BigNumber(row.original.amountUsd).toFormat(2, BigNumber.ROUND_FLOOR)
                        : '-'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>
        <TableBody className="relative max-md:hidden">
          {table.getRowModel().rows?.length !== 0 &&
            table.getRowModel().rows.map((row) => (
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
            total={Math.ceil(data.length / pagination.pageSize)}
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
