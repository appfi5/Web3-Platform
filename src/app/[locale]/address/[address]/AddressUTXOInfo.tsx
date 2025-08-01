'use client';
import { helpers } from '@ckb-lumos/lumos';
import * as SelectPrimitive from '@radix-ui/react-select';
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type Row,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table';
import BigNumber from 'bignumber.js';
import { FilterIcon, LoaderCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import * as React from 'react';
import { type ComponentProps, useMemo, useState } from 'react';
import * as R from 'remeda';

import { Select, SelectContent, SelectItem } from '~/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table';
import { useIsMobile } from '~/hooks';
import { LUMOS_CONFIG } from '~/lib/constant';
import { cn } from '~/lib/utils';
import { api, type RouterOutputs } from '~/trpc/react';

import EmptySvg from './empty.svg';

const PLACEHOLDER_TOKEN = 'Unknown';

const THead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => {
    const isMobile = useIsMobile();
    if (isMobile)
      return (
        <div
          className={cn(className, 'flex h-12 text-left align-middle font-medium text-muted-foreground')}
          {...props}
          ref={ref}
        />
      );
    return <TableHead className={className} {...props} ref={ref} />;
  },
);
THead.displayName = 'THead';

type TableData = RouterOutputs['v0']['address']['utxos']['result'][0];
export type SortingFn<TData extends TableData = TableData> = (
  rowA: Row<TData>,
  rowB: Row<TData>,
  columnId: string,
) => number;

const sortingFn: SortingFn = (rowA, rowB, columnId) =>
  parseInt(rowB.getValue(columnId)) - parseInt(rowA.getValue(columnId));

const columns: ColumnDef<TableData>[] = [
  {
    accessorKey: 'no',
    header: 'No.',
    cell: ({ row }) => <div>{row.index + 1}</div>,
  },
  {
    accessorKey: 'token',
    header: 'Token',
    enableColumnFilter: true,
    cell: ({ row }) => (
      <div className="flex items-center">
        <Image
          alt="icon"
          className="rounded-full mr-2"
          height={24}
          src={row.original.tokenInfo?.icon ?? '/img/logo.svg'}
          width={24}
        />
        {row.original.token}
      </div>
    ),
    meta: {
      filterVariant: 'select',
    },
  },
  {
    accessorKey: 'blockHeight',
    header: 'Block Height',
    enableSorting: true,
    sortingFn,
    cell: ({ row }) => <div className="text-primary">#{row.original.blockHeight.toLocaleString()}</div>,
  },
  {
    accessorKey: 'outPoint',
    header: 'OutPoint',
    cell: ({ row }) => (
      <div className="text-primary inconsolata">
        <Link href={`/transaction/${row.original.outPoint}`} prefetch={false}>
          {row.original.outPoint.slice(0, 8)}...{row.original.outPoint.slice(-8)}
        </Link>
      </div>
    ),
  },
  {
    accessorKey: 'amount',
    header: 'Amount',
    enableSorting: true,
    sortingFn,
    cell: ({ row }) => <div>{parseInt(row.original.amount).toLocaleString()}</div>,
  },
  {
    accessorKey: 'capacity',
    header: 'Capacity(CKB)',
    enableSorting: true,
    sortingFn,
    cell: ({ row }) => (
      <div>{BigNumber(row.original.capacity).div(Math.pow(10, 8)).toFormat(2, BigNumber.ROUND_FLOOR)}</div>
    ),
  },
];

const CKBAddressInfo = ({ address, className, ...props }: ComponentProps<'div'> & { address: string }) => {
  const { codeHash, hashType, args } = helpers.addressToScript(address, { config: LUMOS_CONFIG });
  const [sorting, setSorting] = useState<SortingState>([]);

  const {
    data: liveCells,
    isLoading,
    hasNextPage,
    isFetching,
    fetchNextPage,
  } = api.v0.address.utxos.useInfiniteQuery(
    {
      address,
      pageSize: 10,
    },
    {
      getNextPageParam: (lastPage) => (lastPage.hasNext ? lastPage.lastCursor : undefined),
    },
  );

  const tableData = useMemo(
    () =>
      liveCells
        ? liveCells.pages.flatMap((page) =>
            page.result
              .map((cell) => ({ ...cell, token: cell.tokenInfo ? cell.token : PLACEHOLDER_TOKEN }))
              .map((cell) => ({
                ...cell,
                token: cell.token === '' ? PLACEHOLDER_TOKEN : cell.token,
              })),
          )
        : [],
    [liveCells],
  );

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  });

  const filterOptions = R.pipe(
    tableData.map((d) => ({ token: d.token, tokenInfo: d.tokenInfo })),
    R.map((i) => ({
      key: i.tokenInfo ? i.token : PLACEHOLDER_TOKEN,
      label: i.tokenInfo ? i.token : PLACEHOLDER_TOKEN,
    })),
    R.filter((i) => !!i.key),
    R.uniqueBy((obj) => obj.key),
  );

  return (
    <div className={cn('p-4 bg-muted', className)} {...props}>
      <div className="text-base font-semibold mb-4">CKB Address Info</div>
      <div className="text-sm font-medium mb-2">Live Cell</div>

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
                    <THead className={cn('p-1 h-8')} key={header.id}>
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
                    </THead>
                  );
                }

                if (canSort) {
                  return (
                    <THead
                      className={cn('p-1 h-8', { ['cursor-pointer select-none']: canSort })}
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div className="flex items-center">
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                        <div className="flex flex-col ml-1">
                          <span
                            className={cn(
                              { 'text-primary': header.column.getIsSorted() === 'desc' },
                              'text-[8px] -mb-[10px]',
                            )}
                          >
                            ▲
                          </span>
                          <span className={cn({ 'text-primary': header.column.getIsSorted() === 'asc' }, 'text-[8px]')}>
                            ▼
                          </span>
                        </div>
                      </div>
                    </THead>
                  );
                }

                return (
                  <THead className="p-1 h-8 max-md:hidden" key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </THead>
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
                  <div className="text-muted-foreground">Token</div>

                  <div className="flex items-center">
                    <Image
                      alt="icon"
                      className="rounded-full mr-2"
                      height={24}
                      src={row.original.tokenInfo?.icon ?? '/img/logo.svg'}
                      width={24}
                    />
                    {row.original.token}
                  </div>
                </div>

                <div className="grid grid-cols-2 mt-3 gap-3">
                  <div className="flex flex-col gap-1">
                    <div className="text-muted-foreground">Block Height</div>
                    <div className="text-primary">#{row.original.blockHeight.toLocaleString()}</div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="text-muted-foreground">OutPoint</div>
                    <div className="text-primary inconsolata">
                      <Link href={`/transaction/${row.original.outPoint}`}>
                        {row.original.outPoint.slice(0, 8)}...{row.original.outPoint.slice(-8)}
                      </Link>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="text-muted-foreground">Amount</div>
                    <div>{parseInt(row.original.amount).toLocaleString()}</div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="text-muted-foreground">Capacity(CKB)</div>
                    <div>
                      {BigNumber(row.original.capacity).div(Math.pow(10, 8)).toFormat(2, BigNumber.ROUND_FLOOR)}
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
      {hasNextPage && (
        <div className="flex items-center justify-center w-full mt-2">
          <button
            className="disabled:opacity-30 px-2 bg-[#222] h-6 rounded-sm text-xs text-muted-foreground"
            disabled={isFetching}
            onClick={() => fetchNextPage()}
          >
            {isFetching ? 'Loading more...' : 'Load More'}
          </button>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center w-full h-32">
          <LoaderCircle className="animate-spin" />
        </div>
      )}

      {!isLoading && tableData.length === 0 && (
        <div className="flex flex-col items-center justify-center w-full h-32">
          <EmptySvg className="w-24" />
          <p>No Data</p>
        </div>
      )}

      <div className="mt-6 break-all">
        <div className="text-sm font-medium mb-4">Lock Script</div>
        <div className="space-y-2 bg-[#1C2024] py-2 px-1 rounded-sm grid max-md:grid-cols-3 grid-cols-6">
          <span className="text-muted-foreground ">Code Hash:</span>
          <span className="max-md:col-span-2 col-span-5">{codeHash}</span>
          <span className="text-muted-foreground">Hash Type:</span>
          <span className="max-md:col-span-2 col-span-5">{hashType}</span>
          <span className="text-muted-foreground">Args:</span>
          <span className="max-md:col-span-2 col-span-5">{args}</span>
        </div>
      </div>
    </div>
  );
};

export default CKBAddressInfo;
