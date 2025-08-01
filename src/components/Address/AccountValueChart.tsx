'use client';

import { TrendingUp } from 'lucide-react';
import { Area, AreaChart } from 'recharts';

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

export function AccountValueChart({
  chartData,
  ...props
}: Partial<ChartContainerProps> & {
  chartData: { date: string; value: number }[];
}) {
  return (
    <ChartContainer config={chartConfig} {...props}>
      <AreaChart
        accessibilityLayer
        data={chartData}
        margin={{
          top: 12,
          left: 4,
          right: 4,
          bottom: 16,
        }}
      >
        <defs>
          <linearGradient id="colorUv" x1="0" x2="0" y1="1" y2="0">
            <stop offset="10%" stopColor="#EFE9DF" stopOpacity={0} />
            <stop offset="80%" stopColor="#DAB451" stopOpacity={0.6} />
          </linearGradient>
        </defs>
        <ChartTooltip content={<ChartTooltipContent indicator="line" />} cursor={false} />

        <Area
          dataKey="value"
          fill="url(#colorUv)"
          fillOpacity={0.4}
          stackId="a"
          stroke="#FFBD5A"
          strokeWidth={2}
          type="natural"
        />
      </AreaChart>
    </ChartContainer>
  );
}
