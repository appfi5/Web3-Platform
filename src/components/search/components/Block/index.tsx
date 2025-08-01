'use client';

import Link from 'next/link';
import { type FC, useEffect, useState } from 'react';

import AddressAvatar from '~/components/AddressAvatar';
import { Card, CardContent, CardFooter } from '~/components/ui/card';
import Pagination from '~/components/ui/pagination';
import { Skeleton } from '~/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table';
import { type Network } from '~/server/api/routers/zod-helper';
import { api } from '~/trpc/react';
import { formatWithDecimal } from '~/utils/utility';

import ViewDetail from '../../icon/view-detail.svg';
import BlockInfo from './BlockInfo';

const Block: FC<{ hash: string; network: Network; blockNumber: number }> = ({ hash, network, blockNumber }) => {
  const [currentBlockNumber, setCurrentBlockNumber] = useState(blockNumber);
  useEffect(() => {
    setCurrentBlockNumber(blockNumber);
  }, [blockNumber]);
  const { data: block, isLoading: loadingBlockInfo } = api.v0.blocks.detail.useQuery({
    network,
    hashOrHeight: currentBlockNumber.toString(),
  });
  const { data: latestBlock } = api.v0.blocks.latest.useQuery({ network });
  const [page, setPage] = useState(1);
  const { data, isLoading: loadingTx } = api.v0.blocks.txs.useQuery({
    blockHash: block?.hash ?? hash,
    page,
  });
  return (
    <Card className="p-3 h-full flex flex-col gap-2 justify-between text-primary">
      <CardContent className="p-0 h-[calc(100%-76px)] flex flex-col">
        {loadingBlockInfo ? (
          <Skeleton className="h-16 w-full bg-accent mb-3" />
        ) : (
          <BlockInfo
            block={block}
            blockNumber={currentBlockNumber}
            max={latestBlock?.height ?? 0}
            min={0}
            network={network}
            setBlockNumber={setCurrentBlockNumber}
          />
        )}
        {loadingTx ? (
          <Skeleton className="h-48 w-full bg-accent" />
        ) : (
          <Card className="bg-accent h-40 flex-1 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-none">
                  <TableHead>No.</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Asset</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.result.map((v) => (
                  <TableRow className="border-none [&>td]:odd:bg-[#1c2024] [&>td]:p-2 [&>td]:px-4" key={v.hash}>
                    <TableCell>{v.txIndex + 1}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {!v.fromCount
                          ? `Cellbase for Block`
                          : new Array(Math.min(v.fromCount, 3))
                              .fill('')
                              .map((_, idx) => <AddressAvatar address={v.from} key={idx} network={network} />)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {new Array(Math.min(v.toCount, 3)).fill('').map((_, idx) => (
                          <AddressAvatar address={v.to} key={idx} network={network} />
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="break-all">
                      {formatWithDecimal(v.amount, v.asset?.decimals ?? 0)}
                      &nbsp;
                      {v.asset?.symbol}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </CardContent>
      <CardFooter className="p-0 flex flex-col gap-1">
        <div className="flex justify-center">
          <Pagination current={page} onChangePage={setPage} total={Math.ceil((data?.total ?? 0) / 10)} />
        </div>
        <div className="flex justify-end w-full mt-auto">
          <Link
            className="px-4 h-8 flex items-center gap-1 bg-accent text-xs text-secondary rounded-full hover:opacity-80"
            href={`/block/${network.toLowerCase()}/${currentBlockNumber}`}
            target="_blank"
          >
            View Block
            <ViewDetail />
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
};

export default Block;
