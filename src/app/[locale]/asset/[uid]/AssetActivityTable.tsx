'use client';
import { DropdownMenu, DropdownMenuItem } from '@radix-ui/react-dropdown-menu';
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
import { type inferRouterInputs } from '@trpc/server';
import { usePrevious } from '@uidotdev/usehooks';
import { Filter } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import React, { useEffect, useMemo, useState } from 'react';
import { isDeepEqual } from 'remeda';

import AddressAvatar from '~/components/AddressAvatar';
import HashViewer from '~/components/HashViewer';
import { TxCountBadge } from '~/components/TxCountBadge';
import { Button } from '~/components/ui/button';
import { DropdownMenuContent, DropdownMenuTrigger } from '~/components/ui/dropdown-menu';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import Pagination from '~/components/ui/pagination';
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table';
import { cn } from '~/lib/utils';
import { type AppRouter } from '~/server/api/root';
import { type PickPaginationOutputResult } from '~/server/api/routers/zod-helper';
import { api, type RouterOutputs } from '~/trpc/react';
import { trunkLongStr } from '~/utils/utility';

import { AssetValue } from '../AssetValue';
import { Search } from '../Search';
import { SortSwitch } from '../SortSwitch';
import { FromNow } from './FromNow';

const columns: ColumnDef<PickPaginationOutputResult<RouterOutputs['v0']['activity']['list']>>[] = [
  {
    accessorKey: 'txHash',
    enableSorting: false,
    header: ({ column }) => {
      return (
        <div className="flex items-center gap-2">
          <div>Tx Hash</div>
          <Search onChange={column.setFilterValue} />
        </div>
      );
    },
    cell: ({ row }) => (
      <Link
        className="block text-primary min-w-40 inconsolata"
        href={`/transaction/${row.original.txHash}`}
        prefetch={false}
      >
        <HashViewer formattedValue={trunkLongStr(row.original.txHash, 8, 8)} value={row.original.txHash} />
      </Link>
    ),
  },
  {
    accessorKey: 'action',
    enableSorting: false,
    header: () => <div className="flex items-center">Action</div>,
  },
  {
    accessorKey: 'timestamp',
    header: () => <div className="flex items-center">Time</div>,
    cell: ({ row }) => <FromNow timestamp={row.original.time} />,
  },
  {
    accessorKey: 'from',
    enableSorting: false,
    header: ({ table }) => (
      <AddressFilter
        onChange={({ from, to, condition }) => {
          table.setColumnFilters([
            { id: 'fromAddress', value: from },
            { id: 'toAddress', value: to },
            { id: 'addressFilterOperator', value: condition },
          ]);
        }}
      />
    ),
    cell: ({ row }) => {
      const { from: address, fromCount: count, txHash } = row.original;

      return (
        <div className="text-primary flex gap-1 items-center">
          <AddressAvatar address={address ?? ''} />
          <Link href={`/address/${address}`}>
            <HashViewer formattedValue={trunkLongStr(address, 4, 4)} value={address ?? ''} />
          </Link>
          {count > 1 && <TxCountBadge count={count} hash={txHash} />}
        </div>
      );
    },
  },

  {
    accessorKey: 'to',
    enableSorting: false,
    header: () => <div className="flex items-center min-w-40">To</div>,
    cell: ({ row }) => {
      const { to: address, toCount: count, txHash } = row.original;

      return (
        <div className="text-primary flex gap-1 items-center">
          <Image alt="to" className="mr-3" height={20} src="/img/to.svg" width={20} />
          <AddressAvatar address={address ?? ''} />
          <Link href={`/address/${address}`}>
            <HashViewer formattedValue={trunkLongStr(address, 4, 4)} value={address ?? ''} />
          </Link>
          {count > 1 && <TxCountBadge count={count} hash={txHash} />}
        </div>
      );
    },
  },
  {
    header: 'value',
    accessorKey: 'amount',
    cell: ({ row }) => (
      <div>
        <AssetValue value={row.original.amount} />
      </div>
    ),
  },
  {
    header: 'volume',
    accessorKey: 'amountUsd',
    enableSorting: true,
  },
];

export function AssetActivityTable({ assetId }: { assetId: string }) {
  const [pagination, setPagination] = useState<{ pageIndex: number; pageSize: number }>({ pageIndex: 0, pageSize: 10 });
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const filters = useMemo(
    () =>
      columnFilters.reduce(
        (queryParams, item) => Object.assign(queryParams, { [item.id]: item.value }),
        {} as Omit<inferRouterInputs<AppRouter>['v0']['activity']['list'], 'assetId'>,
      ),
    [columnFilters],
  );
  const [orderBy, setOrderBy] = useState<
    Pick<inferRouterInputs<AppRouter>['v0']['activity']['list'], 'orderKey' | 'orderDirection'>
  >({});
  const previousFilters = usePrevious(filters);
  const previousOrderBy = usePrevious(orderBy);

  useEffect(() => {
    if (!isDeepEqual(previousFilters, filters) || !isDeepEqual(previousOrderBy, orderBy)) {
      setPagination({ pageIndex: 0, pageSize: 10 });
    }
  }, [previousFilters, filters, previousOrderBy, orderBy]);

  const query = api.v0.activity.list.useQuery(
    {
      ...filters,
      assetId,
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      ...orderBy,
    },
    {
      refetchOnMount: false,
      gcTime: 0,
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
    onColumnFiltersChange: setColumnFilters,
    manualPagination: true,
    manualFiltering: true,
    rowCount: query.data?.total,
    //no need to pass pageCount or rowCount with client-side pagination as it is calculated automatically
    state: { pagination, columnFilters },
  });

  return (
    <div className="bg-muted rounded-md p-2 pb-6 relative flex flex-col min-h-[500px]">
      <Table
        className={cn({ 'h-full': table.getRowModel().rows?.length >= pagination.pageSize })}
        wrapperClassName="grow"
      >
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead className="p-1 h-8" key={header.id}>
                    <div className="flex items-center">
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() ? (
                        <SortSwitch
                          onChange={(order) => {
                            if (order === 'default') {
                              setOrderBy({});
                              return;
                            }
                            setOrderBy({
                              orderKey:
                                header.id as keyof inferRouterInputs<AppRouter>['v0']['activity']['list']['orderKey'],
                              orderDirection: order,
                            });
                          }}
                        />
                      ) : null}
                    </div>
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

      {!query.isLoading && table.getRowModel().rows?.length !== 0 && (
        <div className="w-full flex justify-center mt-4">
          <Pagination
            current={table.getState().pagination.pageIndex + 1}
            onChangePage={(page) => setPagination((pre) => ({ ...pre, pageIndex: page - 1 }))}
            total={table.getPageCount()}
          />
        </div>
      )}
    </div>
  );
}

const AddressFilter = ({
  onChange,
}: {
  onChange: (setting: { condition: 'and' | 'or'; from?: string; to?: string }) => void;
}) => {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [condition, setCondition] = useState<'and' | 'or'>('and');

  return (
    <div className="flex items-center min-w-40">
      From{' '}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Filter className="ml-1 h-4 w-4 text-muted-foreground cursor-pointer" role="button" />
        </DropdownMenuTrigger>

        <DropdownMenuContent className="w-56 p-4 rounded-lg">
          <div className="text-lg">Filter</div>
          <div className="text-secondary">From</div>
          <Input className="rounded-lg w-full" onChange={(e) => setFrom(e.target.value)} value={from} />

          <RadioGroup
            className="my-2 gap-4"
            onValueChange={(value: 'and' | 'or') => setCondition(value)}
            orientation="horizontal"
            value={condition}
          >
            <div className="flex items-center space-x-1">
              <RadioGroupItem id="fromAndToCondition-and" value="and" />
              <Label htmlFor="fromAndToCondition-and">And</Label>
            </div>
            <div className="flex items-center space-x-1">
              <RadioGroupItem id="fromAndToCondition-or" value="or" />
              <Label htmlFor="fromAndToCondition-or">Or</Label>
            </div>
          </RadioGroup>

          <div className="text-secondary">To</div>
          <Input className="rounded-sm w-full" onChange={(e) => setTo(e.target.value)} value={to} />

          <DropdownMenuItem>
            <Button className="w-full mt-4" onClick={() => onChange({ condition, from, to })}>
              Apply
            </Button>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
