'use client';

import type * as echarts from 'echarts';

import { useIsMobile } from '~/hooks';
import { api } from '~/trpc/react';

import { ChartColor, DATA_ZOOM_CONFIG, Grid, GridThumbnail } from './config';
import { SmartChartPage } from './SmartChartPage';

export const AnnualPercentageCompensationChart = ({ isThumbnail = false }: { isThumbnail?: boolean }) => {
  const { data: chartData = [], isLoading } = api.v0.statistics.annualPercentageCompensation.useQuery();

  const isMobile = useIsMobile();

  const toCSV = () => (chartData ? chartData.map((data) => [data.year, (Number(data.apc) / 100).toFixed(4)]) : []);

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
        name: isMobile || isThumbnail ? '' : 'Year',
        nameLocation: 'middle',
        nameGap: 30,
        type: 'category',
        boundaryGap: false,
        axisLabel: {
          interval: isMobile || isThumbnail ? 7 : 3,
        },
      },
    ],
    yAxis: [
      {
        name: 'Nominal DAO Compensation Rate',
        position: 'left',
        type: 'value',

        nameTextStyle: {
          align: 'left',
        },
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
        name: 'Nominal DAO Compensation Rate',
        type: 'line',
        yAxisIndex: 0,
        symbol: isThumbnail ? 'none' : 'circle',
        symbolSize: 3,
        stack: 'sum',
        tooltip: {
          valueFormatter(value) {
            return `${value as string}%`;
          },
        },
      },
    ],
    dataset: {
      source: chartData.map((data) => [data.year, (+data.apc).toFixed(2)]),
    },
  };

  return (
    <SmartChartPage
      description="The nominal compensation rate provided by DAO when there is no burnt portion in the secondary issuance. The real compensation rate is always higher than the nominal compensation rate."
      isLoading={isLoading}
      isThumbnail={isThumbnail}
      lastUpdatedTimestamp={new Date().getTime().toString()}
      option={option}
      title="Nominal DAO Compensation Rate"
      toCSV={toCSV}
    />
  );
};
