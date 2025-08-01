'use client';

import dayjs from 'dayjs';
import type * as echarts from 'echarts';

import { useIsMobile } from '~/hooks';
import { api } from '~/trpc/react';

import { ChartColor, DATA_ZOOM_CONFIG, Grid, GridThumbnail } from './config';
import { SmartChartPage } from './SmartChartPage';

export const CirculationRatioChart = ({ isThumbnail = false }: { isThumbnail?: boolean }) => {
  const { data: chartData = [], isLoading } = api.v0.statistics.circulationRatio.useQuery();

  const isMobile = useIsMobile();

  const toCSV = () => (chartData ? chartData.map((data) => [data.createdAtUnixtimestamp, data.circulationRatio]) : []);

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
        name: isMobile || isThumbnail ? '' : 'Deposit to Circulation Ratio',
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
          formatter: (value) => `${value}%`,
        },
      },
    ],
    series: [
      {
        name: 'Deposit to Circulation Ratio',
        type: 'line',
        yAxisIndex: 0,
        symbol: isThumbnail ? 'none' : 'circle',
        symbolSize: 3,
        tooltip: {
          valueFormatter(value) {
            return `${value as string}%`;
          },
        },
      },
    ],
    dataset: {
      source: chartData.map((data) => [
        dayjs(+data.createdAtUnixtimestamp * 1000).format('YYYY/MM/DD'),
        (+data.circulationRatio * 100).toFixed(2),
      ]),
    },
  };

  return (
    <SmartChartPage
      description="The ratio of DAO deposit to circulating supply. Where the circulating supply is equal to the total supply minus the burnt part and the unvested part."
      isLoading={isLoading}
      isThumbnail={isThumbnail}
      lastUpdatedTimestamp={chartData.at(-1)?.createdAtUnixtimestamp + '000'}
      option={option}
      title="Deposit to Circulation Ratio"
      toCSV={toCSV}
    />
  );
};
