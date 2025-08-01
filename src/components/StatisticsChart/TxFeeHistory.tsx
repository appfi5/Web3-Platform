'use client';

import BigNumber from 'bignumber.js';
import dayjs from 'dayjs';
import type * as echarts from 'echarts';

import { env } from '~/env';
import { useIsMobile } from '~/hooks';
import { api } from '~/trpc/react';
import { parseNumericAbbr, shannonToCkbDecimal } from '~/utils/utility';

import { ChartColor, DATA_ZOOM_CONFIG, Grid, GridThumbnail } from './config';
import { SmartChartPage } from './SmartChartPage';

export const TxFeeHistoryChart = ({ isThumbnail = false }: { isThumbnail?: boolean }) => {
  const { data: chartData = [], isLoading } = api.v0.statistics.txFeeHistory.useQuery();
  const isMobile = useIsMobile();

  const toCSV = () =>
    chartData ? chartData.map((data) => [data.createdAtUnixtimestamp, shannonToCkbDecimal(data.totalTxFee, 8)]) : [];

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
        name: isMobile || isThumbnail ? '' : `Transaction Fee (CKB) `,
        type: 'value',
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
        name: 'Transaction Fee (CKB)',
        type: 'line',
        yAxisIndex: 0,
        symbol: isThumbnail ? 'none' : 'circle',
        symbolSize: 3,
        tooltip: {
          valueFormatter: (value) => parseNumericAbbr(new BigNumber(value as unknown as number)),
        },
      },
    ],
    dataset: {
      source: chartData.map((d) => [
        dayjs(+d.createdAtUnixtimestamp * 1000).format('YYYY/MM/DD'),
        shannonToCkbDecimal(d.totalTxFee, 4),
      ]),
    },
  };

  return (
    <SmartChartPage
      description="Total transaction fees charged by miners."
      isLoading={isLoading}
      isThumbnail={isThumbnail}
      lastUpdatedTimestamp={chartData.at(-1)?.createdAtUnixtimestamp + '000'}
      option={option}
      scale={{
        enable: true,
        initialScaleType: env.NEXT_PUBLIC_IS_MAINNET ? 'log' : 'linear',
      }}
      title="Transaction Fee"
      toCSV={toCSV}
    />
  );
};
