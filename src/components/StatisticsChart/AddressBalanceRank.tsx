'use client';

import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import type * as echarts from 'echarts';
import Link from 'next/link';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table';
import { useIsMobile } from '~/hooks';
import { api, type RouterOutputs } from '~/trpc/react';
import { localeNumberString, parseNumericAbbr, shannonToCkb, shannonToCkbDecimal } from '~/utils/utility';

import { assertIsArray, ChartColor, DATA_ZOOM_CONFIG, Grid, GridThumbnail, tooltipColor } from './config';
import { SmartChartPage } from './SmartChartPage';

type ChartData = RouterOutputs['v0']['statistics']['addressBalanceRanking']['addressBalanceRanking'][1];

const getAddressWithRanking = (statisticAddressBalanceRanks: ChartData[], ranking?: string) => {
  if (!ranking) return '';
  const addressBalanceRank = statisticAddressBalanceRanks.find((rank) => rank.ranking === ranking);
  return addressBalanceRank
    ? `${addressBalanceRank.address.slice(0, 8)}...${addressBalanceRank.address.slice(-8)}`
    : '';
};

const columns: ColumnDef<ChartData>[] = [
  {
    accessorKey: 'ranking',
    header: 'Rank',
  },
  {
    accessorKey: 'address',
    header: 'Address',
    cell: ({ row }) => (
      <Link className="text-primary" href={`/address/${row.original.address}`} prefetch={false}>
        {row.original.address.slice(0, 8)}...{row.original.address.slice(-8)}
      </Link>
    ),
  },
  {
    accessorKey: 'balance',
    header: 'Balance(CKB)',
    cell: ({ row }) => {
      const [int, decimal] = shannonToCkb(row.original.balance).split('.');
      return (
        <div>
          {localeNumberString(int ?? 0)}
          <span className="text-muted-foreground">.{decimal ?? 0}</span>
        </div>
      );
    },
  },
];

export const AddressBalanceRankChart = ({ isThumbnail = false }: { isThumbnail?: boolean }) => {
  const {
    data = {
      addressBalanceRanking: [],
      lastUpdatedTimestamp: '0',
    },
    isLoading,
  } = api.v0.statistics.addressBalanceRanking.useQuery();
  const isMobile = useIsMobile();

  const { addressBalanceRanking, lastUpdatedTimestamp } = data;

  const table = useReactTable({
    data: addressBalanceRanking,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const toCSV = () =>
    addressBalanceRanking
      ? addressBalanceRanking.map((data) => [data.ranking, shannonToCkbDecimal(data.balance, 8)])
      : [];

  const option: echarts.EChartsOption = {
    darkMode: true,
    color: ChartColor.colors,
    backgroundColor: ChartColor.backgroundColor,
    tooltip: !isThumbnail
      ? {
          trigger: 'axis',
          confine: true,
          formatter: (dataList) => {
            assertIsArray(dataList);
            const widthSpan = (value: string) => `<span style="display:inline-block;">${value}:</span>`;

            let result = `<div>${tooltipColor('#333333')}${widthSpan('Address')} ${getAddressWithRanking(
              addressBalanceRanking,
              dataList[0]!.name,
            )}</div>`;
            result += `<div>${tooltipColor(ChartColor.colors[0]!)}${widthSpan('Balance')} \
          ${localeNumberString(dataList[0]!.data as string)} CKB</div>`;
            result += `<div>${tooltipColor(ChartColor.colors[0]!)}${widthSpan('Rank')} ${dataList[0]!.name}</div>`;
            return result;
          },
        }
      : undefined,
    grid: isThumbnail ? GridThumbnail : Grid,
    dataZoom: isThumbnail ? [] : DATA_ZOOM_CONFIG,
    xAxis: [
      {
        name: isMobile || isThumbnail ? '' : 'Rank',
        nameLocation: 'middle',
        nameGap: 30,
        type: 'category',
        boundaryGap: false,
        data: addressBalanceRanking.map((data) => data.ranking),
      },
    ],
    yAxis: [
      {
        position: 'left',
        name: isMobile || isThumbnail ? '' : `Balance Ranking (Log)`,
        type: 'log',
        logBase: 10,
        axisLabel: {
          formatter: (value) => `${parseNumericAbbr(value)}`,
        },
      },
    ],
    series: [
      {
        name: 'Balance Ranking',
        type: 'bar',
        yAxisIndex: 0,
        barWidth: 8,
        data: addressBalanceRanking.map((data) => shannonToCkb(data.balance)),
      },
    ],
  };

  return (
    <SmartChartPage
      description="The first 50 addresses that have the most amount of CKB."
      isLoading={isLoading}
      isThumbnail={isThumbnail}
      lastUpdatedTimestamp={lastUpdatedTimestamp + '000'}
      option={option}
      sidebar={
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                className="max-md:flex max-md:flex-wrap max-md:items-center max-md:justify-between"
                key={headerGroup.id}
              >
                {headerGroup.headers.map((header) => (
                  <TableHead className="p-1 h-8" key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody className="relative max-md:hidden">
            {table.getRowModel().rows?.map((row) => (
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
      }
      title="Top 50 Holders"
      toCSV={toCSV}
    />
  );
};
