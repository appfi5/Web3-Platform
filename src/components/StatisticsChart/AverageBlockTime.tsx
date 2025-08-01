'use client';

import dayjs from 'dayjs';
import type * as echarts from 'echarts';

import { useIsMobile } from '~/hooks';
import { api } from '~/trpc/react';
import { localeNumberString } from '~/utils/utility';

import { ChartColor, DATA_ZOOM_CONFIG, Grid, GridThumbnail } from './config';
import { SmartChartPage } from './SmartChartPage';

export const AverageBlockTimeChart = ({ isThumbnail = false }: { isThumbnail?: boolean }) => {
  const { data: chartData = [], isLoading } = api.v0.statistics.averageBlockTimes.useQuery();

  const isMobile = useIsMobile();

  const toCSV = () =>
    chartData ? chartData.map((data) => [data.timestamp, data.avgBlockTimeDaily, data.avgBlockTimeWeekly]) : [];

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
    legend: !isThumbnail
      ? {
          top: 8,
          icon: 'roundRect',
          data: ['Daily Moving Average (s)', 'Weekly Moving Average (s)'],
        }
      : undefined,
    grid: isThumbnail ? GridThumbnail : { ...Grid, top: '10%' },
    dataZoom: isThumbnail ? [] : DATA_ZOOM_CONFIG,
    xAxis: [
      {
        name: isMobile || isThumbnail ? '' : 'Date',
        nameLocation: 'middle',
        nameGap: 30,
        type: 'category',
        boundaryGap: false,
        splitLine: {
          show: false,
        },
        axisLabel: {
          formatter: (value) => dayjs(value).format('YYYY/MM/DD'),
        },
      },
    ],
    yAxis: [
      {
        position: 'left',
        name: isMobile || isThumbnail ? '' : 'Daily Moving Average (s)',
        type: 'value',
        scale: true,
        nameTextStyle: {
          align: 'left',
        },
        axisLine: {
          lineStyle: {
            color: ChartColor.colors[0],
          },
        },
        axisLabel: {
          formatter: (value) => localeNumberString(value),
        },
      },
      {
        position: 'right',
        splitLine: { show: false },
        name: isMobile || isThumbnail ? '' : 'Weekly Moving Average (s)',
        type: 'value',
        scale: true,
        nameTextStyle: {
          align: 'right',
        },
        axisLine: {
          lineStyle: {
            color: ChartColor.colors[1],
          },
        },
        axisLabel: {
          formatter: (value) => localeNumberString(value),
        },
      },
    ],
    series: [
      {
        name: 'Daily Moving Average (s)',
        type: 'line',
        yAxisIndex: 0,
        symbol: isThumbnail ? 'none' : 'circle',
        symbolSize: 3,
        emphasis: {
          disabled: true,
        },
        encode: {
          x: 'timestamp',
          y: 'daily',
        },
      },
      {
        name: 'Weekly Moving Average (s)',
        type: 'line',
        yAxisIndex: 1,
        symbol: isThumbnail ? 'none' : 'circle',
        symbolSize: 3,
        emphasis: {
          disabled: true,
        },
        encode: {
          x: 'timestamp',
          y: 'weekly',
        },
      },
    ],
    dataset: {
      source: chartData.map((data) => [
        dayjs(data.timestamp * 1000).format('YYYY/MM/DD HH:mm:ss'),
        (Number(data.avgBlockTimeDaily) / 1000).toFixed(2),
        (Number(data.avgBlockTimeWeekly) / 1000).toFixed(2),
      ]),
      dimensions: ['timestamp', 'daily', 'weekly'],
    },
  };

  return (
    <SmartChartPage
      description="Average block intervals with daily & weekly smooth window"
      isLoading={isLoading}
      isThumbnail={isThumbnail}
      lastUpdatedTimestamp={chartData.at(-1)?.timestamp.toString() + '000'}
      option={option}
      title="Average Block Time"
      toCSV={toCSV}
    />
  );
};
