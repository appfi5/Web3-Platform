'use client';

import BigNumber from 'bignumber.js';
import type * as echarts from 'echarts';

import { useIsMobile } from '~/hooks';
import { api } from '~/trpc/react';
import { parseNumericAbbr } from '~/utils/utility';

import { ChartColor, DATA_ZOOM_CONFIG, Grid, GridThumbnail } from './config';
import { SmartChartPage } from './SmartChartPage';

export const BlockTimeDistributionChart = ({ isThumbnail = false }: { isThumbnail?: boolean }) => {
  const {
    data = {
      blockTimeDistribution: [],
      lastUpdatedTimestamp: '0',
    },
    isLoading,
  } = api.v0.statistics.blockTimeDistribution.useQuery();

  const { blockTimeDistribution: chartData, lastUpdatedTimestamp } = data;

  const isMobile = useIsMobile();

  const toCSV = () => (chartData ? chartData.map((data) => [data.time, Number(data.ratio).toFixed(4)]) : []);

  const option: echarts.EChartsOption = {
    darkMode: true,
    color: ChartColor.colors,
    backgroundColor: ChartColor.backgroundColor,
    tooltip: !isThumbnail
      ? {
          trigger: 'axis',
          confine: true,
          axisPointer: {
            show: false,
          },
        }
      : undefined,
    grid: isThumbnail ? GridThumbnail : Grid,
    dataZoom: isThumbnail ? [] : DATA_ZOOM_CONFIG,
    xAxis: [
      {
        name: isMobile || isThumbnail ? '' : 'Time',
        nameLocation: 'middle',
        nameGap: 30,
        type: 'category',
        boundaryGap: false,
        data: chartData.map((data) => data.time),
        axisLabel: {
          interval: 49,
          formatter: (value: string) => Number(value).toFixed(0),
        },
      },
    ],
    yAxis: [
      {
        position: 'left',
        name: 'Block Ratio',
        type: 'value',
        scale: true,
        axisLine: {
          lineStyle: {
            color: ChartColor.colors[0],
          },
        },
        axisLabel: {
          formatter: (value) => `${parseNumericAbbr(new BigNumber(value))}%`,
        },
      },
    ],
    series: [
      {
        name: 'Block Ratio',
        type: 'line',
        yAxisIndex: 0,
        areaStyle: {
          color: ChartColor.areaColor,
        },
        tooltip: {
          valueFormatter(value) {
            return `${value as string}%`;
          },
        },
        data: chartData.map((data) => (Number(data.ratio) * 100).toFixed(3)),
      },
    ],
  };

  return (
    <SmartChartPage
      description="The x axis is block intervals in seconds, and the y axis is the frequency of occurrence in the latest 50,000 blocks."
      isLoading={isLoading}
      isThumbnail={isThumbnail}
      lastUpdatedTimestamp={lastUpdatedTimestamp + '000'}
      option={option}
      thumbnailTitle="Block Time Distribution"
      title="Block Time Distribution (Recent 50000 blocks)"
      toCSV={toCSV}
    />
  );
};
