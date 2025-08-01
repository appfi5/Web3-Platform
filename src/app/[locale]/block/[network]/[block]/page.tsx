import { getTranslations } from 'next-intl/server';

import { Card, CardContent } from '~/components/ui/card';
import { type Network } from '~/server/api/routers/zod-helper';
import { api } from '~/trpc/server';

import { BlockHeader } from './components/BlockHeader';
import { BlockStatistic } from './components/BlockStatistic';
import { BlockTabs } from './components/BlockTabs';
import { BlockTransactions } from './components/BlockTransactions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Props = {
  params: { locale: string; block: string; network: Network };
  searchParams?: Record<string, string | undefined>;
};

export async function generateMetadata({ params: { locale, block, network }, searchParams }: Omit<Props, 'children'>) {
  const t = await getTranslations({ locale, namespace: 'metadata' });
  const tab = searchParams?.tab || 'overview';
  const blockInfo = await api.v0.blocks.detail.fetch({
    network,
    hashOrHeight: block,
  });

  return {
    title: t('block.title', { blockNumber: blockInfo?.height ?? 'Unknown', chainName: network.toUpperCase() }),
    description: t('block.description', {
      blockNumber: blockInfo?.height ?? 'Unknown',
      chainName: network.toUpperCase(),
    }),
    openGraph: {
      images: [
        {
          url: `/${locale}/block/${network}/${block}/share/${tab}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: tab,
        },
      ],
    },
  };
}

export default async function BlockPage({ params: { block, network }, searchParams }: Props) {
  const blockInfo = await api.v0.blocks.detail.fetch({
    network,
    hashOrHeight: block,
  });

  if (!blockInfo) return null;

  const tab = searchParams?.tab || 'overview';

  const latestBlockPromise = api.v0.blocks.latest.fetch({ network });
  const initialTransactionListPromise = api.v0.blocks.txs.fetch({
    blockHash: blockInfo.hash,
    page: 1,
    pageSize: 10,
  });
  const [latestBlock, initialTransactionList] = await Promise.all([latestBlockPromise, initialTransactionListPromise]);

  return (
    <div className="flex flex-col">
      <main className="flex-1 space-y-4">
        <BlockHeader
          blockHash={blockInfo.hash}
          blockInfo={blockInfo}
          blockNumber={blockInfo.height}
          latestBlock={latestBlock.height}
          network={network}
        />
        <Card>
          <CardContent className="p-1 md:p-2">
            <BlockTabs tab={tab} />
            {tab === 'overview' && (
              <div className="w-full flex flex-col gap-4">
                <BlockTransactions
                  blockHash={blockInfo.hash}
                  initialData={initialTransactionList}
                  network={network}
                  overview={{
                    totalTxs: blockInfo.txCount,
                    txAmount: blockInfo.txAmount,
                    txFee: blockInfo.txFee,
                    token: blockInfo.token,
                  }}
                />
              </div>
            )}
            {['addresses', 'assets'].includes(tab) && (
              <div className="w-full flex flex-col gap-4">
                <BlockStatistic blockHash={blockInfo.hash} blockNumber={blockInfo.height} network={network} tab={tab} />
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
