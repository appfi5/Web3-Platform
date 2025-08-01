'use client';
import { keepPreviousData } from '@tanstack/react-query';
import {
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import dayjs from 'dayjs';
import { Filter } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '~/components/ui/dropdown-menu';
import Pagination from '~/components/ui/pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table';
import { useRouter } from '~/i18n/navigation';
import { cn } from '~/lib/utils';
import { type PickPaginationOutputResult } from '~/server/api/routers/zod-helper';
import { type RouterOutputs } from '~/trpc/react';
import { api } from '~/trpc/react';
import { cssstring } from '~/utils/cssstring';

import { formatCurrency, formatNumber } from './format';
import { SortSwitch } from './SortSwitch';

type OrderByField = 'price' | 'priceChange24h' | 'marketCap' | 'tradingVolume24h' | 'transactionCount' | 'holderCount';
type OrderByTuple = [OrderByField, 'asc' | 'desc'];

const columns: ColumnDef<PickPaginationOutputResult<RouterOutputs['v0']['asset']['list']>>[] = [
  {
    accessorKey: 'index',
    header: '#',
    enableSorting: false,
    cell: ({ row }) => <Link href={`/asset/${row.original.id}`}>{row.index + 1}</Link>,
  },
  {
    accessorKey: 'name',
    header: 'Name',
    enableSorting: false,
    cell: ({ row }) => (
      <div className="flex items-center">
        <Image alt={row.original.name ?? ''} className="mr-2" height={24} src={row.original.icon ?? ''} width={24} />
        {row.original.name}
      </div>
    ),
  },
  {
    accessorKey: 'tags',
    enableSorting: false,
    header: ({ column }) => {
      return (
        <div className="flex items-center">
          Tags&nbsp;
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Filter className="ml-1 h-4 w-4 text-muted-foreground cursor-pointer" role="button" />
            </DropdownMenuTrigger>

            <DropdownMenuContent className="w-56 p-4 rounded-lg">
              <TagFilter
                onChange={(value) => column.setFilterValue(value)}
                value={(column.getFilterValue() as string[] | undefined) ?? []}
              />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
    cell: ({ row }) => (
      <div className="flex items-center">
        {row.original.tags.map((tag) => (
          <span
            className="mr-1 md:mr-2 py-0.5 px-2 bg-accent text-nowrap rounded-sm text-xs"
            key={tag.label}
            style={cssstring(tag.style ?? '')}
          >
            {tag.label}
          </span>
        ))}
      </div>
    ),
  },
  {
    accessorKey: 'price',
    enableSorting: true,
    header: 'Price',
    cell: ({ row }) => formatCurrency(row.original.price),
  },
  {
    accessorKey: 'priceChange24h',
    enableSorting: true,
    header: '24H Change',
    cell: ({ row }) => (
      <span
        className={cn({
          ['text-rise']: row.original.priceChange24h != null && row.original.priceChange24h >= 0,
          ['text-down']: row.original.priceChange24h != null && row.original.priceChange24h < 0,
        })}
      >
        {formatNumber(row.original.priceChange24h, { postfix: '%' })}
      </span>
    ),
  },
  {
    accessorKey: 'marketCap',
    enableSorting: true,
    header: 'Market cap',
    cell: ({ row }) => formatCurrency(row.original.marketCap, { average: true }),
  },
  {
    accessorKey: 'tradingVolume24h',
    enableSorting: true,
    header: 'Volume (24H)',
    cell: ({ row }) => formatCurrency(row.original.tradingVolume24h, { average: true }),
  },
  {
    accessorKey: 'transactionCount',
    enableSorting: true,
    header: 'Txs (24H)',
    cell: ({ row }) => formatNumber(row.original.transactionCount),
  },
  {
    accessorKey: 'holderCount',
    enableSorting: true,
    header: 'Holders',
    cell: ({ row }) => formatNumber(row.original.holderCount),
  },
  {
    accessorKey: 'firstFoundTime',
    enableSorting: false,
    header: 'Age',
    cell: ({ row }) => {
      return row.original.firstFoundTime ? dayjs(row.original.firstFoundTime).format('YYYY-MM-DD HH:mm:ss') : '-';
    },
  },
];

export function AssetDataTable() {
  const router = useRouter();
  const [pagination, setPagination] = useState<{ pageIndex: number; pageSize: number }>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [orderBy, setOrderBy] = useState<OrderByTuple>();
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const tags = columnFilters.find((item) => item.id === 'tags')?.value as string[] | undefined;

  const query = api.v0.asset.list.useQuery(
    {
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      orderKey: orderBy?.[0],
      orderDirection: orderBy?.[1],
      tags: (tags?.length ?? 0) > 0 ? tags : undefined,
    },
    { refetchOnMount: false, placeholderData: keepPreviousData },
  );

  const table = useReactTable({
    data: query.data?.result ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onPaginationChange: setPagination,
    onColumnFiltersChange: setColumnFilters,
    manualPagination: true,
    manualFiltering: true,
    rowCount: query.data?.total ?? 0,
    state: { pagination, columnFilters },
  });

  return (
    <>
      <Table className="border-separate border-spacing-y-2">
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead key={header.id}>
                    <div className="flex items-center">
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (
                        <SortSwitch
                          onChange={(order: 'asc' | 'desc' | 'default') => {
                            if (order === 'default') {
                              setOrderBy(undefined);
                              return;
                            }
                            const field = header.column.id as OrderByField;
                            setOrderBy([field, order]);
                          }}
                        />
                      )}
                    </div>
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody className="relative">
          {table.getRowModel().rows?.length
            ? table.getRowModel().rows.map((row) => (
                <TableRow
                  className="border-0 odd:bg-[#171A1F] even:bg-[#1C2024] cursor-pointer"
                  data-state={row.getIsSelected() && 'selected'}
                  key={row.id}
                  onClick={() => router.push(`/asset/${row.original.id}`)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell className="first:rounded-l-md last:rounded-r-md" key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : query.isSuccess && (
                <TableRow>
                  <TableCell className="h-24 text-center" colSpan={columns.length}>
                    No results.
                  </TableCell>
                </TableRow>
              )}
        </TableBody>
      </Table>

      {!query.isLoading && table.getRowModel().rows?.length !== 0 && (
        <div className="w-full flex justify-center mt-4">
          <Pagination
            current={table.getState().pagination.pageIndex + 1}
            onChangePage={(page) => setPagination((pre) => ({ ...pre, pageIndex: page - 1 }))}
            total={table.getPageCount()}
          />
        </div>
      )}
    </>
  );
}

const TAGS = [
  { groupName: 'Protocol', tags: ['RGB++', 'Spore'] },
  { groupName: 'Script', tags: ['xUDT', 'sUDT'] },
  { groupName: 'Category', tags: ['NFT', 'FT', 'Inscription'] },
  { groupName: 'Network', tags: ['Layer1', 'Layer2'] },
];

const TagFilter = ({ value, onChange }: { value: string[]; onChange: (value: string[]) => void }) => {
  return (
    <div className="flex flex-col gap-2">
      {TAGS.map(({ groupName, tags }) => (
        <div key={groupName}>
          <div className="text-secondary my-1">{groupName}</div>
          <div className="flex gap-2 flex-wrap max-w-40">
            {tags.map((tag) => {
              const activity = value.includes(tag);
              return (
                <div
                  className={cn(
                    'bg-[#23272C] text-sm py-0.5 px-2 inline-block text-white rounded-md',
                    activity && ['text-primary', 'border-primary', 'border'],
                  )}
                  key={tag}
                  onClick={() => onChange(activity ? value.filter((v) => v !== tag) : value.concat(tag))}
                  role="button"
                >
                  {tag}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
