'use client';

import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import Image from 'next/image';
import Link from 'next/link';
import { type FC, useCallback, useMemo } from 'react';

import AddressAvatar from '~/components/AddressAvatar';
import NumberTooltip from '~/components/NumberTooltip';
import Committed from '~/components/search/icon/committed.svg';
import Copy from '~/components/search/icon/copy.svg';
import ViewDetail from '~/components/search/icon/view-detail.svg';
import { Card, CardContent, CardFooter } from '~/components/ui/card';
import { NATIVE_ASSETS } from '~/constants';
import { useToast } from '~/hooks/use-toast';
import { type CkbTxDetail } from '~/server/types/txs';
import { api } from '~/trpc/react';
import { formatWithDecimal, getIconBySymbol, localeNumberString, shannonToCkb, trunkLongStr } from '~/utils/utility';

import Expand from '../../icon/expand.svg';
import AssetIcon from './AssetIcon';
import SanitizedAddressLink, { sanitizeAddress } from './SanitizedAddressLink';

dayjs.extend(relativeTime);

const Tx: FC<{ hash: string }> = ({ hash }) => {
  const { toast } = useToast();
  const { data: txDetail } = api.v0.txs.detail.useQuery({ txHash: hash });

  const onCopy = useCallback(() => {
    void navigator.clipboard.writeText(hash);
    toast({ title: 'Copied' });
  }, [hash, toast]);

  const isBlockReward = useMemo(() => {
    if (txDetail?.network === 'ckb') {
      return txDetail?.isCellBase;
    }
    if (txDetail?.network === 'btc') {
      return txDetail?.isCoinBase;
    }
    return false;
  }, [txDetail]);

  return (
    <Card className="p-3 h-full flex flex-col gap-2 overflow-hidden">
      <CardContent className="flex flex-col p-0 flex-[1] overflow-hidden">
        <div className="flex items-center text-base gap-1 mb-2">
          Transaction
          <Link
            className="text-muted-foreground text-xs inconsolata hover:opacity-80"
            href={`/transaction/${hash}`}
            rel="noreferrer noopener"
            target="_blank"
          >
            {trunkLongStr(hash, 8, 8)}
          </Link>
          <button className="border-none hover:opacity-80" onClick={onCopy}>
            <Copy />
          </button>
          <Link
            className="flex items-center ml-auto"
            href={`/transaction/${hash}`}
            rel="noreferrer noopener"
            target="_blank"
          >
            <Expand className="size-5 hover:opacity-80" />
          </Link>
        </div>
        <Card className="p-3 relative text-muted-foreground text-sm bg-accent mb-2 grid grid-cols-2">
          <div className="mb-2">
            <div>Status</div>
            <div className="flex items-center gap-1 text-foreground break-words">
              {txDetail?.txStatus === 'committed' ? (
                <>
                  <Committed />
                  <span>Confirmed</span>
                  {dayjs(txDetail?.committedTime).fromNow()}
                </>
              ) : (
                <>
                  <span>{txDetail?.txStatus}</span>
                  {dayjs(txDetail?.submittedTime).fromNow()}
                </>
              )}
            </div>
          </div>
          <div className="mb-2">
            <div>Chain</div>
            <div className="flex items-center gap-1 text-foreground">
              <AssetIcon assetIcon={txDetail?.assetInfo?.icon} />
              <span>{`On ${txDetail?.assetInfo?.name}`}</span>
            </div>
          </div>
          <div className="mb-2">
            <div>Transaction Fee</div>
            <div className="flex items-center gap-1 text-foreground">
              <AssetIcon assetIcon={txDetail?.assetInfo?.icon} />
              <span>{`${txDetail?.transactionFee ? shannonToCkb(txDetail.transactionFee) : '--'} ${txDetail?.assetInfo?.symbol}`}</span>
            </div>
          </div>
          <div className="mb-2">
            <div>Total Value</div>
            <div className="flex items-center gap-1 text-foreground">
              <AssetIcon assetIcon={txDetail?.assetInfo?.icon} />
              <span>{`$ ${localeNumberString(txDetail?.totalAmountUsd ?? 0, 2)}`}</span>
            </div>
          </div>
        </Card>
        <Card className="flex flex-col gap-4 p-3 relative text-muted-foreground text-sm bg-accent overflow-y-auto">
          <div>
            <div className="mb-2">From</div>
            <div className="flex gap-1 items-center">
              <div className="flex gap-1">
                {txDetail?.inputs?.slice(0, 3)?.map((v) => {
                  return (
                    <AddressAvatar
                      address={
                        sanitizeAddress({
                          address: v.addressHash,
                          isBlockReward,
                        }).address
                      }
                      key={v.id}
                      networkIconUrl={txDetail?.assetInfo?.icon}
                    />
                  );
                })}
              </div>
              <div>
                {txDetail?.inputs?.slice(0, 3)?.map((v, idx) => (
                  <>
                    {idx !== 0 ? ' | ' : ''}
                    <SanitizedAddressLink address={v.addressHash} isBlockReward={isBlockReward} />
                  </>
                ))}
              </div>
            </div>
          </div>
          <div>
            <div className="mb-2">To</div>
            <div className="flex gap-1 items-center">
              <div className="flex gap-1">
                {txDetail?.outputs?.slice(0, 3)?.map((v) => (
                  <AddressAvatar
                    address={
                      sanitizeAddress({
                        address: v.addressHash,
                        isBlockReward,
                      }).address
                    }
                    key={v.id}
                    networkIconUrl={txDetail?.assetInfo?.icon}
                  />
                ))}
              </div>
              <div>
                {txDetail?.outputs?.slice(0, 3)?.map((v, idx) => (
                  <>
                    {idx !== 0 ? ' | ' : ''}
                    <SanitizedAddressLink address={v.addressHash} isBlockReward={isBlockReward} />
                  </>
                ))}
              </div>
            </div>
          </div>
          <div>
            <div className="mb-2">For</div>
            <div className="flex gap-2 items-center">
              {txDetail?.outputs?.slice(0, 3)?.map((v) => (
                <div className="flex items-center gap-1 bg-card-content rounded-sm p-1" key={v.id}>
                  <Image alt={v.symbol ?? ''} height={20} src={getIconBySymbol(v.symbol, v.icon)} width={20} />
                  <div className="text-foreground">
                    <p className="flex items-center gap-1">
                      {v.symbol}
                      {txDetail.network === 'ckb' && !(v.assetId === NATIVE_ASSETS.CKB) && (
                        <span className="text-secondary text-[10px]">
                          <NumberTooltip
                            value={shannonToCkb((v as CkbTxDetail['outputs'][number]).capacityAmount || 0)}
                          />
                          CKB
                        </span>
                      )}
                    </p>
                    <p className="flex items-center gap-1 text-[12px]">
                      <NumberTooltip value={formatWithDecimal(v.amount, Number(v.decimal))} />
                      <span className="text-secondary text-[10px]">
                        $
                        <NumberTooltip value={localeNumberString(v.amountUsd, 2)} />
                      </span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </CardContent>
      <CardFooter className="p-0 flex justify-end">
        <Link
          className="px-4 h-8 flex items-center gap-1 bg-accent text-xs text-secondary rounded-full hover:opacity-80"
          href={`/transaction/${hash}`}
          target="_blank"
        >
          View transaction raw data
          <ViewDetail />
        </Link>
      </CardFooter>
    </Card>
  );
};

export default Tx;
