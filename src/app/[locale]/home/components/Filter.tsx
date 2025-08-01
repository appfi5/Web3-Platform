'use client';

import BigNumber from 'bignumber.js';
import { format } from 'date-fns';
import dayjs from 'dayjs';
import { Calendar as CalendarIcon } from 'lucide-react';
import Image from 'next/image';
import { useCallback, useState } from 'react';
import { type DateRange } from 'react-day-picker';

import { Button } from '~/components/ui/button';
import { Calendar } from '~/components/ui/calendar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '~/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';
import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group';
import { cn } from '~/lib/utils';
import { NATIVE_ASSETS } from '~/utils/const';

import RangeInput from './RangeInput';

const networkOptions = [
  { label: 'BTC', value: NATIVE_ASSETS.BTC },
  { label: 'CKB', value: NATIVE_ASSETS.CKB },
];

const toggleGroupItemClassName =
  'font-normal bg-border h-[21px] text-[14px] hover:bg-border hover:text-foreground data-[state=on]:bg-border data-[state=on]:text-primary data-[state=on]:border-primary border-[1px]';

export type FilterParams = {
  assetId?: string;
  time: { from: Date; to: Date };
  amount?: string[];
  volume?: string[];
  tokens?: string[];
  assetTags?: string[];
};

export default function Filter({ onChange }: { onChange: ({ assetId, time, amount }: FilterParams) => void }) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [date, setDate] = useState<DateRange | undefined>({
    from: dayjs().subtract(1, 'M').toDate(),
    to: new Date(),
  });
  const [network, setNetwork] = useState<string[]>([]);

  const [amount, setAmount] = useState(['', '']);
  const [volume, setVolume] = useState(['', '']);

  const handleApply = useCallback(() => {
    const params: FilterParams = {
      time: {
        from: date?.from ?? dayjs().subtract(1, 'M').toDate(),
        to: date?.to ?? new Date(),
      },
    };

    params.assetId = network.length === 1 ? network[0] : '';

    if (amount?.[0]) {
      params.amount = [BigNumber(amount[0]).multipliedBy(1e8).toString()];
    }
    if (amount?.[1]) {
      params.amount = [params.amount?.[0] || '0', BigNumber(amount[1]).multipliedBy(1e8).toString()];
    }

    if (volume?.[0]) {
      params.volume = [volume[0]];
    }
    if (volume?.[1]) {
      params.volume = [params.volume?.[0] || '0', volume[1]];
    }

    onChange(params);
    setIsOpen(false);
    setDate({ from: params.time.from, to: params.time.to });
  }, [network, date, amount, volume, setIsOpen]);

  return (
    <DropdownMenu onOpenChange={setIsOpen} open={isOpen}>
      <DropdownMenuTrigger asChild>
        <Image alt="filter" className="cursor-pointer" height={20} src="/img/filter.svg" width={20} />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="p-4 mr-8">
        <p className="text-[16px] text-foreground">Filter</p>

        <p className="pt-[16px] text-[14px] font-medium">Network</p>
        <ToggleGroup className="justify-start mt-[10px]" onValueChange={setNetwork} type="multiple" value={network}>
          {networkOptions.map((item) => (
            <ToggleGroupItem className={toggleGroupItemClassName} key={item.value} value={item.value}>
              {item.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <p className="pt-[16px] text-[14px] font-medium">Time</p>
        <div className="mt-[8px] relative">
          <Popover onOpenChange={setIsPopoverOpen} open={isPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                className={cn('w-[300px] justify-start text-left font-normal', !date && 'text-muted-foreground')}
                id="date"
                variant={'outline'}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date?.from ? (
                  date.to ? (
                    <>
                      {format(date.from, 'LLL dd, y')} - {format(date.to, 'LLL dd, y')}
                    </>
                  ) : (
                    format(date.from, 'LLL dd, y')
                  )
                ) : (
                  <span>Pick a date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-0 h-[310px] overflow-y-auto">
              <Calendar
                defaultMonth={date?.from}
                disabled={(v) => dayjs().subtract(1, 'M').isAfter(v, 'day') || dayjs(v).isAfter(dayjs(), 'day')}
                mode="range"
                numberOfMonths={2}
                onSelect={setDate}
                selected={date}
              />
            </PopoverContent>
          </Popover>
        </div>

        <RangeInput label="Amount" onChange={setAmount} value={amount} />

        <RangeInput label="Volume" onChange={setVolume} value={volume} />

        <Button className="w-full h-[48px] font-[800] text-[16px] mt-[16px]" onClick={handleApply} type="submit">
          Apply
        </Button>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
