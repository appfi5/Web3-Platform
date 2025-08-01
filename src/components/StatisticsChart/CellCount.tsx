'use client';

import BigNumber from 'bignumber.js';
import dayjs from 'dayjs';
import type * as echarts from 'echarts';

import { useIsMobile } from '~/hooks';
import { api } from '~/trpc/react';
import { parseNumericAbbr } from '~/utils/utility';

import { ChartColor, DATA_ZOOM_CONFIG, Grid, GridThumbnail } from './config';
import { SmartChartPage } from './SmartChartPage';

const CellEnum = {
  All: 'All Cells',
  Live: 'Live Cell',
  Dead: 'Dead Cell',
};

export const CellCountChart = ({ isThumbnail = false }: { isThumbnail?: boolean }) => {
  const { data: chartData = [], isLoading } = api.v0.statistics.cellCount.useQuery();
  const isMobile = useIsMobile();

  const toCSV = () =>
    chartData.map((data) => [
      data.createdAtUnixtimestamp,
      data.allCellsCount,
      data.liveCellsCount,
      data.deadCellsCount,
    ]);

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
      top: 8,
      icon: 'roundRect',
      data: isThumbnail ? [] : [CellEnum.All, CellEnum.Live, CellEnum.Dead],
      selected: {
        [CellEnum.All]: false,
        [CellEnum.Live]: true,
        [CellEnum.Dead]: false,
      },
    },
    grid: isThumbnail ? GridThumbnail : { ...Grid, top: '10%' },
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
    ],
    series: [
      {
        name: CellEnum.All,
        type: 'line',
        yAxisIndex: 0,
        symbol: isThumbnail ? 'none' : 'circle',
        symbolSize: 3,
        emphasis: {
          disabled: true,
        },
        areaStyle: {
          color: ChartColor.colors[0],
        },
        lineStyle: {
          width: 4,
        },
      },
      {
        name: CellEnum.Dead,
        type: 'line',
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
        name: CellEnum.Live,
        type: 'line',
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
    ],
    dataset: {
      source: chartData.map((data) => [
        dayjs(+data.createdAtUnixtimestamp * 1000).format('YYYY/MM/DD'),
        new BigNumber(data.allCellsCount).toFixed(0),
        new BigNumber(data.deadCellsCount).toFixed(0),
        new BigNumber(data.liveCellsCount).toFixed(0),
      ]),
      dimensions: ['timestamp', 'all', 'live', 'dead'],
    },
  };

  return (
    <SmartChartPage
      isLoading={isLoading}
      isThumbnail={isThumbnail}
      lastUpdatedTimestamp={chartData.at(-1)?.createdAtUnixtimestamp + '000'}
      option={option}
      title="Cell Count"
      toCSV={toCSV}
    />
  );
};
