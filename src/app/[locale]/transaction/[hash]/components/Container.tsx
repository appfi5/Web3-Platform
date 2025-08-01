'use client';
import React from 'react';

import { api } from '~/trpc/react';

import { TransactionDetail } from './TransactionDetail';
import { TransactionInfo } from './TransactionInfo';

export default function Container({ hash }: { hash: string }) {
  const { data: tx } = api.v0.txs.detail.useQuery({ txHash: hash });

  return (
    <div className="flex flex-col gap-2">
      <TransactionInfo hash={hash} tx={tx} />
      {tx ? <TransactionDetail tx={tx} /> : null}
    </div>
  );
}
