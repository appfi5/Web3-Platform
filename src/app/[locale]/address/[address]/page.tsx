import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Card, CardContent } from '~/components/ui/card';
import { getAddresses, getAddressNetwork } from '~/lib/address';
import { trunkLongStr } from '~/utils/utility';

import { AddressPanel } from './AddressPanel';
import { AddressTabs } from './AddressTabs';
import { AddressValueCard } from './AddressValueCard';

type PageProps = {
  params: { locale: string; address: string };
  searchParams?: Record<string, string | undefined>;
};

export async function generateMetadata({ params: { locale, address }, searchParams }: Omit<PageProps, 'children'>) {
  const t = await getTranslations({ locale, namespace: 'metadata' });
  const tab = searchParams?.tab || 'overview';
  const chain = getAddressNetwork(address);
  const chainName = chain === 'BTC' ? 'Bitcoin' : 'CKB';

  return {
    title: t('address.title', { address: trunkLongStr(address, 6), chainName }),
    description: t('address.description', { address: trunkLongStr(address, 6) }),
    openGraph: {
      images: [
        {
          url: `/${locale}/address/${address}/${tab}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: tab,
        },
      ],
    },
  };
}

export default function AddressPage({ params: { locale, address }, searchParams }: PageProps) {
  setRequestLocale(locale);

  const tab = searchParams ? searchParams.tab! : 'overview';

  const { ckb, btc } = getAddresses(address);
  const parsedAddress = ckb ?? btc;

  if (!parsedAddress) {
    return <div>This address is invalid or not yet supported</div>;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 md:space-y-4 space-y-1">
        <Card>
          <CardContent className="md:p-4 p-2 gap-2 flex-wrap md:grid md:grid-cols-2 flex-col flex">
            <AddressPanel address={parsedAddress} className="max-w-full" />
            <AddressValueCard address={parsedAddress} className="max-w-full" />
          </CardContent>
        </Card>
        <AddressTabs address={parsedAddress} tab={tab} />
      </main>
    </div>
  );
}
