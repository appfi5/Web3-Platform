'use client';

import BigNumber from 'bignumber.js';
import dayjs from 'dayjs';
import type * as echarts from 'echarts';

import { useIsMobile } from '~/hooks';
import { api } from '~/trpc/react';
import { parseNumericAbbr, shannonToCkb, shannonToCkbDecimal } from '~/utils/utility';

import { ChartColor, DATA_ZOOM_CONFIG, Grid, GridThumbnail } from './config';
import { SmartChartPage } from './SmartChartPage';

export const NewDaoDepositChart = ({ isThumbnail = false }: { isThumbnail?: boolean }) => {
  const { data: chartData = [], isLoading } = api.v0.statistics.newDaoDeposit.useQuery();

  const isMobile = useIsMobile();

  const toCSV = () =>
    chartData
      ? chartData.map((data) => [
          data.createdAtUnixtimestamp,
          shannonToCkbDecimal(data.dailyDaoDeposit, 8),
          data.dailyDaoDepositorsCount,
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
      data: isThumbnail ? [] : ['Daily New Deposits', 'Daily New Depositors'],
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
        name: isMobile || isThumbnail ? '' : 'Daily New Deposits',
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
        name: isMobile || isThumbnail ? '' : 'Daily New Depositors',
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
        name: 'Daily New Deposits',
        type: 'line',
        yAxisIndex: 0,
        areaStyle: {
          color: ChartColor.areaColor,
        },
        symbol: isThumbnail ? 'none' : 'circle',
        symbolSize: 3,
        emphasis: {
          disabled: true,
        },
        encode: {
          x: 'timestamp',
          y: 'deposit',
        },
        tooltip: {
          valueFormatter: (value) => parseNumericAbbr(new BigNumber(value as unknown as string), 2),
        },
      },
      {
        name: 'Daily New Depositors',
        type: 'line',
        yAxisIndex: 1,
        symbol: isThumbnail ? 'none' : 'circle',
        symbolSize: 3,
        emphasis: {
          disabled: true,
        },
        encode: {
          x: 'timestamp',
          y: 'depositor',
        },
      },
    ],
    dataset: {
      source: chartData.map((data) => [
        dayjs(+data.createdAtUnixtimestamp * 1000).format('YYYY/MM/DD'),
        new BigNumber(shannonToCkb(data.dailyDaoDeposit)).toFixed(0),
        new BigNumber(data.dailyDaoDepositorsCount).toNumber().toString(),
      ]),
      dimensions: ['timestamp', 'deposit', 'depositor'],
    },
  };

  return (
    <SmartChartPage
      isLoading={isLoading}
      isThumbnail={isThumbnail}
      lastUpdatedTimestamp={chartData.at(-1)?.createdAtUnixtimestamp + '000'}
      option={option}
      thumbnailTitle="Daily Deposit"
      title="Daily Nervos DAO Deposit"
      toCSV={toCSV}
    />
  );
};
