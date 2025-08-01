'use client';

import dayjs from 'dayjs';
import type * as echarts from 'echarts';

import { useIsMobile } from '~/hooks';
import { api } from '~/trpc/react';

import { ChartColor, DATA_ZOOM_CONFIG, Grid, GridThumbnail } from './config';
import { SmartChartPage } from './SmartChartPage';

export const CkbHodlWaveChart = ({ isThumbnail = false }: { isThumbnail?: boolean }) => {
  const { data: chartData = [], isLoading } = api.v0.statistics.ckbHodlWave.useQuery();
  const isMobile = useIsMobile();

  const toCSV = () =>
    chartData
      ? chartData.map((data) => [
          data.createdAtUnixtimestamp,
          data.ckbHodlWave.latestDay,
          data.ckbHodlWave.dayToOneWeek,
          data.ckbHodlWave.oneWeekToOneMonth,
          data.ckbHodlWave.threeMonthsToSixMonths,
          data.ckbHodlWave.sixMonthsToOneYear,
          data.ckbHodlWave.oneYearToThreeYears,
          data.ckbHodlWave.overThreeYears,
          data.holderCount,
        ])
      : [];

  const option: echarts.EChartsOption = {
    color: ChartColor.colors,
    backgroundColor: ChartColor.backgroundColor,
    tooltip: !isThumbnail
      ? {
          trigger: 'axis',
          confine: true,
          axisPointer: {
            type: 'cross',
            label: {
              show: false,
            },
          },
        }
      : undefined,
    legend: {
      data: isThumbnail
        ? []
        : ['timestamp', '24h', '1d-1w', '1w-1m', '1m-3m', '3m-6m', '6m-1y', '1y-3y', '> 3y', 'Holder Count'],
    },
    grid: isThumbnail ? GridThumbnail : { ...Grid, top: isMobile ? 80 : 40 },
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
        max: 100,
        axisLine: {
          lineStyle: {
            color: ChartColor.colors[0],
          },
        },
        axisLabel: {
          formatter: (value) => `${value}%`,
        },
      },
      {
        position: 'right',
        type: 'value',
        name: 'Holder Count',
        axisLine: {
          lineStyle: {
            color: ChartColor.colors[1],
          },
          onZero: false,
        },
      },
    ],

    series: [
      {
        name: '24h',
        type: 'line',
        tooltip: {
          valueFormatter: (value) => `${value as unknown as string}%`,
        },
        yAxisIndex: 0,
        symbol: isThumbnail ? 'none' : 'circle',
        symbolSize: 3,
        stack: 'sum',
        emphasis: {
          disabled: true,
        },
        areaStyle: {
          color: ChartColor.colors[0],
        },
      },
      {
        name: '1d-1w',
        type: 'line',
        tooltip: {
          valueFormatter: (value) => `${value as unknown as string}%`,
        },
        stack: 'sum',
        yAxisIndex: 0,
        symbol: isThumbnail ? 'none' : 'circle',
        symbolSize: 3,
        emphasis: {
          disabled: true,
        },
        areaStyle: {
          color: ChartColor.colors[1],
        },
      },
      {
        name: '1w-1m',
        type: 'line',
        tooltip: {
          valueFormatter: (value) => `${value as unknown as string}%`,
        },
        yAxisIndex: 0,
        symbol: isThumbnail ? 'none' : 'circle',
        stack: 'sum',
        symbolSize: 3,
        emphasis: {
          disabled: true,
        },
        areaStyle: {
          color: ChartColor.colors[2],
        },
      },
      {
        name: '1m-3m',
        type: 'line',
        tooltip: {
          valueFormatter: (value) => `${value as unknown as string}%`,
        },
        yAxisIndex: 0,
        symbol: isThumbnail ? 'none' : 'circle',
        stack: 'sum',
        symbolSize: 3,
        emphasis: {
          disabled: true,
        },
        areaStyle: {
          color: ChartColor.colors[3],
        },
      },
      {
        name: '3m-6m',
        type: 'line',
        tooltip: {
          valueFormatter: (value) => `${value as unknown as string}%`,
        },
        yAxisIndex: 0,
        symbol: isThumbnail ? 'none' : 'circle',
        stack: 'sum',
        symbolSize: 3,
        emphasis: {
          disabled: true,
        },
        areaStyle: {
          color: ChartColor.colors[4],
        },
      },
      {
        name: '6m-1y',
        type: 'line',
        tooltip: {
          valueFormatter: (value) => `${value as unknown as string}%`,
        },
        yAxisIndex: 0,
        symbol: isThumbnail ? 'none' : 'circle',
        stack: 'sum',
        symbolSize: 3,
        emphasis: {
          disabled: true,
        },
        areaStyle: {
          color: ChartColor.colors[5],
        },
      },
      {
        name: '1y-3y',
        type: 'line',
        tooltip: {
          valueFormatter: (value) => `${value as unknown as string}%`,
        },
        yAxisIndex: 0,
        symbol: isThumbnail ? 'none' : 'circle',
        stack: 'sum',
        symbolSize: 3,
        emphasis: {
          disabled: true,
        },
        areaStyle: {
          color: ChartColor.colors[6],
        },
      },
      {
        name: '> 3y',
        type: 'line',
        tooltip: {
          valueFormatter: (value) => `${value as unknown as string}%`,
        },
        yAxisIndex: 0,
        symbol: isThumbnail ? 'none' : 'circle',
        stack: 'sum',
        symbolSize: 3,
        emphasis: {
          disabled: true,
        },
        areaStyle: {
          color: ChartColor.colors[7],
        },
      },
      {
        name: 'Holder Count',
        type: 'line',
        yAxisIndex: 1,
        symbol: isThumbnail ? 'none' : 'circle',
        symbolSize: 3,
        emphasis: {
          disabled: true,
        },
        lineStyle: {
          color: ChartColor.colors[8],
        },
      },
    ],
    dataset: {
      source: chartData.map((data) => [
        dayjs(Number(data.createdAtUnixtimestamp) * 1000).format('MM/DD/YYYY'),
        ((data.ckbHodlWave.latestDay / data.ckbHodlWave.totalSupply) * 100).toFixed(2),
        ((data.ckbHodlWave.dayToOneWeek / data.ckbHodlWave.totalSupply) * 100).toFixed(2),
        ((data.ckbHodlWave.oneWeekToOneMonth / data.ckbHodlWave.totalSupply) * 100).toFixed(2),
        ((data.ckbHodlWave.oneMonthToThreeMonths / data.ckbHodlWave.totalSupply) * 100).toFixed(2),
        ((data.ckbHodlWave.threeMonthsToSixMonths / data.ckbHodlWave.totalSupply) * 100).toFixed(2),
        ((data.ckbHodlWave.sixMonthsToOneYear / data.ckbHodlWave.totalSupply) * 100).toFixed(2),
        ((data.ckbHodlWave.oneYearToThreeYears / data.ckbHodlWave.totalSupply) * 100).toFixed(2),
        ((data.ckbHodlWave.overThreeYears / data.ckbHodlWave.totalSupply) * 100).toFixed(2),
        data.holderCount,
      ]),
      dimensions: ['timestamp', '24h', '1d-1w', '1w-1m', '1m-3m', '3m-6m', '6m-1y', '1y-3y', '> 3y', 'holder_count'],
    },
  };

  return (
    <SmartChartPage
      isLoading={isLoading}
      isThumbnail={isThumbnail}
      lastUpdatedTimestamp={chartData.at(-1)?.createdAtUnixtimestamp + '000'}
      option={option}
      title="CKB HODL Wave"
      toCSV={toCSV}
    />
  );
};
