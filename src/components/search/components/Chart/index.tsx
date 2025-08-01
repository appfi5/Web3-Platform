'use client';

import Link from 'next/link';
import { type FC } from 'react';

import { chartMenus } from '~/app/[locale]/charts/ChartsTab';
import { Card, CardContent, CardFooter } from '~/components/ui/card';

import Expand from '../../icon/expand.svg';
import ViewDetail from '../../icon/view-detail.svg';

const Chart: FC<{ chartName: string }> = ({ chartName }) => {
  const chart = chartMenus
    .map((v) => v.charts)
    .flat()
    .find((v) => v.title === chartName);

  return (
    <Card className="p-3 h-full flex flex-col gap-2">
      <CardContent className="p-0 grow h-[calc(100%-76px)] flex flex-col">
        <div className="flex items-center text-base gap-1 mb-2">
          Chart
          <span className="text-muted-foreground text-xs">{chartName}</span>
          <Link
            className="flex items-center ml-auto hover:opacity-80"
            href={chart?.link ?? '/charts'}
            rel="noreferrer noopener"
            target="_blank"
          >
            <Expand className="size-5" />
          </Link>
        </div>
        {chart?.chart}
      </CardContent>
      <CardFooter className="p-0 flex flex-col gap-1">
        <div className="flex justify-end w-full">
          <Link
            className="h-8 px-4 flex items-center gap-1 bg-accent text-xs text-secondary rounded-full hover:opacity-80"
            href={chart?.link ?? '/charts'}
            target="_blank"
          >
            View Chart
            <ViewDetail />
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
};

export default Chart;
