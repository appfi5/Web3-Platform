'use client';

import BigNumber from 'bignumber.js';
import dayjs from 'dayjs';
import type * as echarts from 'echarts';

import { useIsMobile } from '~/hooks';
import { api } from '~/trpc/react';
import { parseNumericAbbr, shannonToCkb, shannonToCkbDecimal } from '~/utils/utility';

import { ChartColor, DATA_ZOOM_CONFIG, Grid, GridThumbnail } from './config';
import { SmartChartPage } from './SmartChartPage';

export const TotalDaoDepositChart = ({ isThumbnail = false }: { isThumbnail?: boolean }) => {
  const { data: chartData = [], isLoading } = api.v0.statistics.totalDaoDeposit.useQuery();

  const isMobile = useIsMobile();

  const toCSV = () =>
    chartData
      ? chartData.map((data) => [
          data.createdAtUnixtimestamp,
          shannonToCkbDecimal(data.totalDaoDeposit, 8),
          data.totalDepositorsCount,
        ])
      : [];

  const option: echarts.EChartsOption = {
    darkMode: true,
    color: ChartColor.colors,
    backgroundColor: ChartColor.backgroundColor,
    tooltip: !isThumbnail
      ? {
          trigger: 'axis',
          confine: true,
        }
      : undefined,
    legend: {
      top: 8,
      icon: 'roundRect',
      data: isThumbnail ? [] : ['Total Deposit', 'Accrued Total Depositors'],
    },
    grid: isThumbnail ? GridThumbnail : { ...Grid, top: '10%' },
    dataZoom: isThumbnail ? [] : DATA_ZOOM_CONFIG,
    xAxis: [
      {
        name: isMobile || isThumbnail ? '' : 'Date',
        nameLocation: 'middle',
        nameGap: 30,
        type: 'category',
        boundaryGap: false,
      },
    ],
    yAxis: [
      {
        position: 'left',
        name: isMobile || isThumbnail ? '' : 'Total Deposit',
        nameTextStyle: {
          align: 'left',
        },
        type: 'value',
        scale: true,
        axisLine: {
          lineStyle: {
            color: ChartColor.colors[0],
          },
        },
        axisLabel: {
          formatter: (value) => `${parseNumericAbbr(value)}`,
        },
      },
      {
        position: 'right',
        name: isMobile || isThumbnail ? '' : 'Accrued Total Depositors',
        nameTextStyle: {
          align: 'right',
        },
        type: 'value',
        scale: true,
        axisLine: {
          lineStyle: {
            color: ChartColor.colors[1],
          },
        },
        splitLine: { show: false },
        axisLabel: {
          formatter: (value) => parseNumericAbbr(new BigNumber(value)),
        },
      },
    ],
    series: [
      {
        name: 'Total Deposit',
        type: 'line',
        yAxisIndex: 0,
        symbol: isThumbnail ? 'none' : 'circle',
        symbolSize: 3,
        encode: {
          x: 'timestamp',
          y: 'deposit',
        },
        emphasis: {
          disabled: true,
        },
        tooltip: {
          valueFormatter(value) {
            return parseNumericAbbr(BigNumber(value as string), 2);
          },
        },
      },
      {
        name: 'Accrued Total Depositors',
        type: 'line',
        yAxisIndex: 1,
        symbol: isThumbnail ? 'none' : 'circle',
        symbolSize: 3,
        encode: {
          x: 'timestamp',
          y: 'depositor',
        },
        emphasis: {
          disabled: true,
        },
        tooltip: {
          valueFormatter(value) {
            return parseNumericAbbr(BigNumber(value as string), 2);
          },
        },
      },
    ],
    dataset: {
      source: chartData.map((data) => [
        dayjs(+data.createdAtUnixtimestamp * 1000).format('YYYY/MM/DD'),
        new BigNumber(shannonToCkb(data.totalDaoDeposit)).toFixed(0),
        new BigNumber(data.totalDepositorsCount).toString(),
      ]),
      dimensions: ['timestamp', 'deposit', 'depositor'],
    },
  };

  return (
    <SmartChartPage
      description="Shows the total DAO deposit and accrued depositors' address count."
      isLoading={isLoading}
      isThumbnail={isThumbnail}
      lastUpdatedTimestamp={chartData.at(-1)?.createdAtUnixtimestamp + '000'}
      option={option}
      thumbnailTitle="Total Deposit"
      title="Total Nervos DAO Deposit & Accrued Total Depositors"
      toCSV={toCSV}
    />
  );
};
