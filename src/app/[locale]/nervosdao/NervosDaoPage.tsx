'use client';

import BigNumber from 'bignumber.js';
import { ArrowUpRight, HelpCircleIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip';
import { api } from '~/trpc/react';
import { parseNumericAbbr, shannonToCkb } from '~/utils/utility';

import { NervosDaoDepositChart } from './NervosDaoDepositChart';
import { NervosDaoTabs } from './NervosDaoTabs';
import { IssuancePieChart } from './pie-chart';
import { RewardCalcutorModal } from './RewardCalcutorModal';
import { Statistic } from './statistic';

type PageProps = {
  initialTab?: string;
};

export function NervosDaoPage({ initialTab = 'faq' }: PageProps) {
  const { data: nervosDaoInfoResult } = api.explorer.nervosDao.useQuery();
  const nervosDaoInfo = nervosDaoInfoResult?.data?.data;

  const totalDeposit = BigNumber(shannonToCkb(nervosDaoInfo?.attributes.total_deposit ?? '0')).toFormat(
    2,
    BigNumber.ROUND_FLOOR,
  );
  const depositChanges = parseNumericAbbr(shannonToCkb(nervosDaoInfo?.attributes.deposit_changes ?? '0'), 2);
  const depositorsCount = BigNumber(nervosDaoInfo?.attributes.depositors_count ?? '0').toFormat(0, 3);
  const depositorChanges = parseNumericAbbr(nervosDaoInfo?.attributes.depositor_changes ?? '0', 2);
  const claimedCompensationChanges = parseNumericAbbr(
    shannonToCkb(nervosDaoInfo?.attributes.claimed_compensation_changes ?? '0'),
    2,
  );
  const claimedCompensation = BigNumber(shannonToCkb(nervosDaoInfo?.attributes.claimed_compensation ?? '0')).toFormat(
    2,
    3,
  );

  const unclaimedCompensationChanges = parseNumericAbbr(
    shannonToCkb(nervosDaoInfo?.attributes.unclaimed_compensation_changes ?? '0'),
    2,
  );
  const unclaimedCompensation = BigNumber(
    shannonToCkb(nervosDaoInfo?.attributes.unclaimed_compensation ?? '0'),
  ).toFormat(2, BigNumber.ROUND_FLOOR);

  return (
    <div className="flex flex-col gap-2 py-2">
      {/* Header */}
      <Card>
        <CardContent className="p-3 pt-12 space-y-6">
          <div className="space-y-2 relative md:max-w-[600px] md:ml-[20%]">
            <h1 className="text-xl font-semibold">Deposit to Nervos DAO</h1>
            <p className="text-sm">
              Deposit to receive an equivalent amount of CKB at the same rate as the secondary issuance, keep your
              assets away from being diluted by the secondary issuance.
            </p>
            <Image
              alt="bg"
              className="absolute -top-[52px] right-0 md:w-[280px] md:h-[164px] md:-right-[320px]"
              height={120}
              src="/img/nervos-dao-bg.png"
              width={120}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 md:max-w-[600px] md:ml-[20%]">
            <div>
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                Estimated APC
                <Tooltip delayDuration={200} key="tooltip">
                  <TooltipTrigger asChild>
                    <HelpCircleIcon className="cursor-pointer hidden md:block" size={16} />
                  </TooltipTrigger>

                  <TooltipContent>
                    <p className="max-w-96">Estimated Annual Percentage Compensation</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="text-2xl font-bold text-primary">
                {BigNumber(nervosDaoInfo?.attributes.estimated_apc ?? '0').toFormat(2, BigNumber.ROUND_FLOOR)}%
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Average Deposit Time</div>
              <div className="text-2xl font-bold text-primary">
                {BigNumber(nervosDaoInfo?.attributes.average_deposit_time ?? '0').toFormat(1, 3)} days+
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 md:pl-[20%] gap-2 text-sm bg-[#171A1F] p-2 text-muted-foreground rounded-md">
            <RewardCalcutorModal estimatedApc={nervosDaoInfo?.attributes.estimated_apc}>
              <a className="flex items-center gap-1 cursor-pointer hover:text-primary">
                Reward Calculator <ArrowUpRight size={16} />
              </a>
            </RewardCalcutorModal>
            <a
              className="flex items-center gap-1 hover:text-primary"
              href="https://github.com/nervosnetwork/rfcs/blob/master/rfcs/0023-dao-deposit-withdraw/0023-dao-deposit-withdraw.md"
              target="_blank"
            >
              Nervos DAO RFC <ArrowUpRight size={16} />
            </a>
            <a
              className="flex items-center gap-1 hover:text-primary"
              href="https://www.nervos.org/knowledge-base/nervosdao_withdrawal_process_explained"
              target="_blank"
            >
              Learn More <ArrowUpRight size={16} />
            </a>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-3 max-md:space-y-2 md:space-x-2 md:grid md:grid-cols-2">
          <div className="gap-2 grid grid-cols-1 md:grid-cols-2 md:grid-rows-2 md:h-64">
            <Statistic
              header="Deposit"
              suffix={
                <div className="space-x-2 flex items-center font-bold">
                  <span>{totalDeposit}</span>
                  <span className="text-rise flex items-center space-x-1">
                    <Image alt={'ups'} className="inline" height={16} src={`/img/ups.svg`} width={16} />
                    {depositChanges}
                  </span>
                </div>
              }
            >
              <NervosDaoDepositChart className="max-h-24 w-full" />
            </Statistic>

            <Statistic
              className="md:hidden"
              header="Addresses"
              suffix={
                <span className="flex font-bold space-x-2">
                  <span>{depositorsCount}</span>
                  <span className="text-rise flex items-center space-x-1">
                    <Image alt={'ups'} className="inline" height={16} src={`/img/ups.svg`} width={16} />
                    {depositorChanges}
                  </span>
                </span>
              }
            />

            <Statistic
              header="Claimed Compensation"
              suffix={<span className="text-rise font-bold md:hidden">{claimedCompensationChanges}</span>}
            >
              <div className="space-x-2 flex items-center font-bold">
                <span>{claimedCompensation}</span>

                <span className="text-rise hidden md:flex items-center space-x-1">
                  <Image alt={'ups'} className="hidden md:inline" height={16} src={`/img/ups.svg`} width={16} />

                  {claimedCompensationChanges}
                </span>
              </div>
            </Statistic>

            <Statistic
              className="hidden md:block"
              header="Addresses"
              suffix={
                <span className="flex font-bold space-x-2">
                  <span>{depositorsCount}</span>
                  <span className="text-rise flex items-center space-x-1">
                    <Image alt={'ups'} className="hidden md:inline" height={16} src={`/img/ups.svg`} width={16} />
                    {depositorChanges}
                  </span>
                </span>
              }
            />

            <Statistic
              header="Unclaimed Compensation"
              suffix={<span className="text-rise font-bold md:hidden">{unclaimedCompensationChanges}</span>}
            >
              <div className="space-x-2 flex items-center font-bold">
                <span>{unclaimedCompensation}</span>

                <span className="text-rise hidden md:flex items-center space-x-1">
                  <Image alt={'ups'} className="hidden md:inline" height={16} src={`/img/ups.svg`} width={16} />

                  {unclaimedCompensationChanges}
                </span>
              </div>
            </Statistic>
          </div>

          <Statistic
            header="Secondary Issuance"
            tooltip="Secondary Issuance in CKB refers to a fixed inflation schedule of 1.344 billion CKBytes per year that is used to incentivize miners, Nervos DAO users, and the Nervos Treasury for continued development. Unlike Base Issuance, Secondary Issuance is not distributed to everyone on the network, but rather targeted at users who occupy space on Nervos or hold their CKBytes outside of Nervos DAO. The CKBytes from Secondary Issuance are used to collect state rent and are distributed to miners who maintain the network (State Rent), Nervos DAO users, and the Nervos Treasury. CKBytes holders can lock their tokens in Nervos DAO to gain interest in a similar manner to staking on other platforms, which offsets the long-term inflationary effects of Secondary Issuance exactly, resulting in no loss of value over time."
          >
            <IssuancePieChart
              depositCompensation={nervosDaoInfo?.attributes.deposit_compensation ?? '0'}
              miningReward={nervosDaoInfo?.attributes.mining_reward ?? '0'}
              treasuryAmount={nervosDaoInfo?.attributes.treasury_amount ?? '0'}
            />
          </Statistic>
        </CardContent>
      </Card>

      <NervosDaoTabs initialTab={initialTab} />

      <div className="flex w-full flex-col justify-start md:flex-row md:justify-end gap-2">
        <Link href="https://explorer.nervos.org/en/nervosdao/transaction/export" target="_blank">
          <Button className="rounded-full w-full md:w-auto" variant="outline">
            Download Related Transactions <ArrowUpRight size={16} />
          </Button>
        </Link>

        <Link href="https://explorer.nervos.org/en/nervosdao/depositor/export" target="_blank">
          <Button className="rounded-full w-full md:w-auto" variant="outline">
            Download Top Depositors <ArrowUpRight size={16} />
          </Button>
        </Link>
      </div>
    </div>
  );
}
