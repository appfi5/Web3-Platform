import Image from 'next/image';
import Link from 'next/link';
import React from 'react';

import AddressAvatar from '~/components/AddressAvatar';
import { CardContent } from '~/components/Card';
import HashViewer from '~/components/HashViewer';
import { Button } from '~/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip';
import { cn } from '~/lib/utils';
import { NATIVE_ASSETS } from '~/utils/const';
import { formatWithDecimal, getIconBySymbol, localeNumberString, shannonToCkb, trunkLongStr } from '~/utils/utility';

import CkbCell from './ckbCell.svg';

const getTextByAsm = (asm: string) => {
  const match = /OP_PUSHBYTES_36\s+([a-fA-F0-9]+)/.exec(asm);
  const hex = match ? match[1] : null;

  return Buffer.from(hex || '', 'hex')
    .toString('utf8')
    .replace(/\uFFFD/g, '');
};

export function TxAddress({
  data,
}: {
  data: {
    addressHash?: string;
    scriptPubkeyType?: string;
    scriptPubkeyAsm?: string;
  };
}) {
  if (data.addressHash) {
    return (
      <Link className="text-primary inconsolata" href={`/address/${data.addressHash}?tab=transactions`}>
        <HashViewer formattedValue={trunkLongStr(data.addressHash, 8, 8)} value={data.addressHash} />
      </Link>
    );
  }

  if (!data.scriptPubkeyType) {
    return null;
  }

  return (
    <Tooltip>
      <div className="flex gap-[2px] text-secondary items-center uppercase">
        {data.scriptPubkeyType}
        <TooltipTrigger asChild>
          <Image alt="question" height={20} src="/img/question.svg" width={20} />
        </TooltipTrigger>
      </div>
      <TooltipContent className="py-2">
        {data.scriptPubkeyType === 'unknown' ? (
          <div>
            <p className="text-foreground capitalize font-bold leading-[24px]">{data.scriptPubkeyType} ScriptPubKey</p>
            {data.scriptPubkeyAsm?.split(/\s+/).map((item, index) => (
              <p
                className={cn(
                  'leading-[24px] mt-[2px] max-w-[280px] break-all',
                  index % 2 ? 'text-foreground' : 'text-secondary',
                )}
                key={item}
              >
                {item}
              </p>
            ))}
          </div>
        ) : (
          <div>
            <p className="text-foreground uppercase font-bold leading-[24px]">{data.scriptPubkeyType}</p>
            <p className="leading-[24px] mt-[2px]">{getTextByAsm(data?.scriptPubkeyAsm || '')}</p>
          </div>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

export function SimpleCard({
  key,
  data,
  network,
}: {
  key: string;
  data: {
    addressHash?: string;
    assetId: string;
    symbol?: string;
    icon: string;
    capacityAmount?: string;
    decimal?: number | string;
    amount: string;
    amountUsd: string;
    scriptPubkeyType?: string;
    scriptPubkeyAsm?: string;
  };
  network: 'ckb' | 'btc';
}) {
  const isCKB = data.assetId === NATIVE_ASSETS.CKB;
  return (
    <CardContent className="text-[14px] bg-accent relative" key={key}>
      {isCKB && <CkbCell className="absolute right-0 top-0" />}
      <div className="flex w-[200px] items-center gap-1">
        <AddressAvatar address={data.addressHash} network={network} />
        <TxAddress data={data} />
      </div>

      <CardContent className="text-[14px] bg-[#1C2024] mt-2">
        <div className="flex w-[200px] items-center gap-1">
          <Image alt={data.symbol ?? ''} height={20} src={getIconBySymbol(data.symbol, data.icon)} width={20} />
          <div>
            <p>
              {data.symbol}{' '}
              {network === 'ckb' && !isCKB && (
                <span className="text-secondary text-[10px]">
                  {localeNumberString(shannonToCkb(data?.capacityAmount || 0))} CKB
                </span>
              )}
            </p>
            <p className="text-[12px]">
              {localeNumberString(formatWithDecimal(data.amount, Number(data.decimal)))}{' '}
              <span className="text-secondary text-[10px]">${localeNumberString(data.amountUsd, 2)}</span>
            </p>
          </div>
        </div>
      </CardContent>
    </CardContent>
  );
}

export function SimplePagination({
  total,
  pageSize,
  pageIndex,
  setPageIndex,
}: {
  total: number;
  pageSize: number;
  pageIndex: number;
  setPageIndex: (val: number) => void;
}) {
  const lastPage = Math.ceil(total / pageSize) - 1;
  return (
    <div className="flex items-center justify-center space-x-2 gap-6 mt-4">
      <div className="flex gap-[10px] items-center">
        <Button
          className="hover:bg-transparent"
          disabled={!pageIndex}
          onClick={() => setPageIndex(pageIndex - 1)}
          variant="ghost"
        >
          <Image alt="left" height={16} src="/img/left-arrow.svg" width={16} />
        </Button>

        <Button
          className="bg-accent text-accent-foreground hover:bg-accent/80"
          disabled={!pageIndex}
          onClick={() => setPageIndex(0)}
          size="sm"
          variant="secondary"
        >
          First
        </Button>
      </div>

      <p className="text-[13px] text-secondary">
        {pageIndex + 1} / {lastPage + 1}
      </p>

      <div className="flex gap-[10px] items-center">
        <Button
          className="bg-accent text-accent-foreground hover:bg-accent/80"
          disabled={pageIndex === lastPage}
          onClick={() => setPageIndex(lastPage)}
          size="sm"
          variant="secondary"
        >
          Last
        </Button>
        <Button
          className="hover:bg-transparent"
          disabled={pageIndex === lastPage}
          onClick={() => setPageIndex(pageIndex + 1)}
          variant="ghost"
        >
          <Image alt="right" height={16} src="/img/right-arrow.svg" width={16} />
        </Button>
      </div>
    </div>
  );
}
