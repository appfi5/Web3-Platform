'use client';

import BigNumber from 'bignumber.js';
import { useState } from 'react';
import { Legend, type LegendProps, Pie, PieChart, Sector, type SectorProps } from 'recharts';

import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '~/components/ui/chart';

const chartConfig = {
  count: {
    label: 'Count',
  },
} satisfies ChartConfig;

const renderActiveShape = ({ outerRadius = 0, ...props }: SectorProps) => {
  return <Sector outerRadius={outerRadius + 10} {...props} />;
};

const renderLegend: LegendProps['content'] = (props) => {
  const { payload = [] } = props;

  return (
    <ul className="flex flex-col gap-2">
      {payload.map((entry, index) => (
        <li className="flex gap-2" key={'item' + index}>
          <span className={`w-4 h-4 rounded-full`} style={{ backgroundColor: entry.color }} />
          <div className="flex flex-col gap-1">
            <div className="flex gap-2 text-muted-foreground">{entry.value}</div>
            <div>
              <span className="font-bold text-base">
                {((entry.payload?.value as string) ?? '0').toLocaleString().split('.')[0]}.
              </span>
              <span className="text-xs text-muted-foreground">
                {((entry.payload?.value as string) ?? '0').toString().split('.')[1]}
              </span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
};

export function IssuancePieChart({
  miningReward,
  depositCompensation,
  treasuryAmount,
}: {
  miningReward: string;
  depositCompensation: string;
  treasuryAmount: string;
}) {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  const chartData = [
    { type: 'Mining Reward', count: BigNumber(miningReward).div(Math.pow(10, 8)).toNumber(), fill: '#6074F6' },
    {
      type: 'Deposit Compensation',
      count: BigNumber(depositCompensation).div(Math.pow(10, 8)).toNumber(),
      fill: '#FDCB5D',
    },
    { type: 'Burnt', count: BigNumber(treasuryAmount).div(Math.pow(10, 8)).toNumber(), fill: '#51DA92' },
  ];

  return (
    <ChartContainer className="max-h-[200px] w-full" config={chartConfig}>
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent hideLabel />} cursor={false} />
        <Pie
          activeIndex={activeIndex}
          activeShape={renderActiveShape}
          data={chartData}
          dataKey="count"
          nameKey="type"
          onMouseEnter={(_, index) => setActiveIndex(index)}
          onMouseLeave={() => setActiveIndex(undefined)}
          outerRadius={80}
        />
        <Legend
          align="right"
          content={renderLegend}
          iconType="circle"
          layout="vertical"
          onMouseEnter={(_, index) => setActiveIndex(index)}
          onMouseLeave={() => setActiveIndex(undefined)}
          verticalAlign="middle"
        />
      </PieChart>
    </ChartContainer>
  );
}
