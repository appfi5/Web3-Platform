import BigNumber from 'bignumber.js';

import { parseNumericAbbr } from '~/utils/utility';

export const ChartColor = {
  areaColor: '#E5FF5A',
  backgroundColor: 'transparent',
  colors: ['#E5FF5A', 'hsl(12 76% 61%)', 'hsl(173 58% 39%)', 'hsl(197 37% 24%)', 'hsl(43 74% 66%)', 'hsl(27 87% 67%)'],
};
export type ChartColorConfig = typeof ChartColor;

export const GridThumbnail = {
  left: '0%',
  right: '0%',
  top: '8%',
  bottom: '0%',
  containLabel: true,
};
export const Grid = {
  left: '5%',
  right: '3%',
  top: '10%',
  bottom: '5%',
  containLabel: true,
};

export const DATA_ZOOM_CONFIG = [
  {
    show: true,
    realtime: true,
    start: 0,
    end: 100,
    xAxisIndex: [0],
  },
  {
    type: 'inside',
    realtime: true,
    start: 0,
    end: 100,
    xAxisIndex: [0],
  },
];

export const tooltipColor = (color: string) =>
  `<span style="display:inline-block;margin-right:8px;margin-left:5px;margin-bottom:2px;border-radius:10px;width:6px;height:6px;background-color:${color}"></span>`;

export const tooltipWidth = (value: string, width: number) =>
  `<span style="width:${width}px;display:inline-block;">${value}:</span>`;

export function assertIsArray<T>(value: T | T[]): asserts value is T[] {
  if (!Array.isArray(value)) {
    throw new Error(`Value is expected to be an array, but got a ${typeof value}`);
  }
}

export const handleLogGroupAxis = (value: BigNumber | string | number, suffix?: string) => {
  const bigValue = typeof value === 'string' || typeof value === 'number' ? new BigNumber(value) : value;
  return `[${bigValue.isGreaterThanOrEqualTo(1000) ? parseNumericAbbr(bigValue.dividedBy(10), 0) : '0'}, ${parseNumericAbbr(
    value,
    0,
  )}${suffix || ''}]`;
};
