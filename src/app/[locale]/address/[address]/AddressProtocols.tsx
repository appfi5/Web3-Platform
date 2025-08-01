'use client';
import BigNumber from 'bignumber.js';
import dayjs from 'dayjs';
import { ChevronDown, LoaderCircle } from 'lucide-react';
import Image from 'next/image';
import { type ComponentProps, useState } from 'react';

import { SortSwitcher } from '~/components/SortSwitcher';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '~/components/ui/accordion';
import Pagination from '~/components/ui/pagination';
import { useIsMobile } from '~/hooks';
import { cn } from '~/lib/utils';
import { api, type RouterOutputs } from '~/trpc/react';
import { shannonToCkbDecimal } from '~/utils/utility';

import CkbBgSvg from './ckbBg.svg';
import EmptySvg from './empty.svg';

enum SortKey {
  time = 'time',
  value = 'value',
}

type SortOrder = 'desc' | 'asc';

const NervosDaoProtocal = ({ protocol }: { protocol: RouterOutputs['v0']['address']['protocals'][0] }) => {
  const isMobile = useIsMobile();
  const deposit = shannonToCkbDecimal(protocol.deposit, 8).toLocaleString(undefined, { minimumFractionDigits: 8 });
  const compensation = shannonToCkbDecimal(protocol.compensation, 8).toLocaleString(undefined, {
    minimumFractionDigits: 8,
  });
  return (
    <AccordionItem className="bg-[#1C2024] rounded-sm px-2" value={protocol.key}>
      <AccordionTrigger
        className="relative py-4 text-[#fafafa] font-normal text-sm pr-14 hover:no-underline"
        hiddenIcon={isMobile}
      >
        <div className="w-full flex max-md:flex-col max-md:justify-start max-md:items-start justify-between max-md:gap-2">
          <div className="flex items-center gap-2 mr-auto">
            <Image alt="nervos dao icon" className="rounded-full" height={16} src="/img/nervos.png" width={16} />
            <span>Nervos Dao</span>
          </div>
          <div>
            <span className="text-muted-foreground">Deposit Time:</span>{' '}
            {dayjs(protocol.depositTimestamp).format('YYYY.MM.DD HH:mm')}
          </div>
          <div className="ml-auto mr-2 max-md:ml-0 flex items-center">
            $ {protocol.amountUsd.split('.')[0]}.
            <span className="text-xs text-muted-foreground">{protocol.amountUsd.split('.')[1]}</span>{' '}
            <ChevronDown
              className="hidden max-md:block h-4 w-4 shrink-0 transition-transform duration-200"
              id="chevron"
            />
          </div>
        </div>
        <CkbBgSvg className="w-12 absolute right-0 top-0" />
      </AccordionTrigger>
      <AccordionContent className="flex justify-center max-md:justify-start bg-accent py-2 px-1 rounded-sm overflow-x-scroll">
        <div className="flex flex-col md:hidden w-full px-2">
          <div className="flex flex-col py-2 gap-2 w-full">
            <span className="text-sm">Nervos DAO Deposit </span>
            <div>
              <div className="text-muted-foreground text-sm">Amount</div>
              <div className="text-sm">
                {deposit.split('.')[0]}.<span className="text-xs text-muted-foreground">{deposit.split('.')[1]}</span>{' '}
                CKB
              </div>
            </div>
            <div>
              <div className="text-muted-foreground text-sm">USD Value</div>
              <div className="text-sm">
                $ {protocol.depositVolume.split('.')[0]}.
                <span className="text-xs text-muted-foreground">{protocol.depositVolume.split('.')[1]}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col py-2 gap-2 border-t border-[#333333] w-full">
            <span className="text-sm">Nervos DAO Compensation </span>
            <div>
              <div className="text-muted-foreground text-sm">Amount</div>
              <div className="text-sm">
                {compensation.split('.')[0]}.
                <span className="text-xs text-muted-foreground">{compensation.split('.')[1]}</span> CKB
              </div>
            </div>
            <div>
              <div className="text-muted-foreground text-sm">USD Value</div>
              <div className="text-sm">
                $ {protocol.compensationVolume.split('.')[0]}.
                <span className="text-xs text-muted-foreground">{protocol.compensationVolume.split('.')[1]}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="hidden md:grid grid-cols-3 gap-y-2 min-w-[600px] max-w-[900px] flex-1">
          <span className="text-muted-foreground text-sm">Type</span>
          <span className="text-muted-foreground text-sm">Amount</span>
          <span className="text-muted-foreground text-sm">USD Value</span>

          <span className="text-sm">Nervos DAO Deposit </span>
          <span className="text-sm">
            {deposit.split('.')[0]}.<span className="text-xs text-muted-foreground">{deposit.split('.')[1]}</span> CKB
          </span>

          <div className="text-sm">
            $ {protocol.depositVolume.split('.')[0]}.
            <span className="text-xs text-muted-foreground">{protocol.depositVolume.split('.')[1]}</span>
          </div>

          <span className="text-sm">Nervos DAO Compensation</span>
          <span className="text-sm">
            {compensation.split('.')[0]}.
            <span className="text-xs text-muted-foreground">{compensation.split('.')[1]}</span> CKB
          </span>

          <div className="text-sm">
            $ {protocol.compensationVolume.split('.')[0]}.
            <span className="text-xs text-muted-foreground">{protocol.compensationVolume.split('.')[1]}</span>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};

export const AddressProtocol = ({ address, className, ...props }: ComponentProps<'div'> & { address: string }) => {
  const { data: _protocols = [], isLoading } = api.v0.address.protocals.useQuery({ address });
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [sorting, setSorting] = useState<[SortKey | undefined, SortOrder | undefined]>([undefined, undefined]);

  if (isLoading) {
    return (
      <div className={cn('rounded-lg bg-muted p-3 flex flex-col gap-4', className)} {...props}>
        <div className="flex items-center justify-center w-full h-32">
          <LoaderCircle className="animate-spin" />
        </div>
      </div>
    );
  }

  if (_protocols.length === 0) {
    return (
      <div
        className={cn('rounded-lg bg-muted p-3 flex flex-col items-center justify-center gap-4 h-60', className)}
        {...props}
      >
        <EmptySvg className="w-24" />
        <p>No Data</p>
      </div>
    );
  }

  const protocols = (() => {
    switch (sorting[0]) {
      case SortKey.value:
        return _protocols.sort((a, b) =>
          BigNumber(a.amountUsd).gte(b.amountUsd) ? (sorting[1] === 'desc' ? -1 : 1) : sorting[1] === 'desc' ? 1 : -1,
        );
      case SortKey.time:
        return _protocols.sort((a, b) =>
          dayjs(a.depositTimestamp).isBefore(dayjs(b.depositTimestamp))
            ? sorting[1] === 'desc'
              ? 1
              : -1
            : sorting[1] === 'desc'
              ? -1
              : 1,
        );
      default:
        return _protocols;
    }
  })().slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className={cn('rounded-lg bg-muted p-3 flex flex-col gap-4', className)} {...props}>
      <div className="flex">
        <SortSwitcher
          className="ml-auto text-muted-foreground"
          onChange={(sort) => setSorting(sort === undefined ? [undefined, undefined] : [SortKey.value, sort])}
          order={sorting[0] === SortKey.value ? sorting[1] : undefined}
          variant="ghost"
        >
          By Value
        </SortSwitcher>
      </div>
      <Accordion className="flex flex-col gap-4" collapsible type="single">
        {protocols.map((protocol, index) => {
          if (protocol.type === 'nervos_dao') {
            return <NervosDaoProtocal key={protocol.key} protocol={protocol} />;
          }
          return (
            <div className="flex bg-[#1C2024] rounded-sm py-4 px-2" key={index}>
              Protocol not yet supported
            </div>
          );
        })}
      </Accordion>

      <div className="w-full flex justify-center">
        <Pagination
          current={page}
          onChangePage={(page) => setPage(page)}
          total={Math.ceil(_protocols.length / pageSize)}
        />
      </div>
    </div>
  );
};
