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
  useReactTable,
} from '@tanstack/react-table';
import { ChevronLeft, ChevronRight, LoaderCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { type ReactNode, useState } from 'react';

import { Button } from '~/components/ui/button';
import { CardContent } from '~/components/ui/card';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '~/components/ui/dialog';
import { Pagination, PaginationContent, PaginationItem } from '~/components/ui/pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table';
import { TooltipContent } from '~/components/ui/tooltip';
import { cn, formatHash } from '~/lib/utils';
import { type Network, type PickPaginationOutputResult } from '~/server/api/routers/zod-helper';
import { api, type RouterOutputs } from '~/trpc/react';
import { formatWithDecimal, localeNumberString, parseNumericAbbr, trunkLongStr } from '~/utils/utility';

import DetailIcon from './detail.svg';

const BlockAssetTransfers = ({
  assetId,
  blockHash,
  network,
}: {
  assetId: string;
  blockHash: string;
  network: Network;
}) => {
  const t = useTranslations('BlockPage');
  const [tooltipOpen, setTooltipOpen] = useState<Record<string, boolean> | undefined>(undefined);
  const [open, setOpen] = useState(false);

  const handleTooltipOpenChange = (hash: string, open: boolean) => {
    if (tooltipOpen) {
      setTooltipOpen((prev) => ({ ...prev, [hash]: open }));
    } else {
      setTooltipOpen({});
    }
  };

  const columns: ColumnDef<PickPaginationOutputResult<RouterOutputs['v0']['blocks']['assetTxAmountList']>>[] = [
    {
      accessorKey: 'hash',
      header: t('statistic.asset.detail.hash'),
      cell: ({ row }) =>
        row.original.hash !== 'coinbase' ? (
          <div className="flex items-center text-primary max-w-full">
            <Tooltip.Provider>
              <Tooltip.Root
                onOpenChange={(open) => handleTooltipOpenChange(row.original.hash, open)}
                open={tooltipOpen?.[row.original.hash] ?? false}
              >
                <Tooltip.Trigger>
                  <div className="text-primary flex gap-[4px] items-center">
                    <Link className="cursor-pointer" href={`/transaction/${row.original.hash}`}>
                      {trunkLongStr(formatHash(row.original.hash, network), 4, 4)}
                    </Link>
                  </div>
                </Tooltip.Trigger>
                <TooltipContent>
                  <p className="max-w-[400px] break-all">{row.original.hash}</p>
                </TooltipContent>
              </Tooltip.Root>
            </Tooltip.Provider>
          </div>
        ) : (
          <div>coinbase</div>
        ),
    },
    {
      accessorKey: 'value',
      header: t('statistic.asset.detail.value'),
      cell: ({ row: { original } }) => (
        <span className="whitespace-nowrap">
          {localeNumberString(
            formatWithDecimal(original.amount, original.asset?.decimals ?? 0).toString(),
            original.asset?.decimals ?? 0,
          )}{' '}
          {original.asset?.symbol}
        </span>
      ),
    },
    {
      accessorKey: 'volume',
      header: t('statistic.asset.detail.volume'),
      cell: ({ row }) => (
        <span className="md:last:text-right">${parseNumericAbbr(row.original.amountUsd?.toString() ?? '0', 2)}</span>
      ),
    },
  ];

  const [pagination, setPagination] = useState<{ pageIndex: number; pageSize: number }>({
    pageIndex: 0,
    pageSize: 10,
  });
  const query = api.v0.blocks.assetTxAmountList.useQuery(
    { assetId, blockHash, page: pagination.pageIndex + 1, pageSize: pagination.pageSize },
    {
      refetchOnMount: false,
      placeholderData: keepPreviousData,
      enabled: open,
    },
  );

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
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger>
        <div className="flex items-center hover:text-primary text-muted-foreground ">
          <span className="hidden md:block whitespace-nowrap">Detail</span>
          <DetailIcon />
        </div>
      </DialogTrigger>
      <DialogContent className="p-4 md:max-w-[800px] max-w-[95vw] rounded-lg max-h-[80vh]">
        <DialogTitle>{t('statistic.asset.detail.title')}</DialogTitle>
        <div className="relative max-w-full">
          <div className="hidden md:block">
            <Table className="table-fixed w-full">
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead className={cn('p-1 h-8 last:text-right')} key={header.id}>
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow className="border-0 even:bg-[#171A1F] hover:bg-opacity-100 odd:py-[2rem]" key={row.id}>
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
                          {t(`statistic.asset.detail.${id}` as any)}
                        </div>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </div>
                    );
                    return acc;
                  }, {});
                  return (
                    <div className="flex flex-col gap-4 bg-muted p-2 rounded-lg" key={row.id}>
                      <div className="flex gap-20">
                        {items.hash}
                        {items.value}
                      </div>
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
                  variant="outline"
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
      </DialogContent>
    </Dialog>
  );
};

export default BlockAssetTransfers;
