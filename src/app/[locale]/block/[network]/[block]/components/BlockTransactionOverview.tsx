import { useTranslations } from 'next-intl';
import { type ComponentProps } from 'react';

import { type BlockDetail, type Network } from '~/server/api/routers/zod-helper';
import { localeNumberString, parseNumericAbbr, shannonToCkb } from '~/utils/utility';

export interface TransactionOverview {
  totalTxs: string;
  txAmount: BlockDetail['txAmount'];
  txFee: BlockDetail['txFee'];
  token: BlockDetail['token'];
}

export const BlockTransactionOverview = ({
  network,
  overview,
}: ComponentProps<'div'> & { overview: TransactionOverview; network: Network }) => {
  const t = useTranslations('BlockPage');
  const chain = network.toUpperCase();
  const { txAmount, txFee, token } = overview;

  return (
    <>
      <div className="hidden md:flex flex-1 p-[15px] gap-[10px] rounded-lg bg-[#171A1F] justify-between">
        <div className="text-[#999] pl-[16px] pr-[16px]">{`${t('transactions.overview.total')} ${overview.totalTxs}`}</div>
        <div className="text-[#999]">|</div>
        <div className=" flex gap-[8px] items-center pl-[16px] pr-[16px]">
          <span className="text-[#999] text-[14px]">{t('transactions.overview.amount')}</span>
          <span className="text-[15px]">{`${localeNumberString(shannonToCkb(txAmount.amount.toString()).toString(), txAmount.asset?.decimals ?? 8)} ${chain}`}</span>
          <span className="text-[12px] text-[#999]">(${localeNumberString(txAmount.amountUsd, 2)})</span>
        </div>
        <div className="text-[#999]">|</div>
        <div className=" flex gap-[8px] items-center pl-[16px] pr-[16px]">
          <span className="text-[#999] text-[14px]">{t('transactions.overview.fees')}</span>
          <span className="text-[15px]">{`${localeNumberString(shannonToCkb(txFee.amount), txFee.asset?.decimals ?? 8)} ${chain}`}</span>
          <span className="text-[12px] text-[#999]">(${localeNumberString(shannonToCkb(txFee.amountUsd), 2)})</span>
        </div>
        <div className="text-[#999]">|</div>
        <div className=" flex gap-[8px] items-center pl-[16px] pr-[16px]">
          <span className="text-[15px]">{token.count}</span>
          <span className="text-[#999] text-[14px]">{t('transactions.overview.tokens')}</span>
          <span className="text-[12px] text-[#999]">(${parseNumericAbbr(token.totalAmountUsd, 2)})</span>
        </div>
      </div>

      <div className="md:hidden flex flex-1 p-[15px] gap-[10px] rounded-lg bg-[#171A1F] justify-between flex-col">
        <div className="flex justify-between pl-[16px] pr-[16px]">
          <div className="text-[#999]">{`${t('transactions.overview.total')} ${overview.totalTxs}`}</div>
        </div>
        <div className="flex pl-[16px] pr-[16px]">
          <span className="flex-1 text-[#999] text-[14px]">{t('transactions.overview.amount')}</span>
          <div className="flex-1 flex flex-col gap-[8px]">
            <span className="text-[15px]">{`${localeNumberString(shannonToCkb(txAmount.amount.toString()).toString(), txAmount.asset?.decimals ?? 8)} ${chain}`}</span>
            <span className="text-[12px] text-[#999]">(${localeNumberString(txAmount.amountUsd, 2)})</span>
          </div>
        </div>
        <div className="flex pl-[16px] pr-[16px]">
          <span className="flex-1 text-[#999] text-[14px]">{t('transactions.overview.fees')}</span>
          <div className="flex-1 flex flex-col gap-[8px]">
            <span className="text-[15px] text-left">{`${localeNumberString(shannonToCkb(txFee.amount), txFee.asset?.decimals ?? 8)} ${chain}`}</span>
            <span className="text-[12px] text-[#999] text-left">
              (${localeNumberString(shannonToCkb(txFee.amountUsd), 2)})
            </span>
          </div>
        </div>
        <div className="flex pl-[16px] pr-[16px]">
          <span className="flex-1"></span>
          <div className="flex-1 flex gap-[8px] items-center justify-start">
            <span className="text-[15px]">{token.count}</span>
            <span className="text-[#999] text-[14px]">{t('transactions.overview.tokens')}</span>
            <span className="text-[12px] text-[#999]">(${parseNumericAbbr(token.totalAmountUsd, 2)})</span>
          </div>
        </div>
      </div>
    </>
  );
};
