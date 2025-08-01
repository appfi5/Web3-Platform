'use client';

import { type ColumnDef } from '@tanstack/react-table';
import Image from 'next/image';
import Link from 'next/link';
import numbro from 'numbro';

import AddressAvatar from '~/components/AddressAvatar';
import HashViewer from '~/components/HashViewer';
import { TxCountBadge } from '~/components/TxCountBadge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';
import { type CoinMarketAssetType } from '~/utils/const';
import { getIconBySymbol, trunkLongStr } from '~/utils/utility';

export type AmountRow = {
  value: string | number;
  icon: string | null;
  symbol: string | null;
};

export type Transaction = {
  id: string;
  tx: {
    hash: string;
    time: string;
  };
  from: {
    address: string;
    count: number;
  };
  to: {
    address: string;
    count: number;
  };
  amount: AmountRow;
  volume: string;
};

type TableMeta = {
  isScreenLarge?: boolean;
};

export const columns: ColumnDef<Transaction>[] = [
  {
    accessorKey: 'tx',
    header: () => <div className="!pl-7">Time</div>,
    cell: ({ row }) => {
      const {
        hash,
        time,
        assetId,
        network,
      }: {
        hash: string;
        time: string;
        assetId: CoinMarketAssetType;
        network: 'ckb' | 'btc';
      } = row.getValue('tx');
      return (
        <Link className="text-primary flex items-center gap-2 min-w-40" href={`/transaction/${hash}`}>
          <Image alt={assetId} height={20} src={`/img/${network}.png`} width={20} />
          <p className="whitespace-nowrap overflow-hidden text-ellipsis w-full">{time}</p>
        </Link>
      );
    },
  },
  {
    accessorKey: 'from',
    header: () => <div>From</div>,
    cell: ({ row, table }) => {
      const {
        address,
        count,
        hash,
      }: {
        address: string;
        count: number;
        hash: string;
      } = row.getValue('from');
      const isScreenLarge = (table.options.meta as TableMeta)?.isScreenLarge;
      const addressTrunkLen = isScreenLarge ? 8 : 4;
      return (
        <div className="flex">
          <div className={`text-primary flex gap-1 items-center ${isScreenLarge ? 'min-w-[132px]' : 'min-w-20'}`}>
            <Link className="inconsolata flex items-center gap-1" href={`/address/${address}`}>
              <AddressAvatar address={address} />
              <HashViewer formattedValue={trunkLongStr(address, addressTrunkLen, addressTrunkLen)} value={address} />
            </Link>
            {count > 1 && <TxCountBadge count={count} hash={hash} />}
          </div>
          <div className="grow flex items-center justify-center pl-2 2xl:pl-4 min-w-6">
            <Image alt="to" height={20} src="/img/to.svg" width={20} />
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: 'to',
    header: () => <div>To</div>,
    cell: ({ row, table }) => {
      const {
        address,
        count,
        hash,
      }: {
        address: string;
        count: number;
        hash: string;
      } = row.getValue('to');
      const addressTrunkLen = (table.options.meta as TableMeta)?.isScreenLarge ? 8 : 4;
      return (
        <div className="text-primary flex gap-1 items-center">
          <Link className="inconsolata flex items-center gap-1" href={`/address/${address}`}>
            <AddressAvatar address={address} />
            <HashViewer formattedValue={trunkLongStr(address, addressTrunkLen, addressTrunkLen)} value={address} />
          </Link>
          {count > 1 && <TxCountBadge count={count} hash={hash} />}
        </div>
      );
    },
  },
  {
    accessorKey: 'amount',
    header: () => <div>Amount</div>,
    cell: ({ row }) => {
      const {
        value,
        icon,
        symbol,
      }: {
        value: string;
        icon: string;
        symbol: string;
      } = row.getValue('amount');
      return (
        <div className="flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>{numbro(value).format({ average: true, mantissa: 2 }).toUpperCase()}</span>
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-[300px] break-all">{value}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Image alt={symbol ?? 'symbol-icon'} height={20} src={getIconBySymbol(symbol, icon)} width={20} />
          <span className="text-[#999]">{symbol}</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'volume',
    header: () => <div>Volume</div>,
    cell: ({ row }) => {
      return <div className="min-w-28">${row.getValue('volume')}</div>;
    },
  },
];
