import Image from 'next/image';
import Link from 'next/link';
import React, { useCallback, useMemo, useState } from 'react';
import * as R from 'remeda';

import AddressAvatar from '~/components/AddressAvatar';
import { Card, CardContent } from '~/components/Card';
import HashViewer from '~/components/HashViewer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { type BtcTxDetail, type CkbTxDetail } from '~/server/types/txs';
import { api } from '~/trpc/react';
import { formatWithDecimal, getIconBySymbol, localeNumberString, shannonToCkb, trunkLongStr } from '~/utils/utility';

import { SimpleCard, SimplePagination, TxAddress } from './Common';
import InIcon from './in.svg';
import OutIcon from './out.svg';
import { ViewRawData } from './ViewRawData';

type GroupByType = 'none' | 'token' | 'address';

type CellType = (
  | CkbTxDetail['inputs'][number]
  | CkbTxDetail['outputs'][number]
  | BtcTxDetail['inputs'][number]
  | BtcTxDetail['outputs'][number]
) & {
  isOutput: boolean;
};

type RewardKey = 'baseReward' | 'secondaryReward' | 'commitReward' | 'proposalReward';
const rewardLabels = ['Base Reward', 'Secondary Reward', 'Commit Reward', 'Proposal Reward'];
const rewardKeys: RewardKey[] = ['baseReward', 'secondaryReward', 'commitReward', 'proposalReward'];

const PAGE_SIZE = 9;

export function TransactionDetail({ tx }: { tx: CkbTxDetail | BtcTxDetail }) {
  const [groupBy, setGroupBy] = useState<GroupByType>('none');
  const [fromPageIndex, setFromPageIndex] = useState(0);
  const [toPageIndex, setToPageIndex] = useState(0);

  const { data: txRawData } = api.v0.txs.raw.useQuery({
    network: tx.network,
    txHash: tx.hash,
  });

  const handleValueChange = useCallback(
    (val: GroupByType) => {
      setGroupBy(val);
    },
    [setGroupBy],
  );

  const getGroupByList = useCallback(
    (key: 'symbol' | 'addressHash') => {
      const { inputs, outputs } = tx;
      const list: (CellType & { absAmount: number })[] = [];
      inputs.forEach((item) => {
        list.push({
          isOutput: false,
          absAmount: Math.abs(Number(item.amount)),
          ...item,
        });
      });
      outputs.forEach((item) => {
        list.push({
          isOutput: true,
          absAmount: Math.abs(Number(item.amount)),
          ...item,
        });
      });

      const res = R.sortBy(list, [R.prop('absAmount'), 'desc']);
      return Object.values(R.groupBy(res, R.prop(key)));
    },
    [tx],
  );

  const getMinedBy = useCallback(() => {
    if (tx.network === 'btc') {
      const { isCoinBase, inputs } = tx;
      if (isCoinBase && inputs.length) {
        const { scriptsigAsm = '' } = inputs[0] || { scriptsigAsm: '' };
        const match = /([a-fA-F0-9]{2,})$/.exec(scriptsigAsm);
        return match ? Buffer.from(match.toString(), 'hex').toString('utf-8') : '';
      }
    }
    return '';
  }, [tx]);

  const rewards = useMemo(() => {
    if (tx.network === 'ckb' && tx.isCellBase) {
      const { outputs } = tx;
      if (outputs.length) {
        const output = outputs[0];
        return {
          baseReward: output?.baseReward || '0',
          secondaryReward: output?.secondaryReward || '0',
          commitReward: output?.commitReward || '0',
          proposalReward: output?.proposalReward || '0',
        };
      }
    }
    return {};
  }, [tx]);

  const fromTitle = useMemo(() => {
    if (tx.network === 'ckb' && tx.isCellBase) return 'Block Reward';
    if (tx.network === 'btc' && tx.isCoinBase) return 'From Coinbase (Protocol mint coin)';
    return 'From';
  }, [tx]);

  const isFromBlockReward = useMemo(() => {
    if (tx.network === 'ckb') {
      return tx.isCellBase;
    }
    if (tx.network === 'btc') {
      return tx.isCoinBase;
    }
    return false;
  }, [tx]);

  if (!tx) return null;

  return (
    <div>
      <Card className="flex-1">
        <div className="flex justify-between items-center">
          <p className="text-4 font-bold">Transaction Detail</p>
          {!isFromBlockReward && (
            <div className="flex items-center gap-1">
              <p className="text-[14px] text-secondary">Group by</p>

              <Select defaultValue={groupBy} onValueChange={handleValueChange}>
                <SelectTrigger className="md:w-[130px] w-[100px] rounded-[8px]">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="token">Token</SelectItem>
                  <SelectItem value="address">Address</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div>
          {groupBy === 'none' && (
            <div className="flex gap-2 md:flex-row flex-col mt-3">
              <CardContent className="flex-1 p-3 flex flex-col">
                <p className="text-[15px] font-medium mb-4">{fromTitle}</p>
                {tx.network === 'ckb' && tx.isCellBase ? (
                  <div className="flex gap-4">
                    <div>
                      {rewardLabels.map((item) => (
                        <p className="text-[14px] text-secondary mb-2" key={item}>
                          {item}
                        </p>
                      ))}
                    </div>
                    <div>
                      {rewardKeys.map((item) => (
                        <p className="text-[14px] mb-2" key={item}>
                          {localeNumberString(formatWithDecimal(rewards[item] || 0, 8))} CKB
                        </p>
                      ))}
                    </div>
                  </div>
                ) : tx.network === 'btc' && tx.isCoinBase ? (
                  <p className="text-secondary text-[14px]">ef Mined by {getMinedBy()}</p>
                ) : (
                  <div className="flex-1">
                    <div className="flex text-[14px] gap-4 sm:flex-row flex-col flex-wrap">
                      {tx.inputs.slice(PAGE_SIZE * fromPageIndex, PAGE_SIZE * (fromPageIndex + 1)).map((item) => (
                        <SimpleCard data={item} key={item.id} network={tx.network} />
                      ))}
                    </div>
                  </div>
                )}
                {tx.inputs.length > PAGE_SIZE && (
                  <SimplePagination
                    pageIndex={fromPageIndex}
                    pageSize={PAGE_SIZE}
                    setPageIndex={(val) => setFromPageIndex(val)}
                    total={tx.inputs.length}
                  />
                )}
              </CardContent>
              <CardContent className="flex-1 p-3 flex flex-col">
                <p className="text-[15px] font-medium">To</p>
                <div className="flex-1">
                  <div className="flex text-[14px] gap-4 sm:flex-row flex-col flex-wrap mt-4">
                    {tx.outputs.slice(PAGE_SIZE * toPageIndex, PAGE_SIZE * (toPageIndex + 1)).map((item) => (
                      <SimpleCard data={item} key={item.id} network={tx.network} />
                    ))}
                  </div>
                </div>

                {tx.outputs.length > PAGE_SIZE && (
                  <SimplePagination
                    pageIndex={toPageIndex}
                    pageSize={PAGE_SIZE}
                    setPageIndex={(val) => setToPageIndex(val)}
                    total={tx.outputs.length}
                  />
                )}
              </CardContent>
            </div>
          )}

          {groupBy === 'token' && (
            <div className="flex flex-col gap-2 mt-3">
              {getGroupByList('symbol').map((tokenInfo: CellType[]) => (
                <CardContent className="p-3 flex items-start sm:flex-row flex-col gap-4" key={tokenInfo[0]?.symbol}>
                  <div className="shrink-0 w-[120px] flex gap-1 items-center mt-3">
                    <Image
                      alt={tx.network}
                      height={20}
                      src={getIconBySymbol(tokenInfo[0]?.symbol || '', tokenInfo[0]?.icon)}
                      width={20}
                    />
                    <div>
                      <p className="text-[14px]">{tokenInfo[0]?.symbol}</p>
                    </div>
                  </div>

                  <div className="flex text-[14px] w-full gap-4 sm:flex-row flex-col flex-wrap mt-[3px]">
                    {tokenInfo.map((item: CellType) => (
                      <CardContent className="text-[14px] bg-accent" key={item.id}>
                        <div className="flex items-center gap-1 md:jutify-start justify-between">
                          <div className="flex items-center gap-1">
                            <AddressAvatar address={item.addressHash} network={tx.network} />
                            <TxAddress data={item} />
                          </div>
                          <p className="text-end">
                            {item.isOutput ? '+' : '-'}
                            {localeNumberString(formatWithDecimal(item.amount, Number(item.decimal)))} {item.symbol}
                          </p>
                        </div>
                      </CardContent>
                    ))}
                  </div>
                </CardContent>
              ))}
            </div>
          )}

          {groupBy === 'address' && (
            <div className="flex flex-col gap-2 mt-3">
              {getGroupByList('addressHash').map((addressInfo: CellType[]) => (
                <CardContent
                  className="p-3 flex items-start gap-4 sm:flex-row flex-col"
                  key={addressInfo[0]?.addressHash}
                >
                  <div className="shrink-0 w-[180px] flex items-center gap-1 mt-5">
                    <AddressAvatar address={addressInfo?.[0]?.addressHash ?? ''} network={tx.network} />
                    {addressInfo[0]?.addressHash ? (
                      <Link
                        className="text-primary mr-1"
                        href={`/address/${addressInfo[0].addressHash}?tab=transactions`}
                      >
                        <HashViewer
                          formattedValue={trunkLongStr(addressInfo[0].addressHash, 8, 8)}
                          value={addressInfo[0].addressHash}
                        />
                      </Link>
                    ) : null}
                  </div>

                  <div className="flex text-[14px] gap-4 flex-wrap mt-[3px]">
                    {addressInfo.map((item: CellType) => (
                      <div className="flex gap-4 items-center" key={item.id}>
                        {item.isOutput ? <InIcon /> : <OutIcon />}
                        <CardContent className="text-[14px] bg-accent">
                          <div className="flex w-[144px] items-center gap-1">
                            <Image
                              alt={tx.network}
                              height={20}
                              src={getIconBySymbol(item.symbol, item.icon)}
                              width={20}
                            />
                            <div>
                              <p>{item.symbol}</p>
                              <p className="text-[12px]">
                                {localeNumberString(formatWithDecimal(item.amount, Number(item.decimal)))}{' '}
                                <span className="text-secondary text-[10px]">
                                  ${localeNumberString(item.amountUsd, 2)}
                                </span>
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </div>
                    ))}
                  </div>
                </CardContent>
              ))}
            </div>
          )}
        </div>

        <CardContent className="grid grid-cols-1 md:grid-cols-2 mt-2 gap-2.5 text-[14px]">
          {tx.network === 'ckb' && (
            <div className="flex">
              <p className="md:w-[40%] w-[107px] shrink-0 text-secondary">Related Capacity</p>
              <p>
                {localeNumberString(shannonToCkb(tx.relatedCapacityAmount))} {tx.assetInfo.symbol} ($
                {localeNumberString(tx.relatedCapacityAmountUsd, 2)})
              </p>
            </div>
          )}
          <div className="flex">
            <p className="md:w-[40%] w-[107px] shrink-0 text-secondary">Total Value</p>
            <p>$ {localeNumberString(tx.totalAmountUsd, 2)}</p>
          </div>
        </CardContent>
      </Card>

      <div className="float-right mt-2">
        <ViewRawData data={txRawData || {}} title={tx.hash} />
      </div>
    </div>
  );
}
