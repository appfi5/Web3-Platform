'use client';

import * as RadioGroup from '@radix-ui/react-radio-group';
import { type ChangeEvent, useState } from 'react';

import { Button } from '~/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '~/components/ui/dropdown-menu';
import { Input } from '~/components/ui/input';
import { cn } from '~/lib/utils';

import FilterIcon from './filter.svg';

export default function AddressFilter({
  fromFilter,
  toFilter,
  setToFilter,
  setFromFilter,
  addressConditionFilter,
  setAddressConditionFilter,
}: {
  fromFilter: string | undefined;
  toFilter: string | undefined;
  setFromFilter: (from?: string) => void;
  setToFilter: (to?: string) => void;
  addressConditionFilter: 'or' | 'and' | undefined;
  setAddressConditionFilter: (addressCondition?: 'or' | 'and') => void;
}) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [from, setFrom] = useState<string | undefined>(fromFilter);
  const [to, setTo] = useState<string | undefined>(toFilter);
  const [addressCondition, setAddressCondition] = useState<'or' | 'and' | undefined>(addressConditionFilter);

  return (
    <DropdownMenu onOpenChange={setIsOpen} open={isOpen}>
      <DropdownMenuTrigger asChild>
        <div className="cursor-pointer">
          <FilterIcon className={cn('cursor-pointer', from || to ? 'text-primary' : '')} />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="flex flex-col gap-[16px] bg-[#101215] p-[16px] w-[94vw] ml-[3vw] mr-[3vw] md:w-[273px] rounded-[16px]">
        <h2 className="text-[16px] text-foreground ">Filter</h2>
        <div>
          <div className="mb-[8px] text-[14px]">From</div>
          <Input
            className="rounded-[12px] leading-[17px] pt-[24px] pb-[24px] pl-[12px] pr-[12px]"
            defaultValue={from}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setFrom(e.target.value)}
          />
        </div>
        <RadioGroup.Root
          className="flex gap-[32px]"
          defaultValue={addressCondition}
          onValueChange={(value) => setAddressCondition(value as 'or' | 'and')}
        >
          <div className="flex gap-[4px]">
            <label className="Label" htmlFor="r1">
              Or
            </label>
            <RadioGroup.Item
              className="w-[20px] h-[20px] border-[1.33px] border-[#E5FF5A] rounded-[100%]"
              id="r1"
              value="or"
            >
              <RadioGroup.Indicator className="flex items-center w-[100%] h-[100%] justify-center after:rounded-[50%] after:w-[10.67px] after:h-[11px] after:content-[''] after:bg-[#E5FF5A]" />
            </RadioGroup.Item>
          </div>
          <div className="flex gap-[4px]">
            <label className="Label" htmlFor="r1">
              And
            </label>
            <RadioGroup.Item
              className="w-[20px] h-[20px] border-[1.33px] border-[#E5FF5A] rounded-[100%]"
              id="r1"
              value="and"
            >
              <RadioGroup.Indicator className="flex items-center w-[100%] h-[100%] justify-center after:rounded-[50%] after:w-[10.67px] after:h-[11px] after:content-[''] after:bg-[#E5FF5A]" />
            </RadioGroup.Item>
          </div>
        </RadioGroup.Root>
        <div>
          <div className="mb-[8px] text-[14px]">To</div>
          <Input
            className="rounded-[12px] leading-[17px] pt-[24px] pb-[24px] pl-[12px] pr-[12px]"
            defaultValue={to}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setTo(e.target.value)}
          />
        </div>
        <Button
          className="w-full h-[48px] rounded-[12px] font-[800] text-[16px]"
          onClick={() => {
            setFromFilter(from);
            setToFilter(to);
            setAddressConditionFilter(addressCondition);
          }}
          type="submit"
        >
          Apply
        </Button>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
