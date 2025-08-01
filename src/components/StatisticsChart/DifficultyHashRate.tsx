'use client';

import BigNumber from 'bignumber.js';
import type * as echarts from 'echarts';

import { useIsMobile } from '~/hooks';
import { api } from '~/trpc/react';
import { parseNumericAbbr } from '~/utils/utility';

import { ChartColor, DATA_ZOOM_CONFIG, Grid, GridThumbnail } from './config';
import { SmartChartPage } from './SmartChartPage';

export const DifficultyHashRateChart = ({ isThumbnail = false }: { isThumbnail?: boolean }) => {
  const { data: chartData = [], isLoading } = api.v0.statistics.difficultyHashRate.useQuery();

  const isMobile = useIsMobile();

  const toCSV = () =>
    chartData ? chartData.map((data) => [data.epochNumber, data.difficulty, data.hashRate, data.uncleRate]) : [];

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
    grid: isThumbnail ? GridThumbnail : { ...Grid, top: '10%' },
    legend: !isThumbnail
      ? {
          top: 8,
          icon: 'roundRect',
          data: ['Difficulty', 'Hash Rate (H/s)', 'Uncle Rate'],
        }
      : undefined,
    dataZoom: isThumbnail ? [] : DATA_ZOOM_CONFIG,
    xAxis: [
      {
        name: isMobile || isThumbnail ? '' : 'Epoch',
        nameLocation: 'middle',
        nameGap: 30,
        type: 'category',
        boundaryGap: false,
        data: chartData.map((data) => data.epochNumber),
        axisLabel: {
          formatter: (value) => value,
        },
      },
    ],
    yAxis: [
      {
        position: 'left',
        name: isMobile || isThumbnail ? '' : 'Difficulty',
        type: 'value',
        scale: true,
        axisLine: {
          lineStyle: {
            color: ChartColor.colors[0],
          },
        },
        axisLabel: {
          formatter: (value) => parseNumericAbbr(new BigNumber(value)),
        },
      },
      {
        position: 'right',
        name: isMobile || isThumbnail ? '' : 'Hash Rate (H/s)',
        type: 'value',
        splitLine: {
          show: false,
        },
        axisLine: {
          lineStyle: {
            color: ChartColor.colors[1],
          },
        },
        axisLabel: {
          formatter: (value) => parseNumericAbbr(new BigNumber(value)),
        },
      },
      {
        position: 'right',
        type: 'value',
        max: 100,
        show: false,
        axisLabel: {
          formatter: () => '',
        },
      },
    ],
    series: [
      {
        name: 'Difficulty',
        type: 'line',
        yAxisIndex: 0,
        symbol: isThumbnail ? 'none' : 'circle',
        symbolSize: 3,
        emphasis: {
          disabled: true,
        },
        data: chartData.map((data) => new BigNumber(data.difficulty).toString()),
        tooltip: {
          valueFormatter: (value) => `${parseNumericAbbr(new BigNumber(value as unknown as string), 2)}H`,
        },
      },
      {
        name: 'Hash Rate (H/s)',
        type: 'line',
        yAxisIndex: 1,
        symbol: isThumbnail ? 'none' : 'circle',
        symbolSize: 3,
        emphasis: {
          disabled: true,
        },
        data: chartData.map((data) => new BigNumber(data.hashRate).toString()),
        tooltip: {
          valueFormatter: (value) => `${parseNumericAbbr(new BigNumber(value as unknown as string), 2)}H/s`,
        },
      },
      {
        name: 'Uncle Rate',
        type: 'line',
        smooth: true,
        yAxisIndex: 2,
        symbol: isThumbnail ? 'none' : 'circle',
        symbolSize: 3,
        z: 0,
        emphasis: {
          disabled: true,
        },
        markLine: isThumbnail
          ? undefined
          : {
              symbol: 'none',
              data: [
                {
                  name: 'Uncle rate target',
                  yAxis: 2.5,
                },
              ],
              label: {
                formatter: (params) => `${params.value as string}%`,
              },
            },
        data: chartData.map((data) => (Number(data.uncleRate) * 100).toFixed(2)),
        tooltip: {
          valueFormatter: (value) => `${value as string}%`,
        },
      },
    ],
  };

  return (
    <SmartChartPage
      isLoading={isLoading}
      isThumbnail={isThumbnail}
      lastUpdatedTimestamp={chartData.at(-1)?.createdAtUnixtimestamp + '000'}
      option={option}
      title="Difficulty & Hash Rate & Uncle Rate"
      toCSV={toCSV}
    />
  );
};
