'use client';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';
import { type ComponentProps } from 'react';

import { CardContent } from '~/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTriggerBorder } from '~/components/ui/tabs';
import { type Network } from '~/server/api/routers/zod-helper';

import { BlockAddresses } from './BlockAddresses';
import { BlockAssets } from './BlockAssets';

export const BlockStatistic = ({
  blockNumber,
  network,
  blockHash,
  tab,
}: ComponentProps<'div'> & { tab: string; blockHash: string; blockNumber: number; network: Network }) => {
  const t = useTranslations('BlockPage');
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams?.toString());
      params.set(name, value);

      return params.toString();
    },
    [searchParams],
  );

  return (
    <>
      <CardContent className="p-2 flex flex-col gap-8">
        <Tabs
          defaultValue="addresses"
          onValueChange={(tab) => router.push(pathname + '?' + createQueryString('tab', tab))}
          value={tab}
        >
          <TabsList className="mb-4 bg-transparent w-full md:w-auto">
            <TabsTriggerBorder className="border-none w-full" value="addresses">
              {t('statistic.tabs.address')}
            </TabsTriggerBorder>
            <TabsTriggerBorder className="border-none w-full" value="assets">
              {t('statistic.tabs.asset')}
            </TabsTriggerBorder>
          </TabsList>

          <TabsContent className="w-full flex flex-col gap-4" value="addresses">
            <BlockAddresses blockHash={blockHash} network={network} />
          </TabsContent>
          <TabsContent className="w-full flex flex-col gap-4" value="assets">
            <BlockAssets blockHash={blockHash} blockNumber={blockNumber} network={network} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </>
  );
};
