'use client';
import { keepPreviousData } from '@tanstack/react-query';
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import AddressAvatar from '~/components/AddressAvatar';
import HashViewer from '~/components/HashViewer';
import { Button } from '~/components/ui/button';
import { Pagination, PaginationContent, PaginationItem } from '~/components/ui/pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table';
import { type PickPaginationOutputResult } from '~/server/api/routers/zod-helper';
import { api, type RouterOutputs } from '~/trpc/react';
import { trunkLongStr } from '~/utils/utility';

import { AssetValue } from '../AssetValue';

const columns: ColumnDef<PickPaginationOutputResult<RouterOutputs['v0']['asset']['holders']> & { no: number }>[] = [
  {
    accessorKey: 'no',
    header: 'No.',
    cell: ({ row }) => <span className={'text-primary'}>{row.original.no}</span>,
  },
  {
    accessorKey: 'address',
    header: 'Address',
    cell: ({ row }) => (
      <Link
        className="flex gap-1 items-center text-primary min-w-40"
        href={`/address/${row.original.address}`}
        prefetch={false}
      >
        <AddressAvatar address={row.original.address} />
        <HashViewer formattedValue={trunkLongStr(row.original.address, 8, 8)} value={row.original.address} />
      </Link>
    ),
  },
  {
    accessorKey: 'amount',
    enableSorting: true,
    header: () => (
      <div className="flex items-center">
        Amount <ChevronDown className="ml-1 h-4 w-4" />
      </div>
    ),
    cell: ({ row }) => (
      <div>
        <AssetValue value={row.original.amount} />
      </div>
    ),
  },
  {
    accessorKey: 'amountUsd',
    header: 'Volume',
  },
  {
    accessorKey: 'percentage',
    header: 'Percentage',
    cell: ({ row }) => <span>{(row.original.percentage * 100).toFixed(2)}%</span>,
  },
];

export function AssetHoldersTable({ assetId }: { assetId: string }) {
  const [pagination, setPagination] = useState<{ pageIndex: number; pageSize: number }>({
    pageIndex: 0,
    pageSize: 10,
  });

  const query = api.v0.asset.holders.useQuery(
    { assetId, page: pagination.pageIndex + 1, pageSize: pagination.pageSize },
    {
      select: (res) => ({
        ...res,
        data: res.result.map((item, i) => ({
          ...item,
          no: pagination.pageSize * pagination.pageIndex + i + 1,
        })),
      }),
      placeholderData: keepPreviousData,
    },
  );

  const table = useReactTable({
    data: query.data?.data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onPaginationChange: setPagination,
    manualPagination: true,
    rowCount: query.data?.total,
    //no need to pass pageCount or rowCount with client-side pagination as it is calculated automatically
    state: { pagination },
  });

  if (!query.data) {
    return null;
  }

  return (
    <div className="bg-muted rounded-md p-2 pb-6 h-full flex flex-col min-h-[500px]">
      <Table className="h-full" wrapperClassName="grow">
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead className="p-1 h-8" key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                className="border-0 even:bg-[#171A1F] hover:bg-opacity-100 odd:bg-[#1C2024]"
                data-state={row.getIsSelected() && 'selected'}
                key={row.id}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell className="first:rounded-l-md last:rounded-r-md p-1 max-h-24" key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell className="h-24 text-center" colSpan={columns.length}>
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Pagination className="mt-4">
        <PaginationContent className="flex items-center gap-8">
          <PaginationItem>
            <Button
              className={`bg-border text-muted-foreground border-0 gap-1 pr-2.5 hover:bg-border/90`}
              disabled={!table.getCanPreviousPage() || query.isFetching}
              onClick={() => table.previousPage()}
              size="sm"
              variant={'outline'}
            >
              <ChevronLeft size={16} />
              Previous
            </Button>
          </PaginationItem>
          <PaginationItem className="text-muted-foreground">
            {table.getState().pagination.pageIndex + 1} / {table.getPageCount().toLocaleString()}
          </PaginationItem>
          <PaginationItem>
            <Button
              className={`bg-border text-muted-foreground border-0 gap-1 pr-2.5 hover:bg-border/90`}
              disabled={!table.getCanNextPage() || query.isFetching}
              onClick={() => table.nextPage()}
              size="sm"
              variant={'outline'}
            >
              Next
              <ChevronRight size={16} />
            </Button>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
