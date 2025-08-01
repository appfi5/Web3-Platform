'use client';

import type * as echarts from 'echarts';

import { useIsMobile } from '~/hooks';
import { api } from '~/trpc/react';
import { localeNumberString, parseHourFromMinute } from '~/utils/utility';

import { ChartColor, DATA_ZOOM_CONFIG, Grid, GridThumbnail } from './config';
import { SmartChartPage } from './SmartChartPage';

export const EpochTimeDistributionChart = ({ isThumbnail = false }: { isThumbnail?: boolean }) => {
  const {
    data = {
      epochTimeDistribution: [],
      lastUpdatedTimestamp: '0',
    },
    isLoading,
  } = api.v0.statistics.epochTimeDistribution.useQuery();

  const { epochTimeDistribution: chartData, lastUpdatedTimestamp } = data;

  const isMobile = useIsMobile();

  const toCSV = () => (chartData ? chartData.map((data) => [parseHourFromMinute(data.time), data.epoch]) : []);

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
        name: isMobile || isThumbnail ? '' : 'Time (hour)',
        nameLocation: 'middle',
        nameGap: 30,
        type: 'category',
        boundaryGap: false,
        data: chartData.map((data) => parseHourFromMinute(data.time).toString()),
      },
    ],
    yAxis: [
      {
        position: 'left',
        name: 'Epochs',
        type: 'value',
        scale: true,
        axisLine: {
          lineStyle: {
            color: ChartColor.colors[0],
          },
        },
        axisLabel: {
          formatter: (value) => localeNumberString(value),
        },
      },
    ],
    series: [
      {
        name: 'Epochs',
        type: 'bar',
        yAxisIndex: 0,
        barWidth: isMobile || isThumbnail ? 2 : 5,
        data: chartData.map((data) => data.epoch),
      },
    ],
  };

  return (
    <SmartChartPage
      description="The x axis is epoch intervals in hours, and the y axis is the frequency of occurrence in the latest 500 epochs."
      isLoading={isLoading}
      isThumbnail={isThumbnail}
      lastUpdatedTimestamp={lastUpdatedTimestamp + '000'}
      option={option}
      thumbnailTitle="Epoch Time Distribution"
      title="Epoch Time Distribution (Recent 500 epochs)"
      toCSV={toCSV}
    />
  );
};
