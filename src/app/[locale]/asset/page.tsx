import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getTranslations } from 'next-intl/server';

import { Card, CardContent } from '~/components/ui/card';
import { api } from '~/trpc/server';

import { AssetDataTable } from './AssetDataTable';

export const revalidate = 3;

type Props = {
  params: { locale: string };
};

export async function generateMetadata({ params: { locale } }: Omit<Props, 'children'>) {
  const t = await getTranslations({ locale, namespace: 'metadata' });

  return {
    title: t('asset.title'),
    description: t('asset.description'),
  };
}

export default async function Component() {
  await api.v0.asset.list.prefetch({
    page: 1,
    pageSize: 10,
  });

  return (
    <Card>
      <CardContent>
        <HydrationBoundary state={dehydrate(api.queryClient)}>
          <AssetDataTable />
        </HydrationBoundary>
      </CardContent>
    </Card>
  );
}
