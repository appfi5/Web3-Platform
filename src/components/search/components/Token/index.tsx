'use client';

import Link from 'next/link';
import { type FC } from 'react';

import AssetInfo from '~/app/[locale]/asset/[uid]/AssetInfo';
import { Card, CardContent, CardFooter } from '~/components/ui/card';
import { api } from '~/trpc/react';

import Expand from '../../icon/expand.svg';
import ViewDetail from '../../icon/view-detail.svg';

const Token: FC<{ id: string; symbol: string }> = ({ id, symbol }) => {
  const { data: assetInfo } = api.v0.asset.detail.useQuery({ assetId: id });
  const { data: marketData } = api.v0.quote.latest.useQuery({ assetId: id });

  return (
    <Card className="p-3 h-full flex flex-col gap-2">
      <CardContent className="p-0 grow flex flex-col overflow-hidden">
        <div className="flex items-center text-base gap-1 mb-2">
          Token
          <span className="text-muted-foreground text-xs">{symbol}</span>
          <Link
            className="flex items-center ml-auto hover:opacity-80"
            href={`/asset/${id}`}
            rel="noreferrer noopener"
            target="_blank"
          >
            <Expand className="size-5" />
          </Link>
        </div>
        <div className="flex-1 flex flex-col gap-2 overflow-y-auto">
          {assetInfo && marketData && (
            <AssetInfo
              assetInfo={assetInfo}
              cardContentClassName="lg:flex-col"
              infoWrapperClassName="md:flex-col"
              marketData={marketData}
              uid={id}
            />
          )}
        </div>
      </CardContent>
      <CardFooter className="p-0 flex flex-col gap-1">
        <div className="flex justify-end w-full">
          <Link
            className="h-8 px-4 flex items-center gap-1 bg-accent text-xs text-secondary rounded-full hover:opacity-80"
            href={`/asset/${id}`}
            target="_blank"
          >
            View Token
            <ViewDetail />
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
};

export default Token;
