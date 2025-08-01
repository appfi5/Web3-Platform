'use client';

import type * as echarts from 'echarts';

import { useIsMobile } from '~/hooks';
import { api } from '~/trpc/react';

import { ChartColor, Grid, GridThumbnail } from './config';
import { SmartChartPage } from './SmartChartPage';

export const MinerVersionDistributionChart = ({ isThumbnail = false }: { isThumbnail?: boolean }) => {
  const { data: chartData = [], isLoading } = api.v0.statistics.minerVersionDistribution.useQuery();

  const isMobile = useIsMobile();

  const toCSV = () => (chartData ? chartData.map((r) => [r.version, `${r.percent}%`]) : []);

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
    legend: {
      show: !isThumbnail,
      right: 40,
      bottom: 40,
      orient: 'vertical',
      icon: 'circle',
    },
    series: [
      {
        name: 'Miner Versions (Recent 7 days)',
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
            return `${Number(value).toFixed(1)}%`;
          },
        },
        data: chartData.map((data) => {
          const version = data.version === 'others' ? 'other' : data.version;
          return {
            name: `${version} (${data.percent}%)`,
            title: version,
            value: data.percent,
          };
        }),
      },
    ],
  };

  return (
    <SmartChartPage
      isLoading={isLoading}
      isThumbnail={isThumbnail}
      lastUpdatedTimestamp={new Date().getTime().toString()}
      option={option}
      title="Miner Versions (Recent 7 days)"
      toCSV={toCSV}
    />
  );
};
