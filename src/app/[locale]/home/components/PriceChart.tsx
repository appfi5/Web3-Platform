'use client';

import { Area, AreaChart } from 'recharts';

import { type ChartConfig, ChartContainer } from '~/components/ui/chart';
import { cn } from '~/lib/utils';
import { api } from '~/trpc/react';

const chartConfig = {} satisfies ChartConfig;

export default function PriceChart({ className, assetId }: { className: string; assetId: string }) {
  const { data } = api.v0.quote.last7DayPrice.useQuery({ assetId });

  return (
    <ChartContainer className={cn('h-[80px] w-full', className)} config={chartConfig}>
      <AreaChart
        accessibilityLayer
        data={data}
        margin={{
          left: 8,
          right: 8,
        }}
      >
        <defs>
          <linearGradient id="fillId" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
            <stop offset="55%" stopColor="hsl(var(--primary))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          dataKey="price"
          fill="url(#fillId)"
          fillOpacity={0.4}
          stackId="a"
          stroke="hsl(var(--primary))"
          type="natural"
        />
      </AreaChart>
    </ChartContainer>
  );
}
