'use client';

import BigNumber from 'bignumber.js';
import type * as echarts from 'echarts';

import { useIsMobile } from '~/hooks';
import { api } from '~/trpc/react';
import { parseNumericAbbr } from '~/utils/utility';

import { ChartColor, DATA_ZOOM_CONFIG, Grid, GridThumbnail, handleLogGroupAxis } from './config';
import { SmartChartPage } from './SmartChartPage';

export const BalanceDistributionChart = ({ isThumbnail = false }: { isThumbnail?: boolean }) => {
  const {
    data = {
      addressBalanceDistribution: [],
      lastUpdatedTimestamp: '0',
    },
    isLoading,
  } = api.v0.statistics.balanceDistribution.useQuery();
  const isMobile = useIsMobile();

  const { addressBalanceDistribution: chartData, lastUpdatedTimestamp } = data;

  const toCSV = () =>
    chartData
      ? chartData.map((data, index) => [
          `"${handleLogGroupAxis(new BigNumber(data.balance), index === chartData.length - 1 ? '+' : '')}"`,
          data.addresses,
          data.sumAddresses,
        ])
      : [];

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
      data: isThumbnail ? [] : ['Count of Addresses by Balance Group', 'Count of Addresses Below Specific Balance'],
    },
    grid: isThumbnail ? GridThumbnail : Grid,
    dataZoom: isThumbnail ? [] : DATA_ZOOM_CONFIG,
    xAxis: [
      {
        name: isMobile || isThumbnail ? '' : `Balance Range in Group (CKB)`,
        nameLocation: 'middle',
        nameGap: 30,
        type: 'category',
        boundaryGap: true,
        data: chartData.map(
          (data, index) =>
            `${handleLogGroupAxis(new BigNumber(data.balance), index === chartData.length - 1 ? '+' : '')}`,
        ),
      },
    ],
    yAxis: [
      {
        position: 'left',
        name: isMobile || isThumbnail ? '' : 'Count of Addresses by Balance Group',
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
        name: isMobile || isThumbnail ? '' : 'Count of Addresses Below Specific Balance',
        type: 'value',
        splitLine: {
          show: false,
        },
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
        name: 'Count of Addresses by Balance Group',
        type: 'bar',
        yAxisIndex: 0,
        barWidth: isMobile || isThumbnail ? 20 : 50,
        data: chartData.map((data) => new BigNumber(data.addresses).toString()),
        emphasis: {
          disabled: true,
        },
      },
      {
        name: 'Count of Addresses Below Specific Balance',
        type: 'line',
        yAxisIndex: 1,
        symbol: isThumbnail ? 'none' : 'circle',
        symbolSize: 3,
        data: chartData.map((data) => new BigNumber(data.sumAddresses).toString()),
        emphasis: {
          disabled: true,
        },
      },
    ],
  };

  return (
    <SmartChartPage
      description="Shows the address count at specific balance range, and that under specific balance amount."
      isLoading={isLoading}
      isThumbnail={isThumbnail}
      lastUpdatedTimestamp={lastUpdatedTimestamp + '000'}
      option={option}
      title="Balance Distribution"
      toCSV={toCSV}
    />
  );
};
