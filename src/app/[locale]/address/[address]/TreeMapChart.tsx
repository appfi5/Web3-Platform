'use client';

import { LoaderCircle } from 'lucide-react';
import React from 'react';
import { Treemap } from 'recharts';

import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '~/components/ui/chart';
import { api } from '~/trpc/react';

import EmptySvg from './empty.svg';

function scale(logMin: number, logMax: number, data: number): number {
  const logRange = logMax - logMin;
  const normalizedData = (data - logMin) / logRange;

  const minValue = 100;
  const maxValue = 1000;

  return minValue + (maxValue - minValue) * normalizedData;
}

const chartConfig = {} satisfies ChartConfig;

const CustomContent = ({
  depth = 0,
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  volume = '',
  symbol = '',
  percentChange24h = 0,
}: {
  depth?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  volume?: string;
  symbol?: string;
  percentChange24h?: number;
}) => {
  const isPositive = percentChange24h >= 0;
  const backgroundColor = isPositive ? '#51DA92' : '#F66060';

  const centerX = x + width / 2;
  const centerY = y + height / 2;

  // 动态计算字体大小（以宽度和高度的最小值为基准）
  const fontSize = Math.min(Math.min(width, height) * 0.15, 36); // 调整系数 0.15
  const secondaryFontSize = Math.max(14, fontSize * 0.8); // 次要文字的字体大小
  const tertiaryFontSize = Math.max(12, secondaryFontSize * 0.8);
  const distance = fontSize + 2;

  if (depth === 1) {
    return (
      <g key={symbol}>
        <rect fill={backgroundColor} height={height} stroke="#000" width={width} x={x} y={y} />
        {width > 40 &&
          height > 20 && ( // 仅当矩形尺寸足够大时显示文字
            <>
              <text
                dominantBaseline="middle" // 垂直居中
                fill="#171A1F"
                fontSize={fontSize}
                fontWeight="600"
                strokeWidth="0"
                textAnchor="middle" // 水平居中
                x={centerX}
                y={centerY - distance} // 每行文字的垂直间距
              >
                {symbol}
              </text>
              <text
                className="text-[#171A1F]"
                dominantBaseline="middle"
                fill="#171A1F"
                fontSize={secondaryFontSize}
                fontWeight="600"
                strokeWidth="0"
                textAnchor="middle"
                x={centerX}
                y={centerY}
              >
                ${volume}
              </text>
              <text
                dominantBaseline="middle"
                fill="#171A1F"
                fontSize={tertiaryFontSize}
                strokeWidth="0"
                textAnchor="middle"
                x={centerX}
                y={centerY + distance} // 下一行文字
              >
                <tspan fontSize={12}>{isPositive ? '▲' : '▼'}</tspan> {Math.abs(percentChange24h).toFixed(2)}%
              </text>
            </>
          )}
      </g>
    );
  }
  return null;
};

export function TreeMapChart({ address }: { address: string }) {
  const { data: _data = [], isLoading } = api.v0.address.assets.useQuery({ address });

  const data = _data.filter((d) => Number(d.amountUsd) > 0);

  const min = Math.min(...data.map((d) => Number(d.amountUsd)));
  const max = Math.max(...data.map((d) => Number(d.amountUsd)));

  const chartData = data
    .filter((d) => Number(d.amountUsd) > 0)
    .map((d) => {
      return {
        symbol: d.assetInfo?.symbol,
        value: scale(min, max, Number(d.amountUsd)),
        volume: Number(d.amountUsd).toLocaleString(undefined, { minimumFractionDigits: 2 }),
        percentChange24h: d.percentChange24h,
        children: [],
      };
    });

  if (isLoading) {
    return (
      <div className="w-full h-full flex justify-center items-center">
        <LoaderCircle className="animate-spin" />
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="w-full min-h-64 h-full bg-muted flex flex-col items-center justify-center">
        <EmptySvg className="w-24" />
        <p>No Data</p>
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig}>
      <Treemap content={<CustomContent />} data={chartData} nameKey="symbol">
        <ChartTooltip content={<ChartTooltipContent dataKey="volume" indicator="line" />} cursor={false} />
      </Treemap>
    </ChartContainer>
  );
}
