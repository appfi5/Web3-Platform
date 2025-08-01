'use client';

import type * as echarts from 'echarts';

import { useIsMobile } from '~/hooks';
import { api } from '~/trpc/react';
import { parseNumericAbbr } from '~/utils/utility';

import { ChartColor, DATA_ZOOM_CONFIG, Grid, GridThumbnail } from './config';
import { SmartChartPage } from './SmartChartPage';

function getWeekNumber(timestamp: string) {
  const date = new Date(+timestamp * 1000);
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date.getTime() - firstDayOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((days + firstDayOfYear.getDay() + 1) / 7);
  return `${date.getFullYear()}-W${weekNumber}`;
}

export const ActiveAddressesChart = ({ isThumbnail = false }: { isThumbnail?: boolean }) => {
  const { data: chartData = [], isLoading } = api.v0.statistics.activeAddresses.useQuery();

  const toCSV = () => {
    return chartData.flatMap((item) =>
      Object.entries(item.distribution).map(([key, value]) => [item.createdAtUnixtimestamp, key, value.toString()]),
    );
  };

  const isMobile = useIsMobile();

  const aggregatedByWeek = chartData.reduce(
    (acc, item) => {
      const week = getWeekNumber(item.createdAtUnixtimestamp);

      if (!acc[week]) {
        acc[week] = {
          createdAtWeek: week,
          distribution: {},
        };
      }

      Object.entries(item.distribution).forEach(([key, value]) => {
        Object.assign(acc[week]!.distribution, {
          [key]: (acc[week]?.distribution[key] ?? 0) + value,
        });
      });

      return acc;
    },
    {} as Record<string, { createdAtWeek: string; distribution: Record<string, number> }>,
  );

  const aggregatedDdata = Object.values(aggregatedByWeek);
  const dataset = aggregatedDdata.slice(0, aggregatedDdata.length - 1); // Remove the last week data because it's not complete
  const xAxisData = dataset.map((item) => item.createdAtWeek);
  const allKeys = Array.from(new Set(dataset.flatMap((item) => Object.keys(item.distribution)))).sort((a, b) => {
    if (a === 'others') return 1;
    if (b === 'others') return -1;
    return a.localeCompare(b);
  });

  const series: echarts.EChartsOption['series'] = allKeys.map(
    (key) =>
      ({
        name: key,
        type: 'line',
        stack: 'total',
        areaStyle: {},
        lineStyle: {
          width: 0,
        },
        symbol: 'none',
        emphasis: { disabled: true },
        data: dataset.map((item) => item.distribution[key] || 0),
      }) as echarts.SeriesOption,
  );

  const option: echarts.EChartsOption = {
    darkMode: true,
    color: ChartColor.colors,
    backgroundColor: ChartColor.backgroundColor,
    tooltip: !isThumbnail
      ? {
          trigger: 'axis',
          axisPointer: { type: 'cross' },
          formatter: (params) => {
            // Filter out fields with value 0
            if (!Array.isArray(params)) return '';
            const filteredParams = params.filter((item) => item.value !== 0);

            // Construct the tooltip content
            if (filteredParams.length === 0) return ''; // No fields to display

            const header = `${(filteredParams[0] as unknown as { axisValue: string }).axisValue}<br/>`; // Show week
            const sum = `<span style="display:inline-block;margin-right:5px;border-radius:10px;width:10px;height:10px;background-color:white;"></span> Active Addresses Count: ${filteredParams.reduce(
              (acc, item) => acc + Number(item.value),
              0,
            )}<br/><hr style="margin: 4px 0" />`;
            const body = filteredParams
              .map(
                (item) =>
                  `<span style="display:inline-block;margin-right:5px;border-radius:10px;width:10px;height:10px;background-color:${typeof item.color === 'string' ? item.color : '#fff'};"></span>
             ${item.seriesName!}: ${Number(item.value)}`,
              )
              .join('<br/>');

            return header + sum + body;
          },
        }
      : undefined,
    grid: isThumbnail ? GridThumbnail : { ...Grid, ...(isMobile ? {} : { top: 108 }) },
    legend: { top: 8, data: isThumbnail || isMobile ? [] : allKeys },
    dataZoom: isThumbnail ? [] : DATA_ZOOM_CONFIG,
    xAxis: [
      {
        name: isMobile || isThumbnail ? '' : 'Week',
        nameLocation: 'middle',
        nameGap: 30,
        type: 'category',
        boundaryGap: false,
        data: xAxisData,
      },
    ],
    yAxis: {
      type: 'value',
      name: isMobile || isThumbnail ? '' : 'Active Addresses Count',
      axisLabel: {
        formatter: (value) => parseNumericAbbr(+value),
      },
    },
    series,
  };

  return (
    <SmartChartPage
      description="The number of unique addresses that have participated in the network as a sender or receiver."
      isLoading={isLoading}
      isThumbnail={isThumbnail}
      lastUpdatedTimestamp={chartData.at(-1)?.createdAtUnixtimestamp + '000'}
      option={option}
      title="Active Addresses"
      toCSV={toCSV}
    />
  );
};
