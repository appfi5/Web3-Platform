'use client';
import { useId, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from 'recharts';

import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '~/components/ui/chart';
import { useIsMobile } from '~/hooks';

const chartConfig = {
  desktop: {
    label: 'Desktop',
    color: '#2563eb',
  },
} satisfies ChartConfig;

const DIGIT_WIDTH_MAP: Record<string, number> = {
  '1': 30,
  '2': 30,
  '3': 30,
  '4': 36,
  '5': 42,
  '6': 48,
  '7': 60,
};

export function TransactionCountChart({ chartData }: { chartData: { month: string; count: number }[] }) {
  const chartId = useId();
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  const isMobile = useIsMobile();
  const maxCountDigit = ([...chartData].sort((a, b) => b.count - a.count)[0]?.count ?? 0).toString().length.toString();

  return (
    <ChartContainer className="w-full h-64 bg-muted rounded-lg p-3 min-w-[600px]" config={chartConfig}>
      <BarChart accessibilityLayer data={chartData} dataKey="count">
        <defs>
          <linearGradient id={chartId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#E5FF5A" stopOpacity={1} />
            <stop offset="100%" stopColor="#E5FF5A" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />

        <YAxis
          axisLine={false}
          dataKey="count"
          tickLine={false}
          width={isMobile ? (DIGIT_WIDTH_MAP[maxCountDigit] ?? 30) : 60}
        />
        <XAxis axisLine={false} dataKey="month" tickLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} cursor={false} />

        <Bar
          barSize={32}
          dataKey="count"
          fill="#23272C"
          onMouseEnter={(_, index) => setActiveIndex(index)}
          onMouseLeave={() => setActiveIndex(undefined)}
          radius={[999, 999, 0, 0]}
          width={32}
        >
          {chartData.map((data, index) => (
            <Cell fill={activeIndex === index ? `url(#${chartId})` : '#23272C'} key={data.month} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
