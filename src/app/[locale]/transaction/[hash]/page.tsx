import { getTranslations } from 'next-intl/server';
import React from 'react';

import { api } from '~/trpc/server';
import { trunkLongStr } from '~/utils/utility';

import Container from './components/Container';

type Props = {
  params: { locale: string; hash: string };
};

export async function generateMetadata({ params: { locale, hash } }: Omit<Props, 'children'>) {
  const t = await getTranslations({ locale, namespace: 'metadata' });
  const network = await api.v0.txs.network.fetch({ txHash: hash });

  const chainName = network === 'btc' ? 'Bitcoin' : 'CKB';
  const txHash = network === 'btc' ? hash.replace('0x', '') : hash;

  return {
    title: t('transaction.title', { hash: trunkLongStr(txHash, 6), chainName }),
    description: t('transaction.description', { hash: txHash, chainName }),
  };
}

export default function TransactionPage({
  params: { hash },
}: {
  params: {
    hash: string;
  };
}) {
  return <Container hash={hash} />;
}
