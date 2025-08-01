'use client';

import dayjs from 'dayjs';
import type * as echarts from 'echarts';

import { useIsMobile } from '~/hooks';
import { api } from '~/trpc/react';

import { ChartColor, DATA_ZOOM_CONFIG, Grid, GridThumbnail } from './config';
import { SmartChartPage } from './SmartChartPage';

export const UncleRateChart = ({ isThumbnail = false }: { isThumbnail?: boolean }) => {
  const { data: chartData = [], isLoading } = api.v0.statistics.uncleRate.useQuery();

  const isMobile = useIsMobile();

  const toCSV = () => (chartData ? chartData.map((data) => [data.createdAtUnixtimestamp, data.uncleRate]) : []);

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
        name: isMobile || isThumbnail ? '' : 'Uncle Rate',
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
        name: 'Uncle Rate',
        type: 'line',
        yAxisIndex: 0,
        symbol: isThumbnail ? 'none' : 'circle',
        symbolSize: 3,
        encode: {
          x: 'timestamp',
          y: 'value',
        },
        tooltip: {
          valueFormatter(value) {
            return `${value as string}%`;
          },
        },
        markLine: {
          symbol: 'none',
          data: [
            {
              name: 'Uncle rate target',
              yAxis: 2.5,
            },
          ],
          label: {
            formatter: (label) => `${(label as { data: { value: string } }).data.value}%`,
          },
        },
      },
    ],
    dataset: {
      source: chartData.map((data) => [
        dayjs(+data.createdAtUnixtimestamp * 1000).format('YYYY/MM/DD'),
        (+data.uncleRate * 100).toFixed(2),
      ]),
    },
  };

  return (
    <SmartChartPage
      description="The uncle rate is the rate of orphans blocks. The NC-Max consensus will automatically adjust the uncle rate by mining difficulty, and the target is 2.5%."
      isLoading={isLoading}
      isThumbnail={isThumbnail}
      lastUpdatedTimestamp={chartData.at(-1)?.createdAtUnixtimestamp + '000'}
      option={option}
      title="Uncle Rate"
      toCSV={toCSV}
    />
  );
};
