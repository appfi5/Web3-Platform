import dynamic from 'next/dynamic';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Card } from '~/components/Card';
import { NATIVE_ASSETS } from '~/utils/const';

import AssetInfo from './components/AssetInfo';

type Props = {
  params: { locale: string };
};

const DataTable = dynamic(() => import('./components/DataTable'), { ssr: false });

export async function generateMetadata({ params: { locale } }: Omit<Props, 'children'>) {
  const t = await getTranslations({ locale, namespace: 'metadata' });

  return {
    title: t('home.title'),
    description: t('home.description'),
  };
}

export default async function HomePage({ params: { locale } }: Props) {
  // Enable static rendering
  setRequestLocale(locale);

  // const t = useTranslations('common');

  return (
    <div className="flex flex-col home-mobile:flex-row gap-2">
      <div className="shrink-0 flex gap-2 flex-col">
        <Card className="grow">
          <AssetInfo assetId={NATIVE_ASSETS.CKB} network="ckb" />
        </Card>
        <Card className="grow">
          <AssetInfo assetId={NATIVE_ASSETS.BTC} network="btc" />
        </Card>
      </div>
      <Card className="flex-1">
        <div className="home-mobile:bg-card-content p-0 home-mobile:p-3 rounded-[12px]">
          <DataTable />
        </div>
      </Card>
    </div>
  );
}
