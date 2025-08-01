'use client';

import { useState } from 'react';
import { Legend, Pie, PieChart, Sector, type SectorProps } from 'recharts';

import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '~/components/ui/chart';

const chartData = [
  { type: 'unrecorded', count: 275, fill: '#F66060' },
  { type: 'unbilled', count: 200, fill: '#6074F6' },
  { type: 'unphotographed', count: 187, fill: '#FDCB5D' },
  { type: 'unlocked', count: 173, fill: '#51DA92' },
  { type: 'patrol', count: 90, fill: '#51B9DA' },
  { type: 'absences', count: 32, fill: '#BD60F6' },
];

const chartConfig = {
  count: {
    label: 'Count',
  },
} satisfies ChartConfig;

const renderActiveShape = ({ innerRadius = 0, outerRadius = 0, ...props }: SectorProps) => {
  return <Sector innerRadius={innerRadius + 10} outerRadius={outerRadius + 10} {...props} />;
};

export function CellCountPieChart() {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  return (
    <ChartContainer config={chartConfig}>
      <PieChart height={240} width={240}>
        <ChartTooltip content={<ChartTooltipContent hideLabel />} cursor={false} />
        <Pie
          activeIndex={activeIndex}
          activeShape={renderActiveShape}
          cornerRadius={4}
          data={chartData}
          dataKey="count"
          innerRadius={40}
          nameKey="type"
          onMouseEnter={(_, index) => setActiveIndex(index)}
          onMouseLeave={() => setActiveIndex(undefined)}
          outerRadius={80}
          paddingAngle={4}
        />
        <Legend
          align="left"
          height={240}
          iconSize={8}
          iconType="circle"
          layout="vertical"
          onMouseEnter={(_, index) => setActiveIndex(index)}
          onMouseLeave={() => setActiveIndex(undefined)}
          verticalAlign="middle"
          width={160}
        />
      </PieChart>
    </ChartContainer>
  );
}
