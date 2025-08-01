'use client';

import dayjs from 'dayjs';
import type * as echarts from 'echarts';

import { useIsMobile } from '~/hooks';
import { api } from '~/trpc/react';

import { ChartColor, DATA_ZOOM_CONFIG, Grid, GridThumbnail } from './config';
import { SmartChartPage } from './SmartChartPage';

export const SecondaryIssuanceChart = ({ isThumbnail = false }: { isThumbnail?: boolean }) => {
  const { data: chartData = [], isLoading } = api.v0.statistics.secondaryIssuance.useQuery();

  const isMobile = useIsMobile();

  const toCSV = () =>
    chartData
      ? chartData.map((data) => [
          data.createdAtUnixtimestamp,
          data.treasuryAmount,
          data.miningReward,
          data.depositCompensation,
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
    grid: isThumbnail ? GridThumbnail : Grid,
    legend: {
      icon: 'roundRect',
      data: isThumbnail ? [] : ['Burnt', 'Mining Reward', 'Deposit Compensation'],
    },
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
        name: 'issuance',
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
        name: 'Burnt',
        type: 'line',
        yAxisIndex: 0,
        symbol: isThumbnail ? 'none' : 'circle',
        symbolSize: 3,
        stack: 'sum',
        encode: {
          x: 'timestamp',
          y: 'treasury',
        },
        areaStyle: {
          color: ChartColor.colors[0],
        },
        emphasis: {
          disabled: true,
        },
        tooltip: {
          valueFormatter(value) {
            return `${value as string}%`;
          },
        },
      },
      {
        name: 'Mining Reward',
        type: 'line',
        yAxisIndex: 0,
        symbol: isThumbnail ? 'none' : 'circle',
        symbolSize: 3,
        stack: 'sum',
        encode: {
          x: 'timestamp',
          y: 'reward',
        },
        areaStyle: {
          color: ChartColor.colors[1],
        },
        emphasis: {
          disabled: true,
        },
        tooltip: {
          valueFormatter(value) {
            return `${value as string}%`;
          },
        },
      },
      {
        name: 'Deposit Compensation',
        type: 'line',
        yAxisIndex: 0,
        symbol: isThumbnail ? 'none' : 'circle',
        symbolSize: 3,
        stack: 'sum',
        encode: {
          x: 'timestamp',
          y: 'compensation',
        },
        areaStyle: {
          color: ChartColor.colors[2],
        },
        emphasis: {
          disabled: true,
        },
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
        data.treasuryAmount,
        data.miningReward,
        data.depositCompensation,
      ]),
      dimensions: ['timestamp', 'treasury', 'reward', 'compensation'],
    },
  };

  return (
    <SmartChartPage
      description="The secondary issuance is automatically divided into three parts, the compensation, the mining reward and the treasury (burnt by now). They are proportional to the DAO deposit, the storage occupation, and the rest of CKBytes."
      isLoading={isLoading}
      isThumbnail={isThumbnail}
      lastUpdatedTimestamp={chartData.at(-1)?.createdAtUnixtimestamp + '000'}
      option={option}
      title="Secondary Issuance"
      toCSV={toCSV}
    />
  );
};
