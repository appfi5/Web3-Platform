'use client';

import type * as echarts from 'echarts';

import { useIsMobile } from '~/hooks';
import { api } from '~/trpc/react';

import { ChartColor, DATA_ZOOM_CONFIG, Grid, GridThumbnail } from './config';
import { SmartChartPage } from './SmartChartPage';

export const InflationRateChart = ({ isThumbnail = false }: { isThumbnail?: boolean }) => {
  const { data: chartData = [], isLoading } = api.v0.statistics.inflationRate.useQuery();

  const isMobile = useIsMobile();

  const toCSV = () =>
    chartData
      ? chartData.map((data) => [
          data.year,
          Number(data.nominalApc).toFixed(4),
          Number(data.nominalInflationRate).toFixed(4),
          Number(data.realInflationRate).toFixed(4),
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
    grid: isThumbnail ? GridThumbnail : { ...Grid, top: '10%' },
    legend: {
      top: 8,
      icon: 'roundRect',
      data: isThumbnail ? [] : ['Nominal Inflation Rate', 'Nominal DAO Compensation Rate', 'Real Inflation Rate'],
    },
    dataZoom: isThumbnail ? [] : DATA_ZOOM_CONFIG,
    xAxis: [
      {
        name: isMobile || isThumbnail ? '' : 'Year',
        nameLocation: 'middle',
        nameGap: 30,
        type: 'category',
        boundaryGap: false,
        data: chartData.map((data) => data.year),
        axisLabel: {
          interval: isMobile || isThumbnail ? 7 : 3,
          formatter: (value: string) => value,
        },
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
          formatter: (value) => `${value}%`,
        },
      },
    ],
    series: [
      {
        name: 'Nominal Inflation Rate',
        type: 'line',
        yAxisIndex: 0,
        symbol: isThumbnail ? 'none' : 'circle',
        symbolSize: 3,
        lineStyle: {
          type: 'dashed',
        },
        emphasis: {
          disabled: true,
        },
        tooltip: {
          valueFormatter(value) {
            return `${value as string}%`;
          },
        },
        data: chartData.map((data) => Number(data.nominalInflationRate).toFixed(4)),
      },
      {
        name: 'Nominal DAO Compensation Rate',
        type: 'line',
        yAxisIndex: 0,
        symbol: isThumbnail ? 'none' : 'circle',
        symbolSize: 3,
        lineStyle: {
          type: 'dashed',
        },
        emphasis: {
          disabled: true,
        },
        tooltip: {
          valueFormatter(value) {
            return `${value as string}%`;
          },
        },
        data: chartData.map((data) => Number(data.nominalApc).toFixed(4)),
      },
      {
        name: 'Real Inflation Rate',
        type: 'line',
        yAxisIndex: 0,
        symbol: isThumbnail ? 'none' : 'circle',
        symbolSize: 3,
        lineStyle: {
          type: 'solid',
          width: 3,
        },
        emphasis: {
          disabled: true,
        },
        tooltip: {
          valueFormatter(value) {
            return `${value as string}%`;
          },
        },
        data: chartData.map((data) => Number(data.realInflationRate).toFixed(4)),
      },
    ],
  };

  return (
    <SmartChartPage
      description="Nominal inflation rate: the inflation introduced by the the primary issuance and the secondary issuance. \nNominal APC: the anti-dilution compensation rate of Nervos DAO.\nReal inflation rate: the compound inflation rate that nominal inflation rate minus the nominal APC, which is gradually to zero."
      isLoading={isLoading}
      isThumbnail={isThumbnail}
      lastUpdatedTimestamp={new Date().getTime().toString()}
      option={option}
      title="Inflation Rate"
      toCSV={toCSV}
    />
  );
};
