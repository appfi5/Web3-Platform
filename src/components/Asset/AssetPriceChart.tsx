'use client';

import { TrendingUp } from 'lucide-react';
import { useId } from 'react';
import { Area, AreaChart, YAxis } from 'recharts';

import {
  type ChartConfig,
  ChartContainer,
  type ChartContainerProps,
  ChartTooltip,
  ChartTooltipContent,
} from '~/components/ui/chart';

const chartConfig = {
  value: {
    label: 'Value',
    color: 'hsl(var(--chart-2))',
    icon: TrendingUp,
  },
} satisfies ChartConfig;

export function AssetPriceChart({
  chartData,
  ...props
}: Partial<ChartContainerProps> & {
  chartData: { date: string; value: number }[];
}) {
  const chartId = useId();

  return (
    <ChartContainer config={chartConfig} {...props}>
      <AreaChart accessibilityLayer data={chartData}>
        <defs>
          <linearGradient id={chartId} x1="0" x2="0" y1="1" y2="0">
            <stop offset="10%" stopColor="#E5FF5A" stopOpacity={0} />
            <stop offset="80%" stopColor="#EFE9DF" stopOpacity={0.6} />
          </linearGradient>
        </defs>
        <ChartTooltip content={<ChartTooltipContent indicator="line" />} cursor={false} />

        <YAxis domain={[(dataMin: number) => dataMin * 0.8, (dataMax: number) => dataMax * 1.2]} hide />
        <Area
          dataKey="value"
          fill={`url(#${chartId})`}
          fillOpacity={0.4}
          stackId="a"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          type="natural"
        />
      </AreaChart>
    </ChartContainer>
  );
}
