'use client';

import Image from 'next/image';
import Link from 'next/link';

import { CardContent } from '~/components/Card';
import { cn } from '~/lib/utils';
import { type NetworkInput } from '~/server/api/routers/zod-helper';
import { api } from '~/trpc/react';
import { NATIVE_ASSETS } from '~/utils/const';
import { dayjs, localeNumberString, parseNumericAbbr } from '~/utils/utility';

import PriceChart from './PriceChart';

export default function AssetInfo({ assetId, network }: { assetId: string; network: NetworkInput }) {
  const { data: latestMarket } = api.v0.quote.latest.useQuery(
    { assetId },
    {
      refetchInterval: 5000,
    },
  );
  const { data: latestBlock } = api.v0.blocks.latest.useQuery(
    { network },
    {
      refetchInterval: 5000,
    },
  );

  return (
    <div className="flex flex-col gap-2 md:min-w-[350px] min-w-0">
      <div className="flex flex-col md:flex-row gap-2">
        <CardContent className="flex flex-col justify-between">
          <div className="flex gap-1 items-center">
            <Image alt={network} height={32} src={`/img/${network}.png`} width={32} />
            <h2 className="text-4 font-semibold">{network.toUpperCase()}</h2>
          </div>

          <div className="text-[14px] flex md:flex-col flex-row justify-between">
            <p className="text-secondary mt-2">Latest Block</p>
            <div className="flex justify-between items-center mt-2 gap-4">
              <Link href={`/block/${network}/${latestBlock?.height}`}>
                <p className="text-primary font-semibold">
                  {latestBlock?.height ? localeNumberString(latestBlock.height) : '-'}
                </p>
              </Link>
              <p className="text-[13px]">{latestBlock?.time ? dayjs(Number(latestBlock.time)).fromNow() : '-'}</p>
            </div>
          </div>
        </CardContent>

        <CardContent className="flex-1 flex justify-between text-[14px] gap-4">
          <div className="text-secondary flex flex-col gap-2.5">
            <p>Market cap</p>
            <p>Volume (24H)</p>
            <p>Circulating supply</p>
            <p>Max supply</p>
          </div>
          <div className="flex flex-col gap-2.5">
            <p>$ {parseNumericAbbr(latestMarket?.marketCap ?? 0, 2)}</p>
            <p>$ {parseNumericAbbr(latestMarket?.tradingVolume24h ?? 0, 2)}</p>
            <p>{parseNumericAbbr(latestMarket?.totalSupply ?? 0, 2)}</p>
            <p>{latestMarket?.maxSupply === null ? '∞' : parseNumericAbbr(latestMarket?.maxSupply ?? 0)}</p>
          </div>
        </CardContent>
      </div>

      <CardContent className="flex-1 flex justify-between items-center text-[14px] px-2 md:px-7">
        <p className="text-secondary text-[13px]">Price</p>
        <p className="text-primary text-[18px] font-semibold">
          $ {localeNumberString(latestMarket?.price ?? 0, assetId === NATIVE_ASSETS.CKB ? 6 : 2)}
        </p>
        <div
          className={cn(
            'text-[18px] font-semibold flex items-center',
            Number(latestMarket?.priceChange24h ?? 0) > 0 ? 'text-rise' : 'text-down',
          )}
        >
          {localeNumberString(latestMarket?.priceChange24h ?? 0, 2)}%
          <Image
            alt={network}
            height={16}
            src={`/img/${Number(latestMarket?.priceChange24h ?? 0) > 0 ? 'ups' : 'downs'}.svg`}
            width={16}
          />
          <span className="text-secondary text-[13px] font-normal ml-1">(24H)</span>
        </div>
      </CardContent>

      <CardContent className="flex-1 text-[13px]">
        <p>Last 7 Days</p>
        <PriceChart assetId={assetId} className="mt-6" />
      </CardContent>
    </div>
  );
}
