'use client';
import { Area, AreaChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts';

import { type ChartConfig, ChartContainer } from '~/components/ui/chart';
import { parseNumericAbbr } from '~/utils/utility';

const chartConfig = {
  mobile: {
    label: 'Mobile',
    color: 'hsl(var(--chart-2))',
  },
} satisfies ChartConfig;

export function RewardLineChart({ chartData }: { chartData: string[] }) {
  const data = chartData.map((d, i) => ({
    year: i + 1,
    reward: d,
  }));

  return (
    <ChartContainer className="h-60 w-full" config={chartConfig}>
      <AreaChart accessibilityLayer data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
        <XAxis axisLine dataKey="year" tickLine />
        <YAxis axisLine tickFormatter={(value: string) => `${parseNumericAbbr(value)} ckb`} tickLine />
        <CartesianGrid stroke="hsl(var(--input))" />

        <defs>
          <linearGradient id="fillMobile" x1="0" x2="0" y1="0" y2="1">
            <stop offset="5%" stopColor="var(--color-mobile)" stopOpacity={0.8} />
            <stop offset="95%" stopColor="var(--color-mobile)" stopOpacity={0.1} />
          </linearGradient>
        </defs>
        <Area
          activeDot={{
            r: 6,
          }}
          dataKey="reward"
          dot={{
            fill: 'var(--color-desktop)',
          }}
          fill="url(#fillMobile)"
          fillOpacity={0.4}
          stackId="a"
          stroke="var(--color-mobile)"
          type="natural"
        >
          <LabelList
            className="fill-foreground"
            fontSize={12}
            formatter={(value: string) => `${parseNumericAbbr(value, 2)} CKB`}
            offset={12}
            position="top"
          />
        </Area>
      </AreaChart>
    </ChartContainer>
  );
}
