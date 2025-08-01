'use client';

import BigNumber from 'bignumber.js';
import dayjs from 'dayjs';
import type * as echarts from 'echarts';

import { useIsMobile } from '~/hooks';
import { api } from '~/trpc/react';
import { parseNumericAbbr, shannonToCkb, shannonToCkbDecimal } from '~/utils/utility';

import { ChartColor, DATA_ZOOM_CONFIG, Grid, GridThumbnail } from './config';
import { SmartChartPage } from './SmartChartPage';

export const TotalSupplyChart = ({ isThumbnail = false }: { isThumbnail?: boolean }) => {
  const { data: chartData = [], isLoading } = api.v0.statistics.totalSupply.useQuery();

  const isMobile = useIsMobile();

  const toCSV = () =>
    chartData
      ? chartData.map((data) => [
          data.createdAtUnixtimestamp,
          shannonToCkbDecimal(data.circulatingSupply, 8),
          shannonToCkbDecimal(data.lockedCapacity, 8),
          shannonToCkbDecimal(data.burnt, 8),
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
      icon: 'roundRect',
      data: isThumbnail ? [] : ['Circulating Supply', 'Unvested', 'Burnt'],
    },
    grid: isThumbnail ? GridThumbnail : Grid,
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
        name: 'Circulating Supply',
        type: 'line',
        yAxisIndex: 0,
        symbol: isThumbnail ? 'none' : 'circle',
        symbolSize: 3,
        stack: 'sum',
        areaStyle: {
          color: ChartColor.colors[0],
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
      {
        name: 'Unvested',
        type: 'line',
        yAxisIndex: 0,
        symbol: isThumbnail ? 'none' : 'circle',
        symbolSize: 3,
        stack: 'sum',
        areaStyle: {
          color: ChartColor.colors[1],
        },
        emphasis: {
          disabled: true,
        },
        encode: {
          x: 'timestamp',
          y: 'locked',
        },
        tooltip: {
          valueFormatter(value) {
            return parseNumericAbbr(BigNumber(value as string), 2);
          },
        },
      },
      {
        name: 'Burnt',
        type: 'line',
        yAxisIndex: 0,
        symbol: isThumbnail ? 'none' : 'circle',
        symbolSize: 3,
        stack: 'sum',
        areaStyle: {
          color: ChartColor.colors[2],
        },
        emphasis: {
          disabled: true,
        },
        encode: {
          x: 'timestamp',
          y: 'burnt',
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
        new BigNumber(shannonToCkb(data.circulatingSupply)).toFixed(0),
        new BigNumber(shannonToCkb(data.lockedCapacity)).toFixed(0),
        new BigNumber(shannonToCkb(data.burnt)).toFixed(0),
      ]),
      dimensions: ['timestamp', 'circulating', 'locked', 'burnt'],
    },
  };

  return (
    <SmartChartPage
      description="Total supply equals the sum of the primary issuance and the secondary issuance; \nThe burnt part equals the sum of the 25% genesis issuance burnt and the burnt portion in the secondary issuance;\nThe unvested part equals the portion that locked by time lock, which will be released gradually by predefined schedule.\nThe circulating supply is equal to the total supply minus the burnt part and the unvested part."
      isLoading={isLoading}
      isThumbnail={isThumbnail}
      lastUpdatedTimestamp={chartData.at(-1)?.createdAtUnixtimestamp + '000'}
      option={option}
      title="Total Supply"
      toCSV={toCSV}
    />
  );
};
