'use client';
import BigNumber from 'bignumber.js';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { type ComponentProps } from 'react';

import { Card, CardContent } from '~/components/ui/card';
import { toast } from '~/hooks/use-toast';
import { type Network } from '~/server/api/routers/zod-helper';
import { type RouterOutputs } from '~/trpc/react';
import { dayjs, localeNumberString, parseNumericAbbr, shannonToCkb, trunkLongStr } from '~/utils/utility';

import { BlockInfo } from './BlockInfo';
import { BlockNumber } from './BlockNumber';
import BTCIcon from './btc.svg';
import CKBIcon from './ckb.svg';
import CopyIcon from './copy.svg';
import DownloadButton from './DownloadBtton';
import StatusOKIcon from './status-ok.svg';

export const BlockHeader = ({
  latestBlock,
  blockInfo,
  blockNumber,
  blockHash,
  network,
}: ComponentProps<'div'> & {
  latestBlock: number;
  blockInfo: NonNullable<RouterOutputs['v0']['blocks']['detail']>;
  blockNumber: number;
  blockHash: string;
  network: Network;
}) => {
  const t = useTranslations('BlockPage');
  const commonT = useTranslations('common');

  let chainIcon = null;
  switch (network) {
    case 'btc':
      chainIcon = <BTCIcon></BTCIcon>;
      break;
    case 'ckb':
      chainIcon = <CKBIcon></CKBIcon>;
    default:
      break;
  }

  const info: Record<string, string | null | JSX.Element>[] = [
    {
      status: <StatusOKIcon />,
      time: dayjs(blockInfo.time).format('YYYY.MM.DD HH:mm:ss'),
      weight: localeNumberString(blockInfo.weight ?? 0),
      size: `${localeNumberString(blockInfo.size)} Bytes`,
    },
    {
      mindBy: (
        <Link className="cursor-pointer inconsolata" href={`/address/${blockInfo.miner}`}>
          {trunkLongStr(blockInfo.miner)}
        </Link>
      ),
      difficulty: parseNumericAbbr(blockInfo.difficulty, 2),
      blockReward: (
        <div className="flex flex-wrap gap-1">
          <span>
            {localeNumberString(shannonToCkb(blockInfo.blockReward.amount))} {network.toUpperCase()}
          </span>
          <span className="md:text-white text-[#999]">(${parseNumericAbbr(blockInfo.blockReward.amountUsd, 2)})</span>
        </div>
      ),
      feeReward: (
        <div className="flex flex-wrap gap-1">
          <span>
            {localeNumberString(shannonToCkb(blockInfo.txFee.amount))} {network.toUpperCase()}
          </span>
          <span className="text-[#999]">(${parseNumericAbbr(blockInfo.txFee.amountUsd, 2)})</span>
        </div>
      ),
    },
    {
      merkleTree: blockInfo.merkleRoot,
      nonce: `0x${BigNumber(blockInfo.nonce).toString(16)}`,
      bits: blockInfo.bits,
    },
  ];

  return (
    <Card>
      <CardContent className="p-2 md:p-4 flex items-center gap-8 flex-wrap">
        <div className="flex flex-1 max-w-full gap-[8px] rounded-lg items-start bg-[#171A1F]">
          <div className="relative flex max-w-full md:flex-row flex-col flex-1 gap-[8px] rounded-lg md:items-center m-[12px]">
            <div className="flex gap-[8px] items-center">
              <h2 className="text-[16px] font-semibold">{t('Block')}</h2>
              <BlockNumber blockNumber={blockNumber} latestBlock={latestBlock} network={network} />
            </div>
            <div className="flex gap-[8px] items-center">
              <div className="text-[14px] text-[#999] flex items-center break-all md:no-break inconsolata">
                {blockHash}
              </div>
              <div className="flex items-center gap-[24px]">
                <button
                  className="cursor-pointer text-[#999] hover:text-primary"
                  onClick={async () => {
                    await navigator.clipboard.writeText(blockHash);
                    toast({ title: commonT('copied') });
                  }}
                >
                  <CopyIcon />
                </button>
              </div>
            </div>
            <DownloadButton blockInfo={blockInfo} network={network} />
            <div className="absolute right-[-12px] top-[-12px] w-[40px] h-[40px] md:w-[63px] md:h-[63px]">
              {chainIcon}
            </div>
          </div>
        </div>
      </CardContent>
      <CardContent className="max-w-full p-2 md:p-4 flex flex-col md:grid md:grid-cols-3 gap-2">
        {info.map((blockInfo, key) => (
          <BlockInfo info={blockInfo} key={key}></BlockInfo>
        ))}
      </CardContent>
    </Card>
  );
};
