'use client';
import { type ComponentProps } from 'react';

import { CardContent } from '~/components/ui/card';
import { type Network } from '~/server/api/routers/zod-helper';
import { type RouterOutputs } from '~/trpc/react';

import { BlockTransactionList } from './BlockTransactionList';
import { BlockTransactionOverview, type TransactionOverview } from './BlockTransactionOverview';

export const BlockTransactions = ({
  blockHash,
  initialData,
  network,
  overview,
}: ComponentProps<'div'> & {
  network: Network;
  initialData: RouterOutputs['v0']['blocks']['txs'];
  blockHash: string;
  overview: TransactionOverview;
}) => {
  return (
    <>
      <CardContent className="p-1 md:p-2 flex flex-col gap-[8px]">
        <BlockTransactionOverview network={network} overview={overview} />
        <BlockTransactionList blockHash={blockHash} network={network} initialData={initialData} />
      </CardContent>
    </>
  );
};
