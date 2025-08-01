'use client';

import type * as echarts from 'echarts';

import { useIsMobile } from '~/hooks';
import { api } from '~/trpc/react';
import { parseNumericAbbr } from '~/utils/utility';

import { ChartColor, DATA_ZOOM_CONFIG, Grid, GridThumbnail } from './config';
import { SmartChartPage } from './SmartChartPage';

export const ContractResourceDistributedChart = ({ isThumbnail = false }: { isThumbnail?: boolean }) => {
  const { data: chartData = [], isLoading } = api.v0.statistics.contractResourceDistributed.useQuery();

  const h24TxCountSortedList: number[] = chartData.map((data) => Number(data.h24TxCount)).sort((a, b) => b - a);

  const isMobile = useIsMobile();

  const toCSV = () =>
    chartData
      ? chartData.map((data) => [
          data.name ?? '',
          data.codeHash,
          data.hashType,
          data.txCount,
          data.ckbAmount,
          data.addressCount,
          data.h24TxCount,
        ])
      : [];

  const option: echarts.EChartsOption = {
    color: ChartColor.colors,
    backgroundColor: ChartColor.backgroundColor,
    tooltip: !isThumbnail
      ? {
          trigger: 'item',
          axisPointer: {
            type: 'cross',
            label: {
              show: false,
            },
          },
          formatter: (params) => {
            if (params && 'data' in params) {
              const [addrCount, ckbAmount, txCount, codeHash, tag, hashType, h24TxCount] = params.data as [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
              ];
              const script =
                tag || `<div style="white-space: pre">Code Hash: ${codeHash}\nHash Type: ${hashType}</div>`;
              return `<table>
                      <tr>
                        <td>Script:</td>
                        <td>${script}</td>
                      </tr>
                      <tr>
                        <td>Address: </td>
                        <td>${Number(addrCount).toLocaleString('en')}</td>
                      </tr>
                      <tr>
                        <td>CKB: </td>
                        <td>${Number(ckbAmount).toLocaleString('en')}</td>
                      </tr>
                      <tr>
                        <td>BTC Transaction Count: </td>
                        <td>${Number(txCount).toLocaleString('en')}</td>
                      </tr>
                      <tr>
                        <td>24hr Transaction Count: </td>
                        <td>${Number(h24TxCount).toLocaleString('en')}</td>
                      </tr>
                    </table>`;
            }
            return '';
          },
        }
      : undefined,
    grid: isThumbnail ? GridThumbnail : Grid,
    dataZoom: isThumbnail ? [] : DATA_ZOOM_CONFIG,
    xAxis: [
      {
        name: isMobile || isThumbnail ? '' : 'Address Count',
        nameLocation: 'middle',
        nameGap: 30,
        type: 'log',
        splitLine: { show: false },
      },
    ],
    yAxis: [
      {
        type: 'log',
        splitLine: { show: false },
        name: isMobile || isThumbnail ? '' : 'CKB Amount',
        axisLabel: {
          formatter: (value) => parseNumericAbbr(value),
        },
      },
    ],
    visualMap: [
      {
        min:
          h24TxCountSortedList[h24TxCountSortedList.length - 1] === undefined
            ? 0
            : h24TxCountSortedList[h24TxCountSortedList.length - 1],
        max: h24TxCountSortedList[0] === undefined ? 200 : h24TxCountSortedList[0],
        dimension: 6,
        orient: 'vertical',
        right: 10,
        top: 'center',
        text: ['HIGH', 'LOW'],
        calculable: true,
        itemWidth: 4,
        show: !isThumbnail,
        inRange: {
          color: ['#F7C242', '#F75C2F'],
        },
      },
    ],
    series: [
      {
        type: 'scatter',
        symbol: 'circle',
        symbolSize: (data: [number, number, number]) => {
          const ratio = isThumbnail ? 500 : 50;
          const min = isThumbnail ? 1 : 10;
          const size = Math.sqrt(data[2]) / ratio;
          return size < min ? min : size;
        },
      },
    ],
    dataset: {
      source: chartData.map((data) => [
        data.addressCount,
        data.ckbAmount,
        data.txCount,
        data.codeHash,
        data.name,
        data.hashType,
        data.h24TxCount,
      ]),
    },
  };

  return (
    <SmartChartPage
      description="The x axis represents contract's unique address count, the y axis represents the contract's CKB amount, the symbol size represents the contract's transaction count."
      isLoading={isLoading}
      isThumbnail={isThumbnail}
      lastUpdatedTimestamp={new Date().getTime().toString()}
      option={option}
      title="Contract Resource Distribution"
      toCSV={toCSV}
    />
  );
};
