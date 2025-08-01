'use client';

import BigNumber from 'bignumber.js';
import dayjs from 'dayjs';
import type * as echarts from 'echarts';

import { useIsMobile } from '~/hooks';
import { api } from '~/trpc/react';
import { parseNumericAbbr, shannonToCkb, shannonToCkbDecimal } from '~/utils/utility';

import { ChartColor, DATA_ZOOM_CONFIG, Grid, GridThumbnail } from './config';
import { SmartChartPage } from './SmartChartPage';

export const LiquidityChart = ({ isThumbnail = false }: { isThumbnail?: boolean }) => {
  const { data: chartData = [], isLoading } = api.v0.statistics.liquidity.useQuery();

  const isMobile = useIsMobile();

  const toCSV = () =>
    chartData
      ? chartData.map((data) => [
          data.createdAtUnixtimestamp,
          shannonToCkbDecimal(data.circulatingSupply, 8),
          shannonToCkbDecimal(data.daoDeposit, 8),
          shannonToCkbDecimal(data.liquidity, 8),
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
      data: isThumbnail ? [] : ['Tradable', 'Nervos DAO Deposit', 'Circulating Supply'],
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
        type: 'value',
        axisLine: {
          lineStyle: {
            color: ChartColor.colors[0],
          },
        },
        axisLabel: {
          formatter: (value) => parseNumericAbbr(new BigNumber(value)),
        },
      },
    ],
    series: [
      {
        name: 'Tradable',
        type: 'line',
        yAxisIndex: 0,
        symbol: isThumbnail ? 'none' : 'circle',
        symbolSize: 3,
        stack: 'sum',
        areaStyle: {
          origin: 'start',
          color: ChartColor.colors[0],
        },
        emphasis: {
          disabled: true,
        },
        encode: {
          x: 'timestamp',
          y: 'liquidity',
        },
        tooltip: {
          valueFormatter(value) {
            return parseNumericAbbr(BigNumber(value as string), 2);
          },
        },
      },
      {
        name: 'Nervos DAO Deposit',
        type: 'line',
        yAxisIndex: 0,
        symbol: isThumbnail ? 'none' : 'circle',
        symbolSize: 3,
        stack: 'sum',
        areaStyle: {
          origin: 'start',
          color: ChartColor.colors[1],
        },
        emphasis: {
          disabled: true,
        },
        encode: {
          x: 'timestamp',
          y: 'deposit',
        },
        tooltip: {
          valueFormatter(value) {
            return parseNumericAbbr(BigNumber(value as string), 2);
          },
        },
      },
      {
        name: 'Circulating Supply',
        type: 'line',
        yAxisIndex: 0,
        symbol: isThumbnail ? 'none' : 'circle',
        symbolSize: 3,
        areaStyle: {
          color: ChartColor.colors[2],
        },
        emphasis: {
          disabled: true,
        },
        encode: {
          x: 'timestamp',
          y: 'circulating',
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
        shannonToCkb(data.liquidity),
        shannonToCkb(data.daoDeposit),
        shannonToCkb(data.circulatingSupply),
      ]),
      dimensions: ['timestamp', 'liquidity', 'deposit', 'circulating'],
    },
  };

  return (
    <SmartChartPage
      isLoading={isLoading}
      isThumbnail={isThumbnail}
      lastUpdatedTimestamp={chartData.at(-1)?.createdAtUnixtimestamp + '000'}
      option={option}
      title="Liquidity"
      toCSV={toCSV}
    />
  );
};
