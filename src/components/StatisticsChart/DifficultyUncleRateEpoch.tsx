'use client';

import BigNumber from 'bignumber.js';
import type * as echarts from 'echarts';

import { useIsMobile } from '~/hooks';
import { api } from '~/trpc/react';
import { parseHourFromMillisecond, parseNumericAbbr } from '~/utils/utility';

import { ChartColor, Grid, GridThumbnail } from './config';
import { SmartChartPage } from './SmartChartPage';

export const DifficultyUncleRateEpochChart = ({ isThumbnail = false }: { isThumbnail?: boolean }) => {
  const { data: chartData = [], isLoading } = api.v0.statistics.difficultyUncleRateEpoch.useQuery();

  const isMobile = useIsMobile();

  const toCSV = () => (chartData ? chartData.map((data) => [data.epochNumber, data.epochTime, data.epochLength]) : []);

  const COUNT_IN_THUMBNAIL = 90;
  const epochNumberSeries = chartData.map((data) => data.epochNumber);
  const epochTimeSeries = chartData.map((data) => parseHourFromMillisecond(data.epochTime));
  const epochLengthSeries = chartData.map((data) => data.epochLength);
  const endValue = chartData[chartData.length - 1]?.epochNumber ?? '0';
  const startValue = Math.max(+endValue - COUNT_IN_THUMBNAIL, 0).toString();

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
          icon: 'roundRect',
          data: ['Epoch Time', 'Epoch Length (block)'],
          textStyle: {
            fontSize: isMobile ? 11 : 14,
          },
        }
      : undefined,
    grid: isThumbnail ? GridThumbnail : Grid,
    dataZoom: isThumbnail
      ? []
      : [
          {
            show: true,
            realtime: true,
            startValue,
            endValue,
            xAxisIndex: [0],
          },
          {
            type: 'inside',
            realtime: true,
            startValue,
            endValue,
            xAxisIndex: [0],
          },
        ],
    xAxis: [
      {
        name: isMobile || isThumbnail ? '' : 'Epoch',
        nameLocation: 'middle',
        nameGap: 30,
        type: 'category',
        boundaryGap: false,
        data: isThumbnail ? epochNumberSeries.slice(-1 * COUNT_IN_THUMBNAIL) : epochNumberSeries,
        axisLabel: {
          formatter: (value: string) => value,
        },
      },
    ],
    yAxis: [
      {
        position: 'left',
        name: isMobile || isThumbnail ? '' : 'Epoch Time',
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
        name: isMobile || isThumbnail ? '' : 'Epoch Length (block)',
        type: 'value',
        scale: true,
        splitLine: {
          show: false,
        },
        axisLine: {
          lineStyle: {
            color: ChartColor.colors[1],
          },
        },
      },
      {
        position: 'left',
        scale: true,
        axisLine: {
          lineStyle: {
            color: ChartColor.colors[0],
          },
        },
        axisLabel: {
          formatter: () => '',
        },
      },
      {
        position: 'right',
        scale: true,
        axisLine: {
          lineStyle: {
            color: ChartColor.colors[1],
          },
        },
        axisLabel: {
          formatter: () => '',
        },
      },
    ],
    series: [
      {
        name: 'Epoch Time',
        type: 'bar',
        yAxisIndex: 0,
        data: isThumbnail ? epochTimeSeries.slice(-1 * COUNT_IN_THUMBNAIL) : epochTimeSeries,
        emphasis: {
          itemStyle: {
            color: 'inherit',
          },
        },
        tooltip: {
          valueFormatter(value) {
            return `${value as string} h`;
          },
        },
      },
      {
        name: 'Epoch Length (block)',
        type: 'bar',
        yAxisIndex: 1,
        emphasis: {
          itemStyle: {
            color: 'inherit',
          },
        },
        data: isThumbnail ? epochLengthSeries.slice(-1 * COUNT_IN_THUMBNAIL) : epochLengthSeries,
      },
    ],
  };

  return (
    <SmartChartPage
      isLoading={isLoading}
      isThumbnail={isThumbnail}
      lastUpdatedTimestamp={chartData.at(-1)?.createdAtUnixtimestamp + '000'}
      option={option}
      title="Epoch Time & Epoch Length"
      toCSV={toCSV}
    />
  );
};
