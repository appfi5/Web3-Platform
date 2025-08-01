'use client';

import BigNumber from 'bignumber.js';
import dayjs from 'dayjs';
import type * as echarts from 'echarts';

import { useIsMobile } from '~/hooks';
import { api } from '~/trpc/react';
import { parseNumericAbbr } from '~/utils/utility';

import { assertIsArray, ChartColor, DATA_ZOOM_CONFIG, Grid, GridThumbnail, tooltipColor, tooltipWidth } from './config';
import { SmartChartPage } from './SmartChartPage';

export const AddressCountChart = ({ isThumbnail = false }: { isThumbnail?: boolean }) => {
  const { data: chartData = [], isLoading } = api.v0.statistics.addressesCount.useQuery();
  const isMobile = useIsMobile();

  const toCSV = () => (chartData ? chartData.map((data) => [data.createdAtUnixtimestamp, data.addressesCount]) : []);

  const option: echarts.EChartsOption = {
    darkMode: true,
    color: ChartColor.colors,
    backgroundColor: ChartColor.backgroundColor,
    tooltip: !isThumbnail
      ? {
          trigger: 'axis',
          confine: true,
          formatter: (dataList) => {
            assertIsArray(dataList);
            const widthSpan = (value: string) => tooltipWidth(value, 120);
            const [date, count] = dataList[0]?.data as [string, string];

            let result = `<div>${tooltipColor('#333333')}${widthSpan('Date')} ${date}</div>`;
            result += `<div>${tooltipColor(ChartColor.colors[0]!)}${widthSpan('Unique Address Used')} ${parseNumericAbbr(count, 2)}</div>`;

            return result;
          },
        }
      : undefined,
    grid: isThumbnail ? GridThumbnail : Grid,
    dataZoom: isThumbnail ? [] : DATA_ZOOM_CONFIG,
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
      },
    ],
    yAxis: [
      {
        position: 'left',
        name: isMobile || isThumbnail ? '' : `Unique Address Used (Log)`,
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
    ],
    series: [
      {
        name: 'Unique Address Used',
        type: 'line',
        yAxisIndex: 0,
        symbol: isThumbnail ? 'none' : 'circle',
        symbolSize: 3,
      },
    ],
    dataset: {
      source: chartData.map((data) => [
        dayjs(+data.createdAtUnixtimestamp * 1000).format('YYYY/MM/DD'),
        new BigNumber(data.addressesCount).toNumber(),
      ]),
    },
  };

  return (
    <SmartChartPage
      description="The total number of unique addresses used on the blockchain."
      isLoading={isLoading}
      isThumbnail={isThumbnail}
      lastUpdatedTimestamp={chartData.at(-1)?.createdAtUnixtimestamp + '000'}
      option={option}
      title="Unique Addresses Used"
      toCSV={toCSV}
    />
  );
};
