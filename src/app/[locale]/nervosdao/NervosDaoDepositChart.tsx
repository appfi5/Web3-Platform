'use client';

import { LoaderIcon, TrendingUp } from 'lucide-react';
import { Area, AreaChart } from 'recharts';

import {
  type ChartConfig,
  ChartContainer,
  type ChartContainerProps,
  ChartTooltip,
  ChartTooltipContent,
} from '~/components/ui/chart';
import { cn } from '~/lib/utils';
import { api } from '~/trpc/react';
import { parseNumericAbbr } from '~/utils/utility';

const chartConfig = {
  value: {
    label: 'Value',
    color: 'hsl(var(--chart-2))',
    icon: TrendingUp,
  },
  'attributes.total_dao_deposit': {
    label: 'Total DAO Deposit',
  },
} satisfies ChartConfig;

export function NervosDaoDepositChart({ ...props }: Partial<ChartContainerProps>) {
  const { data: statistics, isLoading } = api.explorer.totalDaoDepositStatistics.useQuery();

  if (isLoading)
    return (
      <div className={cn('w-full min-h-24 bg-muted flex items-center justify-center', props.className)}>
        <LoaderIcon className="animate-spin" />
      </div>
    );

  return (
    <ChartContainer config={chartConfig} {...props}>
      <AreaChart
        accessibilityLayer
        data={statistics?.data?.data.slice(-100) ?? []}
        margin={{
          top: 12,
          left: 4,
          right: 4,
          bottom: 16,
        }}
      >
        <defs>
          <linearGradient id="colorUv" x1="0" x2="0" y1="1" y2="0">
            <stop offset="10%" stopColor="#17B830" stopOpacity={0} />
            <stop offset="80%" stopColor="#17B830" stopOpacity={1} />
          </linearGradient>
        </defs>
        <ChartTooltip
          content={
            <ChartTooltipContent indicator="line" valueFormatter={(value) => parseNumericAbbr(value as string, 2)} />
          }
          cursor={false}
        />

        <Area
          dataKey="attributes.total_dao_deposit"
          fill="url(#colorUv)"
          fillOpacity={0.4}
          stackId="a"
          stroke="#17B830"
          strokeWidth={2}
          type="natural"
        />
      </AreaChart>
    </ChartContainer>
  );
}
