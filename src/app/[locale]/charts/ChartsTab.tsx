'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import {
  ActiveAddressesChart,
  AddressBalanceRankChart,
  AddressCountChart,
  AnnualPercentageCompensationChart,
  AssetActivityChart,
  AverageBlockTimeChart,
  BalanceDistributionChart,
  BlockTimeDistributionChart,
  CellCountChart,
  CirculationRatioChart,
  CkbHodlWaveChart,
  ContractResourceDistributedChart,
  DifficultyChart,
  DifficultyHashRateChart,
  DifficultyUncleRateEpochChart,
  EpochTimeDistributionChart,
  HashRateChart,
  InflationRateChart,
  KnowledgeSizeChart,
  LiquidityChart,
  MinerAddressDistributionChart,
  MinerVersionDistributionChart,
  NewDaoDepositChart,
  NodeCountryDistributionChart,
  NodeGeoDistribution,
  SecondaryIssuanceChart,
  TotalDaoDepositChart,
  TotalSupplyChart,
  TransactionCountChart,
  TxFeeHistoryChart,
  UncleRateChart,
} from '~/components/StatisticsChart';
import { Card, CardContent } from '~/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { useIsMobile } from '~/hooks';
import { cn } from '~/lib/utils';

export const chartMenus = [
  {
    group: 'Activities',
    id: 'activities',
    charts: [
      {
        link: '/charts/address-balance-rank',
        title: 'Top 50 Holders',
        chart: <AddressBalanceRankChart isThumbnail />,
      },
      {
        link: '/charts/transaction-count',
        title: 'Transaction Count',
        chart: <TransactionCountChart isThumbnail />,
      },
      {
        link: '/charts/address-count',
        title: 'Unique Addresses Used',
        chart: <AddressCountChart isThumbnail />,
      },
      {
        link: '/charts/cell-count',
        title: 'Cell Count',
        chart: <CellCountChart isThumbnail />,
      },
      {
        link: '/charts/ckb-hodl-wave',
        title: 'CKB HODL Wave',
        chart: <CkbHodlWaveChart isThumbnail />,
      },
      {
        link: '/charts/balance-distribution',
        title: 'Balance Distribution',
        chart: <BalanceDistributionChart isThumbnail />,
      },
      {
        link: '/charts/tx-fee-history',
        title: 'Transaction Fee',
        chart: <TxFeeHistoryChart isThumbnail />,
      },
      {
        link: '/charts/contract-resource-distributed',
        title: 'Contract Resource Distributed',
        chart: <ContractResourceDistributedChart isThumbnail />,
      },
      {
        link: '/charts/active-addresses',
        title: 'Active Addresses',
        chart: <ActiveAddressesChart isThumbnail />,
      },
      {
        link: '/charts/asset-activity',
        title: 'Asset Activity',
        chart: <AssetActivityChart isThumbnail />,
      },
      {
        link: '/charts/knowledge-size',
        title: 'Knowledge Size',
        chart: <KnowledgeSizeChart isThumbnail />,
      },
    ],
  },
  {
    group: 'Block',
    id: 'block',
    charts: [
      {
        link: '/charts/block-time-distribution',
        title: 'Block Time Distribution',
        chart: <BlockTimeDistributionChart isThumbnail />,
      },
      {
        link: '/charts/epoch-time-distribution',
        title: 'Epoch Time Distribution',
        chart: <EpochTimeDistributionChart isThumbnail />,
      },
      {
        link: '/charts/average-block-time',
        title: 'Average Block Time',
        chart: <AverageBlockTimeChart isThumbnail />,
      },
    ],
  },
  {
    group: 'Mining',
    id: 'mining',
    charts: [
      {
        link: '/charts/difficulty-hash-rate',
        title: 'Difficulty & Hash Rate & Uncle Rate',
        chart: <DifficultyHashRateChart isThumbnail />,
      },
      {
        link: '/charts/epoch-time-length',
        title: 'Epoch Time & Epoch Length',
        chart: <DifficultyUncleRateEpochChart isThumbnail />,
      },
      {
        link: '/charts/difficulty',
        title: 'Difficulty',
        chart: <DifficultyChart isThumbnail />,
      },
      {
        link: '/charts/hash-rate',
        title: 'Hash Rate',
        chart: <HashRateChart isThumbnail />,
      },
      {
        link: '/charts/uncle-rate',
        title: 'Uncle Rate',
        chart: <UncleRateChart isThumbnail />,
      },
      {
        link: '/charts/miner-address-distribution',
        title: 'Top Miners (Recent 7 days)',
        chart: <MinerAddressDistributionChart isThumbnail />,
      },
      {
        link: '/charts/miner-version-distribution',
        title: 'Miner Versions (Recent 7 days)',
        chart: <MinerVersionDistributionChart isThumbnail />,
      },
      {
        link: '/charts/node-country-distribution',
        title: 'Nodes distribution by Country/Region',
        chart: <NodeCountryDistributionChart isThumbnail />,
      },
      {
        link: '/charts/node-geo-distribution',
        title: 'Node Geo Distribution',
        chart: <NodeGeoDistribution isThumbnail />,
      },
    ],
  },
  {
    group: 'Nervos DAO',
    id: 'nervos-dao',
    charts: [
      {
        link: '/charts/total-dao-deposit',
        title: 'Total Nervos DAO Deposit & Accrued Total Depositors',
        chart: <TotalDaoDepositChart isThumbnail />,
      },
      {
        link: '/charts/new-dao-deposit',
        title: 'Daily Nervos DAO Deposit',
        chart: <NewDaoDepositChart isThumbnail />,
      },
      {
        link: '/charts/circulation-ratio',
        title: 'Deposit to Circulation Ratio',
        chart: <CirculationRatioChart isThumbnail />,
      },
    ],
  },
  {
    group: 'Economic Status',
    id: 'economic-status',
    charts: [
      {
        link: '/charts/total-supply',
        title: 'Total Supply',
        chart: <TotalSupplyChart isThumbnail />,
      },
      {
        link: '/charts/nominal-apc',
        title: 'Nominal DAO Compensation Rate',
        chart: <AnnualPercentageCompensationChart isThumbnail />,
      },
      {
        link: '/charts/secondary-issuance',
        title: 'Secondary Issuance',
        chart: <SecondaryIssuanceChart isThumbnail />,
      },
      {
        link: '/charts/inflation-rate',
        title: 'Inflation Rate',
        chart: <InflationRateChart isThumbnail />,
      },
      {
        link: '/charts/liquidity',
        title: 'Liquidity',
        chart: <LiquidityChart isThumbnail />,
      },
    ],
  },
];

export function ChartsTab() {
  const isMobile = useIsMobile();
  const [activeSection, setActiveSection] = useState(chartMenus[0]?.id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { threshold: 0.5 },
    );

    chartMenus.forEach((section) => {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    });

    return () => {
      chartMenus.forEach((section) => {
        const element = document.getElementById(section.id);
        if (element) observer.unobserve(element);
      });
    };
  }, []);

  return (
    <>
      <div
        className={cn('w-full bg-black fixed z-20 left-0 right-0 py-2', {
          ['top-[72px] px-[60px] py-3']: !isMobile,
          ['top-[54px] px-3']: isMobile,
        })}
      >
        <Tabs value={activeSection}>
          <TabsList className="p-0 rounded-none overflow-x-scroll justify-start max-w-full overflow-y-hidden bg-transparent h-auto">
            {chartMenus.map((menu) => (
              <TabsTrigger
                className={cn(
                  'border-0 data-[state=active]:bg-muted data-[state=active]:text-primary data-[state=active]:border-0 data-[state=active]:rounded-sm',
                  { ['h-10 w-40']: !isMobile },
                )}
                key={menu.id}
                onClick={() => {
                  window.scrollTo({
                    top: (document.getElementById(menu.id)?.offsetTop ?? 0) - (isMobile ? 100 : 200),
                    behavior: 'smooth',
                  });
                }}
                value={menu.id}
              >
                {menu.group}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
      <div className="flex flex-col mt-12">
        <Card>
          <CardContent className="p-3 space-y-6">
            {chartMenus.map((menu) => (
              <div className="space-y-6" key={menu.group}>
                <div id={menu.id}>{menu.group}</div>
                <div className="grid grid-cols-1 min-[600px]:grid-cols-2 min-[900px]:grid-cols-3 min-[1200px]:grid-cols-4 md:gap-4">
                  {menu.charts.map(({ chart, link }) => (
                    <Link href={link} key={link}>
                      {chart}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
