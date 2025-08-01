'use client';

import type * as echarts from 'echarts';

import { useIsMobile } from '~/hooks';
import { api } from '~/trpc/react';

import { ChartColor, Grid, GridThumbnail } from './config';
import { SmartChartPage } from './SmartChartPage';

export const MinerAddressDistributionChart = ({ isThumbnail = false }: { isThumbnail?: boolean }) => {
  const {
    data = {
      statisticMinerAddresses: [],
      lastUpdatedTimestamp: '0',
    },
    isLoading,
  } = api.v0.statistics.minerAddressDistribution.useQuery();

  const { statisticMinerAddresses: chartData, lastUpdatedTimestamp } = data;

  const isMobile = useIsMobile();

  const toCSV = () => (chartData ? chartData.map((data) => [data.address, data.radio]) : []);

  const option: echarts.EChartsOption = {
    darkMode: true,
    color: ChartColor.colors,
    backgroundColor: ChartColor.backgroundColor,
    tooltip: !isThumbnail
      ? {
          trigger: 'item',
        }
      : undefined,
    grid: isThumbnail ? GridThumbnail : Grid,
    series: [
      {
        name: 'Ratio',
        type: 'pie',
        radius: isMobile || isThumbnail ? '50%' : '75%',
        center: ['50%', '50%'],
        emphasis: {
          itemStyle: {
            color: 'inherit',
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
        tooltip: {
          valueFormatter(value) {
            return `${(Number(value) * 100).toFixed(1)}%`;
          },
        },
        data: chartData.map((data) => ({
          name:
            (data.address.length > 8 ? `${data.address.slice(0, 8)}...${data.address.slice(-8)}` : data.address) +
            `(${(Number(data.radio) * 100).toFixed(1)}%)`,
          title: data.address.toLowerCase(),
          value: Number(data.radio),
        })),
      },
    ],
  };

  return (
    <SmartChartPage
      isLoading={isLoading}
      isThumbnail={isThumbnail}
      lastUpdatedTimestamp={lastUpdatedTimestamp + '000'}
      option={option}
      title="Top Miners (Recent 7 days)"
      toCSV={toCSV}
    />
  );
};
