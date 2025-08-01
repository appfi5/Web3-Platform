import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Card, CardContent } from '~/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { api } from '~/trpc/server';

import { AssetActivityTable } from './AssetActivityTable';
import { AssetHoldersTable } from './AssetHoldersTable';
import AssetInfo from './AssetInfo';
import { AssetInfoPanel } from './AssetInfoPanel';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Props = {
  params: { locale: string; uid: string };
};

export async function generateMetadata({ params: { locale, uid } }: Omit<Props, 'children'>) {
  const t = await getTranslations({ locale, namespace: 'metadata' });
  const assetInfo = await api.v0.asset.detail.fetch({ assetId: uid });

  return {
    title: t('token.title', { symbol: assetInfo?.symbol ?? 'Unknown' }),
    description: t('token.description', { symbol: assetInfo?.symbol ?? 'Unknown' }),
  };
}

export default async function AssetDetailPage({
  params: { locale, uid },
}: {
  params: { locale: string; uid: string };
}) {
  setRequestLocale(locale);

  await api.v0.activity.list.prefetch({ assetId: uid, page: 1, pageSize: 10 });
  const assetInfo = await api.v0.asset.detail.fetch({ assetId: uid });
  const marketData = await api.v0.quote.latest.fetch({ assetId: uid }).catch(() => undefined);

  return (
    <HydrationBoundary state={dehydrate(api.queryClient)}>
      <main className="flex flex-col gap-2 h-full">
        <AssetInfo assetInfo={assetInfo} marketData={marketData} uid={uid} />
        <Card className="grow">
          <CardContent className="p-4 h-full">
            <Tabs className="h-full" defaultValue="activity">
              <TabsList className="mb-2">
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="holders">Holders</TabsTrigger>
                {/* <TabsTrigger value="inventory">Inventory</TabsTrigger> */}
                <TabsTrigger value="info">Info</TabsTrigger>
              </TabsList>

              <TabsContent
                className="w-full [&:not([hidden])]:flex flex-col gap-4 h-[calc(100%-2.5rem)]"
                value="activity"
              >
                <AssetActivityTable assetId={uid} />
              </TabsContent>
              <TabsContent
                className="w-full [&:not([hidden])]:flex flex-col gap-4  h-[calc(100%-2.5rem)]"
                value="holders"
              >
                <AssetHoldersTable assetId={uid} />
              </TabsContent>
              {/* <TabsContent className="w-full flex flex-col gap-4" value="inventory">
              <AssetInventoryPanel uid={uid} />
            </TabsContent> */}
              <TabsContent className="w-full [&:not([hidden])]:flex flex-col gap-4  h-[calc(100%-2.5rem)]" value="info">
                <AssetInfoPanel description={assetInfo?.description ?? ''} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </HydrationBoundary>
  );
}
