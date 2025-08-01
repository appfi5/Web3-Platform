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
import Link from 'next/link';
import { useMemo, useState } from 'react';

import AddressAvatar from '~/components/AddressAvatar';
import HashViewer from '~/components/HashViewer';
import Pagination from '~/components/ui/pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table';
import { cn } from '~/lib/utils';
import { api } from '~/trpc/react';

import EmptySvg from './empty.svg';

const columns: ColumnDef<{
  address_hash: string;
  average_deposit_time: string;
  dao_deposit: string;
}>[] = [
  {
    header: 'Rank',
    cell: ({ row }) => <div>{row.index + 1}</div>,
  },
  {
    accessorKey: 'address_hash',
    header: 'Address',
    enableColumnFilter: true,
    filterFn: (row, _, filterValue) => {
      if (!filterValue) return true;
      return filterValue === row.original.address_hash;
    },
    cell: ({ row }) => (
      <div className="flex gap-1 items-center text-primary">
        <AddressAvatar address={row.original.address_hash} />
        <Link href={`/address/${row.original.address_hash}`}>
          <HashViewer type="hash" value={row.original.address_hash} />
        </Link>
      </div>
    ),
  },
  {
    accessorKey: 'dao_deposit',
    header: 'Deposit Capacity',
    enableSorting: true,
    cell: ({ row }) => {
      const deposit = BigNumber(row.original.dao_deposit).div(Math.pow(10, 8)).toFormat(8, 3);
      const [int, dec] = deposit.split('.');
      return (
        <div>
          {int}.<span className="text-xs text-muted-foreground">{dec}</span> CKB
        </div>
      );
    },
  },
  {
    accessorKey: 'average_deposit_time',
    header: 'Deposit Time(Day)',
    enableSorting: true,
    cell: ({ row }) => <div className="flex items-center">{row.original.average_deposit_time}</div>,
  },
];

export function NervosDaoDepositors({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  const { data, isLoading, error } = api.explorer.daoDepositors.useQuery();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });

  const tableData: {
    address_hash: string;
    average_deposit_time: string;
    dao_deposit: string;
  }[] = useMemo(() => data?.data?.data.map((d) => d.attributes) ?? [], [data]);

  const table = useReactTable({
    data: tableData,
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
            <TableRow key={headerGroup.id}>
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
        <TableBody className="relative">
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
            total={tableData.length / pagination.pageSize}
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
