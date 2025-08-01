'use client';
import '~/styles/globals.css';

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ChevronLeft, ChevronRight, LoaderCircle } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { type ReactNode, useState } from 'react';

import { CardContent } from '~/components/Card';
import { Button } from '~/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '~/components/ui/dialog';
import { Pagination, PaginationContent, PaginationItem } from '~/components/ui/pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table';
import { cn } from '~/lib/utils';
import { type PickPaginationOutputResult } from '~/server/api/routers/zod-helper';
import { api, type RouterOutputs } from '~/trpc/react';
import { formatWithDecimal, localeNumberString, parseNumericAbbr } from '~/utils/utility';

import DetailIcon from './detail.svg';

const BlockAddressTransfers = ({ address, blockHash }: { address: string; blockHash: string }) => {
  const t = useTranslations('BlockPage');
  const [open, setOpen] = useState(false);

  const columns: ColumnDef<PickPaginationOutputResult<RouterOutputs['v0']['blocks']['addressAssetChangeList']>>[] = [
    {
      accessorKey: 'input',
      header: t('statistic.address.detail.input'),
      cell: ({ row: { original } }) => (
        <span className="flex items-center">
          {localeNumberString(
            formatWithDecimal(original.amountSent, original.asset.decimals ?? 0).toString(),
            original.asset.decimals ?? 0,
          )}{' '}
          {original.asset.symbol}
        </span>
      ),
    },
    {
      accessorKey: 'output',
      header: t('statistic.address.detail.output'),
      cell: ({ row: { original } }) => (
        <span className="flex items-center">
          {localeNumberString(
            formatWithDecimal(original.amountReceived, original.asset.decimals ?? 0).toString(),
            original.asset.decimals ?? 0,
          )}{' '}
          {original.asset.symbol}
        </span>
      ),
    },
    {
      accessorKey: 'change',
      header: t('statistic.address.detail.change'),
      cell: ({ row: { original } }) => {
        const change = original.amountReceived - original.amountSent;
        const isNegative = change < 0n;
        const color = isNegative ? 'text-red-500' : 'text-green-500';
        const formatedChange = formatWithDecimal(change, original.asset.decimals ?? 0).toString();
        return (
          <span className={cn('whitespace-nowrap', color)}>
            {`${isNegative ? '-' : '+'} ${localeNumberString(formatedChange.toString().replace('-', ''), original.asset.decimals ?? 0)} ${original.asset.symbol}`}
          </span>
        );
      },
    },
    {
      accessorKey: 'volume',
      header: t('statistic.address.detail.volume'),
      cell: ({ row }) => (
        <span className="md:last:text-right">
          ${parseNumericAbbr(row.original.amountUsd?.toString().replace('-', '') ?? '0', 2)}
        </span>
      ),
    },
  ];

  const [pagination, setPagination] = useState<{ pageIndex: number; pageSize: number }>({
    pageIndex: 0,
    pageSize: 10,
  });
  const query = api.v0.blocks.addressAssetChangeList.useQuery(
    { address, blockHash, page: pagination.pageIndex + 1, pageSize: pagination.pageSize },
    {
      initialData: { result: [], total: 0 },
      refetchOnWindowFocus: false,
      enabled: open,
    },
  );

  const table = useReactTable({
    data: query.data.result,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onPaginationChange: setPagination,
    manualPagination: true,
    rowCount: query.data?.total,
    state: { pagination },
  });

  return (
    <>
      <Dialog onOpenChange={setOpen} open={open}>
        <DialogTrigger>
          <div className="flex items-center hover:text-primary text-muted-foreground ">
            <span className="hidden md:block whitespace-nowrap">Detail</span>
            <DetailIcon />
          </div>
        </DialogTrigger>
        <DialogContent className="p-4 max-w-[800px]">
          <DialogTitle>
            <span>{t('statistic.asset.detail.title')}</span>
          </DialogTitle>
          <div className="relative max-w-full">
            <div className="hidden md:block">
              <Table className="table-fixed w-full">
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead className={cn(' p-1 h-8 last:text-right')} key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow className="even:bg-[#171A1F] hover:bg-opacity-100 odd:py-[2rem]" key={row.id}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell
                            className={cn('p-1 first:rounded-l-md last:rounded-r-md last:text-right')}
                            key={cell.id}
                          >
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
              <CardContent className="bg-[#101214] p-2 flex flex-col gap-4 border border-[#222] rounded-lg max-h-[65vh] overflow-y-auto">
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => {
                    const items = row.getVisibleCells().reduce<Record<string, ReactNode>>((acc, cell) => {
                      const id = cell.id.slice(2);
                      acc[id] = (
                        <div className="flex flex-col gap-1">
                          <div className="text-muted-foreground min-h-[1.5rem] flex justify-between">
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            {id === 'transferIcon' ? '' : t(`statistic.address.detail.${id}` as any)}
                          </div>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </div>
                      );
                      return acc;
                    }, {});
                    return (
                      <div className="flex flex-col gap-4 bg-muted p-2 rounded-lg" key={row.id}>
                        {items.input}
                        {items.output}
                        {items.change}
                        {items.volume}
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
                    className={cn('bg-border text-muted-foreground border-0 gap-1 pr-2.5 hover:bg-border/90')}
                    disabled={!table.getCanPreviousPage()}
                    onClick={() => table.setPageIndex(0)}
                    size="sm"
                    variant={'outline'}
                  >
                    First
                  </Button>
                </PaginationItem>

                <PaginationItem className={cn('text-muted-foreground')}>
                  {table.getState().pagination.pageIndex + 1} / {table.getPageCount() || 1}
                </PaginationItem>
                <PaginationItem>
                  <Button
                    className={cn('bg-border text-muted-foreground border-0 gap-1 pr-2.5 hover:bg-border/90')}
                    disabled={!table.getCanNextPage()}
                    onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                    size="sm"
                    variant={'outline'}
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
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BlockAddressTransfers;
