import { CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import React, { type FC } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { Card, CardContent } from '~/components/ui/card';
import { cn } from '~/lib/utils';
import { type RouterOutputs } from '~/trpc/react';
import { cssstring } from '~/utils/cssstring';

import { formatCurrency, formatNumber } from '../format';
import { AssetPricePanel } from './AssetPricePanel';

const AssetInfo: FC<{
  uid: string;
  assetInfo: RouterOutputs['v0']['asset']['detail'];
  marketData?: RouterOutputs['v0']['quote']['latest'];
  cardContentClassName?: string;
  infoWrapperClassName?: string;
}> = ({ uid, assetInfo, marketData, cardContentClassName, infoWrapperClassName }) => {
  return (
    <Card>
      <CardContent className={cn('p-4 flex flex-col lg:flex-row gap-2', cardContentClassName)}>
        <div className="bg-muted p-3 rounded-lg flex-1">
          <div className={cn('flex flex-col md:flex-row gap-4 justify-between', infoWrapperClassName)}>
            <div className="flex flex-col gap-3 h-full">
              <div className="flex items-center gap-2">
                <Avatar className="w-12 h-12 rounded-full flex items-center justify-center">
                  {assetInfo?.icon && <AvatarImage alt={`$${assetInfo.symbol}`} src={assetInfo.icon} />}
                  <AvatarFallback>{(assetInfo?.symbol ?? '?').substring(0, 2)}</AvatarFallback>
                </Avatar>

                <div className="flex flex-col">
                  <div className="flex gap-2 items-center">
                    <span className="font-bold text-lg">{assetInfo?.symbol}</span>
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                  </div>

                  <div className="flex gap-2 items-center">
                    <span className="font-bold text-primary">{formatCurrency(assetInfo?.price ?? 0)}</span>

                    <span
                      className={cn('text-sm flex items-center', {
                        ['text-rise']: (marketData?.priceChange24h ?? 0) >= 0,
                        ['text-down']: (marketData?.priceChange24h ?? 0) < 0,
                      })}
                    >
                      {(marketData?.priceChange24h ?? 0) >= 0 ? <ChevronUp size="1rem" /> : <ChevronDown size="1rem" />}
                      {formatNumber(marketData?.priceChange24h, { mantissa: 2 })}%
                      <span className="text-muted-foreground ml-1">(24H)</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex mt-auto flex-wrap gap-1">
                {assetInfo?.tags.map(({ label, style }) => (
                  <span className="text-sm bg-border px-2 rounded-sm" key={label} style={style ? cssstring(style) : {}}>
                    {label}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-1 [&>*]:text-nowrap [&>*:nth-child(even)]:text-right">
              <span className="text-muted-foreground text-sm">Market cap</span>
              <span className="text-sm">{formatCurrency(marketData?.marketCap, { average: true })}</span>
              <span className="text-muted-foreground text-sm">Volume (24H)</span>
              <span className="text-sm">{formatCurrency(marketData?.tradingVolume24h, { average: true })}</span>
              <span className="text-muted-foreground text-sm">Supply</span>
              <span className="text-sm">{formatNumber(marketData?.totalSupply, { average: true })}</span>
              <span className="text-muted-foreground text-sm">Holders</span>
              <span className="text-sm">{formatNumber(assetInfo?.holderCount ?? 0)}</span>
            </div>
          </div>
        </div>
        <AssetPricePanel className="flex-1 min-w-20" uid={uid} />
      </CardContent>
    </Card>
  );
};

export default AssetInfo;
