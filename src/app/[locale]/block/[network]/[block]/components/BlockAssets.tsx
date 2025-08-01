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
import { ChevronLeft, ChevronRight, LoaderCircle } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { type ComponentProps, type ReactNode, useState } from 'react';

import AssetIcon from '~/components/search/components/AssetIcon';
import { Button } from '~/components/ui/button';
import { CardContent } from '~/components/ui/card';
import { Pagination, PaginationContent, PaginationItem } from '~/components/ui/pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table';
import { cn } from '~/lib/utils';
import { type Network, type PickPaginationOutputResult } from '~/server/api/routers/zod-helper';
import { api, type RouterOutputs } from '~/trpc/react';
import { localeNumberString, parseNumericAbbr, shannonToCkb } from '~/utils/utility';

import BlockAssetTransfers from './BlockAssetTransfers';
import Search from './Search';
import SortIcon from './sort.svg';
import TagFilter from './TagFilter';

export const BlockAssets = ({
  network,
  blockNumber,
  blockHash,
}: ComponentProps<'div'> & {
  network: Network;
  blockNumber: number;
  blockHash: string;
}) => {
  const t = useTranslations('BlockPage');
  const [sort, setSort] = useState<'asc' | 'desc' | undefined>(undefined);
  const [assetFilter, setAssetFilter] = useState<string | undefined>(undefined);
  const [tagFilter, setTagFilter] = useState<string[]>([]);

  const columns: ColumnDef<PickPaginationOutputResult<RouterOutputs['v0']['blocks']['assetChangeList']>>[] = [
    {
      accessorKey: 'name',
      header: () => {
        return (
          <div className="flex items-center gap-2">
            <div>{t('statistic.asset.name')}</div>
            <Search onChange={setAssetFilter} />
          </div>
        );
      },
      cell: ({ row }) => (
        <div className="flex items-center gap-[8px]">
          {row.original.asset?.icon && (
            <AssetIcon icon={row.original.asset?.icon} symbol={row.original.asset.symbol ?? ''} />
          )}
          <span className="whitespace-nowrap">{row.original.asset?.symbol}</span>
        </div>
      ),
    },
    {
      accessorKey: 'tags',
      header: () => (
        <div className="flex items-center">
          <span>{t('statistic.asset.tags')}</span>
          <TagFilter blockNumber={blockNumber} network={network} setTagFilter={setTagFilter} tagFilter={tagFilter} />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center">
          {row.original.tags.map((tag) => (
            <span className="mr-2 bg-accent rounded-sm px-2 py-1 text-sm" key={tag}>
              {tag}
            </span>
          ))}
        </div>
      ),
    },
    {
      accessorKey: 'amount',
      header: t('statistic.asset.amount'),
      cell: ({ row }) => (
        <span className="whitespace-nowrap">
          {`${localeNumberString(shannonToCkb(row.original.amount.toString()).toString(), 8)} ${
            row.original.asset?.symbol
          }`}
        </span>
      ),
    },
    {
      accessorKey: 'volume',
      header: () => (
        <div className="flex items-center">
          <span>{t('statistic.asset.volume')}</span>
          <button className="cursor-pointer" onClick={() => (sort === 'asc' ? setSort('desc') : setSort('asc'))}>
            <SortIcon className={cn(sort && 'text-primary', sort === 'desc' && 'rotate-180')} />
          </button>
        </div>
      ),
      cell: ({ row }) => (
        <span className="whitespace-nowrap">$ {parseNumericAbbr(row.original.amountUsd?.toString() ?? '0', 2)}</span>
      ),
    },
    {
      accessorKey: 'action',
      header: t('statistic.address.action'),
      cell: ({ row }) => (
        <BlockAssetTransfers assetId={row.original.asset?.id ?? ''} blockHash={blockHash} network={network} />
      ),
    },
  ];

  const [pagination, setPagination] = useState<{ pageIndex: number; pageSize: number }>({
    pageIndex: 0,
    pageSize: 10,
  });
  const query = api.v0.blocks.assetChangeList.useQuery(
    {
      blockHash,
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      orderDirection: sort,
      assetName: assetFilter,
      tags: tagFilter,
    },
    {
      refetchOnMount: false,
      placeholderData: keepPreviousData,
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
            {table.getRowModel().rows?.length ? (
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
                <span className="text-muted-foreground min-h-[1.5rem] block">{items.name}</span>
                <span className="text-muted-foreground min-h-[1.5rem] block">{items.tags}</span>
                <span className="text-muted-foreground min-h-[1.5rem] block">{items.volume}</span>
              </div>
            );
          })}
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => {
              const items = row.getVisibleCells().reduce<Record<string, ReactNode>>((acc, cell, index) => {
                const id = cell.id.slice(2);
                acc[id] = (
                  <div className="flex flex-col gap-1">
                    <div className="text-muted-foreground min-h-[1.5rem] flex justify-between">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {id === 'transferIcon' ? '' : t(`statistic.asset.${id}` as any)}
                      {index === 0 && (
                        <BlockAssetTransfers
                          assetId={row.original.asset?.id ?? ''}
                          blockHash={blockHash}
                          network={network}
                        />
                      )}
                    </div>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </div>
                );
                return acc;
              }, {});
              return (
                <div className="flex flex-col gap-4 bg-muted p-2 rounded-lg" key={row.id}>
                  {items.name}
                  {items.tags}
                  {items.amount}
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
              className="bg-border text-muted-foreground border-0 gap-1 pr-2.5 hover:bg-border/90"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.setPageIndex(0)}
              size="sm"
              variant="outline"
            >
              First
            </Button>
          </PaginationItem>
          <PaginationItem className="text-muted-foreground">
            {table.getState().pagination.pageIndex + 1} / {table.getPageCount() || 1}
          </PaginationItem>
          <PaginationItem>
            <Button
              className="bg-border text-muted-foreground border-0 gap-1 pr-2.5 hover:bg-border/90"
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
