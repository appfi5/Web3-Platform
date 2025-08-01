'use client';

import { Copy } from 'iconoir-react';
import Link from 'next/link';
import { useState } from 'react';

import { SimplePagination } from '~/app/[locale]/transaction/[hash]/components/Common';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '~/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip';
import { useToast } from '~/hooks/use-toast';
import { UNKNOWN } from '~/lib/address';
import { type Network } from '~/server/api/routers/zod-helper/network';
import { api } from '~/trpc/react';
import { formatWithDecimal, localeNumberString, trunkLongStr } from '~/utils/utility';

const PAGE_SIZE = 10;

function RenderInputOrOutput({
  isFromBlockReward,
  network,
  address,
  amount,
  decimal,
  symbol,
}: {
  isFromBlockReward?: boolean;
  network: Network;
  address?: string;
  amount: string;
  decimal: number | string;
  symbol: string;
}) {
  const { toast } = useToast();
  const handleCopy = (address: string) => {
    void navigator.clipboard.writeText(address);
    toast({ title: 'Copied' });
  };
  if (isFromBlockReward) {
    return <div className="flex items-center gap-1 py-1">{network === 'btc' ? 'coinbase' : 'cellbase'}</div>;
  }
  if (!address) {
    return (
      <div className="flex items-center justify-between gap-1 py-1">
        <p className="min-w-[140px]">{UNKNOWN}</p>
        <p className="ml-8 min-w-[210px] shrink-0">
          {localeNumberString(formatWithDecimal(amount, Number(decimal)))} {symbol}
        </p>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 py-1">
      <Link className="inconsolata" href={`/address/${address}`}>
        <Tooltip>
          <TooltipTrigger asChild>
            <p className="text-primary min-w-[140px]">{trunkLongStr(address)}</p>
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-[400px] break-all">{address}</p>
          </TooltipContent>
        </Tooltip>
      </Link>
      <Copy className="cursor-pointer" height={20} onClick={() => handleCopy(address)} width={20} />
      <p className="ml-8 min-w-[210px] shrink-0">
        {localeNumberString(formatWithDecimal(amount, Number(decimal)))} {symbol}
      </p>
    </div>
  );
}

export function TxCountBadge({ count, hash }: { count: number; hash: string }) {
  const [page, setPage] = useState(1);
  const [visible, setVisible] = useState(false);

  const { data: tx } = api.v0.txs.detail.useQuery({ txHash: hash });

  return (
    <Dialog onOpenChange={(open) => setVisible(open)} open={visible}>
      <DialogTrigger>
        <div className="h-[16px] min-w-[20px] flex justify-center items-center bg-primary text-primary-foreground font-semibold text-[10px] rounded-[24px] px-[5px]">
          {count < 99 ? count : '99+'}
        </div>
      </DialogTrigger>
      {tx ? (
        <DialogContent className="max-w-[90vw] md:max-w-[800px]">
          <DialogHeader className="flex flex-row justify-between">
            <DialogTitle>Detail</DialogTitle>
          </DialogHeader>
          <div className="text-[14px] w-full overflow-auto">
            <div className="flex min-h-[200px]">
              <div className="flex-1">
                <p className="text-secondary mb-4">Input({tx.inputs.length})</p>
                {tx.inputs.slice(PAGE_SIZE * (page - 1), PAGE_SIZE * page).map((item) => (
                  <RenderInputOrOutput
                    address={item.addressHash}
                    amount={item.amount}
                    decimal={item.decimal ?? 0}
                    isFromBlockReward={
                      (tx.network === 'ckb' && tx.isCellBase) || (tx.network === 'btc' && tx.isCoinBase)
                    }
                    key={item.id}
                    network={tx.network}
                    symbol={item.symbol ?? ''}
                  />
                ))}
              </div>

              <div className="flex-1">
                <p className="text-secondary mb-4">Output({tx.outputs.length})</p>
                {tx.outputs.slice(PAGE_SIZE * (page - 1), PAGE_SIZE * page).map((item) => (
                  <RenderInputOrOutput
                    address={item.addressHash}
                    amount={item.amount}
                    decimal={item.decimal ?? 0}
                    key={item.id}
                    network={tx.network}
                    symbol={item.symbol ?? ''}
                  />
                ))}
              </div>
            </div>
          </div>
          <SimplePagination
            pageIndex={page - 1}
            pageSize={PAGE_SIZE}
            setPageIndex={(val) => setPage(val + 1)}
            total={Math.max(tx.inputs.length, tx.outputs.length)}
          />
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
