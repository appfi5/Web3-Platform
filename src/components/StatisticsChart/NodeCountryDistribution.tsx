'use client';

import type * as echarts from 'echarts';

import { useIsMobile } from '~/hooks';
import { api } from '~/trpc/react';

import { ChartColor, Grid, GridThumbnail } from './config';
import { SmartChartPage } from './SmartChartPage';

export const NodeCountryDistributionChart = ({ isThumbnail = false }: { isThumbnail?: boolean }) => {
  const { data: chartData = [], isLoading } = api.v0.statistics.nodeCountryDistribution.useQuery(undefined, {
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    staleTime: Infinity,
  });

  const isMobile = useIsMobile();

  const toCSV = () => chartData.map((r) => [r.country, `${r.percent}%`]);

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
        name: 'Nodes distribution by Country/Region',
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
        data: chartData.slice(0, isThumbnail ? 10 : undefined).map((data) => {
          return {
            name: `${data.country} (${data.percent}%)`,
            title: data.country,
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
      title="Nodes distribution by Country/Region"
      toCSV={toCSV}
    />
  );
};
