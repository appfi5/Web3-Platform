import { CheckCircleSolid, Copy } from 'iconoir-react';
import Image from 'next/image';
import Link from 'next/link';
import React, { useCallback, useMemo } from 'react';

// import { useTranslations } from 'next-intl';
import { Card, CardContent } from '~/components/Card';
import { useToast } from '~/hooks/use-toast';
import { type BtcTxDetail, type CkbTxDetail } from '~/server/types/txs';
import { dayjs, formatDuration, localeNumberString, shannonToCkb } from '~/utils/utility';

type BasicInfoKey = 'blockHeight' | 'timestamp' | 'transactionFee' | 'feeRate' | 'status' | 'age' | 'cycles';

type AdvancedInfoKey = 'position' | 'inputValue' | 'outputValue' | 'version' | 'cellBase' | 'coinBase' | 'lockTime';

export function TransactionInfo({ hash, tx }: { hash: string; tx?: CkbTxDetail | BtcTxDetail | null }) {
  // const t = useTranslations('common');
  const { toast } = useToast();

  const chainInfo = useMemo(() => {
    if (tx?.network === 'btc') {
      return {
        name: 'Bitcoin',
        icon: '/img/btcBg.svg',
        hash: hash.startsWith('0x') ? hash.slice(2) : hash,
      };
    }
    if (tx?.network === 'ckb') {
      return {
        name: 'CKB',
        icon: '/img/ckbBg.svg',
        hash,
      };
    }

    return {
      name: '',
      icon: '',
      hash: '',
    };
  }, [tx, hash]);

  const basicInfo = useMemo(() => {
    if (!tx) {
      return {
        blockHeight: '-',
        timestamp: '-',
        transactionFee: '-',
        feeRate: '-',
        status: '-',
        age: '-',
        cycles: '-',
      };
    }

    const localOffset = dayjs().utcOffset() / 60;
    return {
      blockHeight: tx.blockNumber || '-',
      timestamp: dayjs(tx.submittedTime)
        .utcOffset(localOffset * 60)
        .format(`YYYY.MM.DD HH:mm:ss [(UTC ${localOffset >= 0 ? '+' : ''}${localOffset})]`),
      transactionFee:
        tx.network === 'btc'
          ? `${localeNumberString(tx.transactionFee)} sats`
          : `${shannonToCkb(tx.transactionFee || 0)} ${tx.assetInfo.symbol}`,
      feeRate: `${localeNumberString(tx.feeRate, 2)} ${tx.network === 'btc' ? 'sat/vB' : 'shannons/kB'}`,
      status: (
        <div className="flex items-center gap-1 text-foreground">
          {tx.txStatus === 'committed' ? (
            <>
              <CheckCircleSolid color="#E5ff5A" />
              <span>Confirmed</span>
              <span className="whitespace-nowrap overflow-hidden text-ellipsis">
                {dayjs(tx.committedTime).fromNow()}
              </span>
            </>
          ) : (
            <>
              <span>{tx.txStatus}</span>
              <span className="whitespace-nowrap overflow-hidden text-ellipsis">
                {dayjs(tx.submittedTime).fromNow()}
              </span>
            </>
          )}
        </div>
      ),
      age: formatDuration(dayjs.duration(dayjs().diff(dayjs(tx.submittedTime)))),

      cycles: tx.network === 'ckb' ? localeNumberString(tx.cycles || '') : '-',
    };
  }, [tx]);

  const basicInfoLabels = useCallback((): string[] => {
    if (tx?.network === 'btc') {
      return ['Block height', 'Timestamp', 'Transaction Fee', 'Fee Rate', 'Status', 'Age'];
    }
    return ['Block height', 'Timestamp', 'Transaction Fee', 'Fee Rate', 'Status', 'Age', 'Cycles'];
  }, [tx]);

  const basicInfoKeys = useCallback((): BasicInfoKey[] => {
    if (tx?.network === 'btc') {
      return ['blockHeight', 'timestamp', 'transactionFee', 'feeRate', 'status', 'age'];
    }
    return ['blockHeight', 'timestamp', 'transactionFee', 'feeRate', 'status', 'age', 'cycles'];
  }, [tx]);

  const advancedInfoLabels = useCallback((): string[] => {
    if (tx?.network === 'btc') {
      return ['Position', 'Input Value', 'Output Value', 'Version', 'CoinBase', 'LockTime'];
    }
    return ['Position', 'Input Value', 'Output Value', 'Version', 'CellBase', 'LockTime'];
  }, [tx]);

  const advancedInfoKeys = useCallback((): AdvancedInfoKey[] => {
    if (tx?.network === 'btc') {
      return ['position', 'inputValue', 'outputValue', 'version', 'coinBase', 'lockTime'];
    }
    return ['position', 'inputValue', 'outputValue', 'version', 'cellBase', 'lockTime'];
  }, [tx]);

  const advancedInfo = useMemo(() => {
    if (!tx) {
      return {
        position: '-',
        inputValue: '-',
        outputValue: '-',
        version: '-',
        cellBase: '-',
        coinBase: '-',
        lockTime: '-',
      };
    }
    let lockTime = 'No Lock Time';
    if (tx.lockTime) {
      if (tx.network === 'btc') {
        lockTime = localeNumberString(tx.lockTime);
      } else {
        lockTime = dayjs(tx.lockTime).format('YYYY/MM/DD HH:mm:ss');
      }
    }
    return {
      position: tx.position,
      inputValue: `$ ${localeNumberString(tx.inputAmountUsd, 2)}`,
      outputValue: `$ ${localeNumberString(tx.outputAmountUsd, 2)}`,
      version: tx.version,
      cellBase: tx.network === 'ckb' ? (tx?.isCellBase ? 'Yes' : 'No') : '-',
      coinBase: tx.network === 'btc' ? (tx?.isCoinBase ? 'Yes' : 'No') : '-',
      lockTime,
    };
  }, [tx]);

  const handleCopy = (e: React.MouseEvent<SVGSVGElement>) => {
    e.stopPropagation();
    e.preventDefault();

    void navigator.clipboard.writeText(chainInfo.hash);
    toast({ title: 'Copied' });
  };

  return (
    <Card className="rounded-[12px]">
      <CardContent className="relative">
        <div className="flex lg:flex-row flex-col items-start gap-2 lg:items-center p-3 lg:pt-2 pl-0">
          <p className="text-[16px] font-bold">{chainInfo.name} Transaction</p>
          <div className="flex gap-2 items-center">
            <p className="text-[14px] text-secondary break-all inconsolata">{chainInfo.hash}</p>
            <Copy className="cursor-pointer shrink-0" height={20} onClick={handleCopy} width={20} />
          </div>

          <Image
            alt={chainInfo.name}
            className="lg:block hidden absolute top-0 right-0"
            height={60}
            src={chainInfo.icon}
            width={64}
          />
          <Image
            alt={chainInfo.name}
            className="lg:hidden block absolute top-0 right-0"
            height={38}
            src={chainInfo.icon}
            width={40}
          />
        </div>
      </CardContent>

      <div className="flex lg:flex-row flex-col gap-2 mt-2">
        <CardContent className="flex-1 p-3">
          <p className="text-[15px] font-medium">Basic Information</p>
          <div className="flex text-[14px]">
            <div className="w-[40%]">
              {basicInfoLabels().map((item) => (
                <p className="mt-[10px] text-secondary h-[18px]" key={item}>
                  {item}
                </p>
              ))}
            </div>
            <div>
              {basicInfoKeys().map((key) => (
                <div className="mt-[10px] h-[18px] whitespace-nowrap" key={key}>
                  {key === 'blockHeight' ? (
                    <Link href={`/block/${tx?.network?.toLowerCase()}/${basicInfo[key]}`}>{basicInfo[key]}</Link>
                  ) : (
                    basicInfo[key]
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
        <CardContent className="flex-1 p-3">
          <p className="text-[15px] font-medium">Advanced Information</p>
          <div className="flex text-[14px]">
            <div className="w-[40%]">
              {advancedInfoLabels().map((item) => (
                <p className="mt-[10px] text-secondary h-[18px]" key={item}>
                  {item}
                </p>
              ))}
            </div>
            <div>
              {advancedInfoKeys().map((key) => (
                <div className="mt-[10px] h-[18px]" key={key}>
                  {advancedInfo[key]}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
