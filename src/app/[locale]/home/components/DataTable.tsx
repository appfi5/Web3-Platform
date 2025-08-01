'use client';

import {
  flexRender,
  getCoreRowModel,
  type PaginationState,
  type Table as TableType,
  useReactTable,
} from '@tanstack/react-table';
import { useMediaQuery } from '@uidotdev/usehooks';
import Image from 'next/image';
import { type ReactNode, useEffect, useState } from 'react';

import { Button } from '~/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table';
import { cn } from '~/lib/utils';
import { api } from '~/trpc/react';
import { dayjs, formatWithDecimal, localeNumberString, scriptToAddress } from '~/utils/utility';

import { columns, type Transaction } from './columns';
import Filter, { type FilterParams } from './Filter';
import NoDataIcon from './NoData.svg';
import Search from './Search';

const PAGE_SIZE = 18;

const Pagination = ({ table, className }: { table: TableType<Transaction>; className?: string }): ReactNode => {
  return (
    <div className={cn('flex items-center justify-end space-x-2 gap-6', className)}>
      <div className="flex gap-[10px] items-center">
        <Button
          className="hover:bg-transparent"
          disabled={!table.getCanPreviousPage()}
          onClick={() => table.previousPage()}
          variant="ghost"
        >
          <Image alt="left" height={16} src="/img/left-arrow.svg" width={16} />
        </Button>

        <Button
          className="bg-accent text-accent-foreground hover:bg-accent/80"
          onClick={() => table.firstPage()}
          size="sm"
          variant="secondary"
        >
          First
        </Button>
      </div>

      <div className="text-[13px] text-secondary">
        {table.getState().pagination.pageIndex + 1} / {table.getPageCount().toLocaleString()}
      </div>

      <div className="flex gap-[10px] items-center">
        <Button
          className="bg-accent text-accent-foreground hover:bg-accent/80"
          onClick={() => table.lastPage()}
          size="sm"
          variant="secondary"
        >
          Last
        </Button>
        <Button
          className="hover:bg-transparent"
          disabled={!table.getCanNextPage()}
          onClick={() => table.nextPage()}
          variant="ghost"
        >
          <Image alt="right" height={16} src="/img/right-arrow.svg" width={16} />
        </Button>
      </div>
    </div>
  );
};

export default function DataTable() {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  });
  const [txList, setTxList] = useState<Transaction[]>([]);
  const [rowCount, setRowCount] = useState(0);
  const [filter, setFilter] = useState<FilterParams>({
    time: { from: dayjs().subtract(1, 'M').toDate(), to: new Date() },
  });

  const { data, isSuccess } = api.home.getTxList.useQuery(
    {
      pagination: { page: pagination.pageIndex + 1, pageSize: pagination.pageSize },
      filter: {
        ...filter,
        volume: filter.volume ?? ['1000'],
        time: {
          from: dayjs(filter.time.from).startOf('day').toDate(),
          to: dayjs(filter.time.to).endOf('day').toDate(),
        },
      },
    },
    {
      refetchInterval: 5000,
    },
  );

  useEffect(() => {
    if (isSuccess) {
      const list = data.data.map((item) => {
        const fromAddress = scriptToAddress(item.from ?? '');
        const toAddress = scriptToAddress(item.to ?? '');
        return {
          id: `${item.index}`,
          tx: {
            hash: item.hash,
            time: dayjs(item.committedTime).fromNow(),
            assetId: item.assetId,
            network: item.network,
          },
          from: {
            address: fromAddress,
            count: item.inputCount,
            hash: item.hash,
          },
          to: {
            address: toAddress,
            count: item.outputCount,
            hash: item.hash,
          },
          amount: {
            value: localeNumberString(formatWithDecimal(item.value, 8)),
            icon: item.assetInfo?.icon ?? null,
            symbol: item.assetInfo?.symbol ?? null,
          },
          volume: localeNumberString(item.volume || '0', 2),
        };
      });

      setRowCount(data.pagination.total);

      setTxList(list);
    }
  }, [isSuccess, data]);

  const isScreenLarge = useMediaQuery('only screen and (min-width : 1600px)');

  const table = useReactTable({
    data: txList,
    rowCount,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    onPaginationChange: setPagination,
    meta: {
      isScreenLarge,
    },
    state: {
      pagination,
    },
  });

  const handleChange = (params: FilterParams) => {
    setPagination({
      pageIndex: 0,
      pageSize: PAGE_SIZE,
    });
    setFilter(params);
  };

  return (
    <div>
      <div className="flex justify-between items-center">
        <p className="text-[13px] text-secondary my-2">Transaction</p>
        <Pagination className="hidden home-mobile:flex" table={table} />
        <div className="flex gap-4">
          <Search
            onChange={(v) => {
              setPagination({
                pageIndex: 0,
                pageSize: PAGE_SIZE,
              });
              setFilter({ ...v, time: { from: dayjs().subtract(1, 'M').toDate(), to: new Date() } });
            }}
          />
          <Filter onChange={handleChange} />
        </div>
      </div>

      <div className="block home-mobile:hidden mt-3">
        {table.getRowModel().rows?.length ? (
          table.getRowModel().rows.map((row) => (
            <div className="bg-[#262728] rounded-[8px] p-3 mt-2" key={row.id}>
              {row
                .getVisibleCells()
                .slice(0, 1)
                .map((cell) => (
                  <div className="mb-4 last:mb-0" key={cell.id}>
                    <p className="text-secondary text-[13px]">Time</p>
                    <div className="mt-1">{flexRender(cell.column.columnDef.cell, cell.getContext())}</div>
                  </div>
                ))}
              <div className="flex gap-3">
                {row
                  .getVisibleCells()
                  .slice(1, 3)
                  .map((cell, index) => (
                    <div className="mb-4 last:mb-0" key={cell.id}>
                      <p className="text-secondary text-[13px]">{['From', 'To'][index]}</p>
                      <div className="mt-1">{flexRender(cell.column.columnDef.cell, cell.getContext())}</div>
                    </div>
                  ))}
              </div>
              {row
                .getVisibleCells()
                .slice(3)
                .map((cell, index) => (
                  <div className="mb-4 last:mb-0" key={cell.id}>
                    <p className="text-secondary text-[13px]">{['Amount', 'Volume'][index]}</p>
                    <div className="mt-1">{flexRender(cell.column.columnDef.cell, cell.getContext())}</div>
                  </div>
                ))}
            </div>
          ))
        ) : (
          <div className="h-[610px] py-[100px] flex flex-col items-center col-span-full">
            <NoDataIcon />
            <p className="text-gray-400">No Data</p>
          </div>
        )}
      </div>

      <Table className="hidden home-mobile:table">
        <TableHeader className="[&_tr]:border-none">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead className="py-2 text-[13px] px-0 [&>*]:px-1 2xl:[&>*]:px-2" key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody className="[&_tr]:border-none">
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                className="border-0 odd:bg-[#171A1F] even:bg-[#1C2024]"
                data-state={row.getIsSelected() && 'selected'}
                key={row.id}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell className="p-2.5 px-0 [&>*]:px-1 2xl:[&>*]:px-2 text-[14px]" key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell className="h-24 text-center" colSpan={columns.length}>
                <div className="h-[610px] py-[100px] flex flex-col items-center">
                  <NoDataIcon />
                  <p>No Data</p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <div className="home-mobile:hidden flex justify-center mt-3">
        <Pagination table={table} />
      </div>
    </div>
  );
}
