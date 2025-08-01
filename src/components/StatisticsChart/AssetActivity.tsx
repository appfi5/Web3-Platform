'use client';

import BigNumber from 'bignumber.js';
import dayjs from 'dayjs';
import type * as echarts from 'echarts';

import { useIsMobile } from '~/hooks';
import { api } from '~/trpc/react';
import { parseNumericAbbr } from '~/utils/utility';

import { ChartColor, DATA_ZOOM_CONFIG, Grid, GridThumbnail } from './config';
import { SmartChartPage } from './SmartChartPage';

export const AssetActivityChart = ({ isThumbnail = false }: { isThumbnail?: boolean }) => {
  const { data: chartData = [], isLoading } = api.v0.statistics.assetActivity.useQuery();

  const isMobile = useIsMobile();

  const toCSV = () =>
    chartData
      ? chartData.map((data) => [data.createdAtUnixtimestamp, data.holdersCount, data.ckbTransactionsCount])
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
    dataZoom: isThumbnail ? [] : DATA_ZOOM_CONFIG.map((zoom) => ({ ...zoom, show: !isThumbnail, start: 1 })),
    legend: !isThumbnail
      ? {
          top: 8,
          data: ['UDT Holders', 'UDT Transactions'],
        }
      : undefined,
    xAxis: [
      {
        name: isMobile || isThumbnail ? '' : 'Date',
        nameLocation: 'middle',
        nameGap: 30,
        type: 'category',
        boundaryGap: false,
        splitLine: {
          show: false,
        },
        axisLabel: {
          formatter: (value: string) => dayjs(value).format('YYYY/MM/DD'),
        },
      },
    ],
    yAxis: [
      {
        position: 'left',
        name: isMobile || isThumbnail ? '' : `UDT Holders`,
        type: 'value',
        scale: true,
        nameTextStyle: {
          align: 'left',
        },
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
        splitLine: { show: false },
        name: isMobile || isThumbnail ? '' : 'UDT Transactions',
        type: 'value',
        scale: true,
        nameTextStyle: {
          align: 'right',
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
    ],
    series: [
      {
        name: 'UDT Holders',
        type: 'line',
        yAxisIndex: 0,
        symbol: isThumbnail ? 'none' : 'circle',
        symbolSize: 3,
        encode: {
          x: 'timestamp',
          y: 'holders',
        },
        emphasis: {
          disabled: true,
        },
        tooltip: {
          valueFormatter(value) {
            return parseNumericAbbr(BigNumber(value as string), 2);
          },
        },
      },
      {
        name: 'UDT Transactions',
        type: 'line',
        yAxisIndex: 1,
        symbol: isThumbnail ? 'none' : 'circle',
        symbolSize: 3,
        encode: {
          x: 'timestamp',
          y: 'txs',
        },
        emphasis: {
          disabled: true,
        },
        tooltip: {
          valueFormatter(value) {
            return parseNumericAbbr(BigNumber(value as string), 2);
          },
        },
      },
    ],
    dataset: {
      source: chartData.map((item) => [
        dayjs(item.createdAtUnixtimestamp * 1000).format('YYYY/MM/DD HH:mm:ss'),
        item.holdersCount,
        item.ckbTransactionsCount,
      ]),
      dimensions: ['timestamp', 'holders', 'txs'],
    },
  };

  return (
    <SmartChartPage
      description="The x axis represents the date, the y axis represents the transaction count and holder count."
      isLoading={isLoading}
      isThumbnail={isThumbnail}
      lastUpdatedTimestamp={chartData.at(-1)?.createdAtUnixtimestamp + '000'}
      option={option}
      title="Asset Activity"
      toCSV={toCSV}
    />
  );
};
