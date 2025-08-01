'use client';

import * as RadioGroup from '@radix-ui/react-radio-group';
import { useState } from 'react';

import { Button } from '~/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '~/components/ui/dropdown-menu';
import { Skeleton } from '~/components/ui/skeleton';
import { cn } from '~/lib/utils';
import { api } from '~/trpc/react';

import FilterIcon from './filter.svg';

export default function AssetFilter({
  assetFilter,
  setAssetFilter,
  blockHash,
}: {
  assetFilter?: string;
  setAssetFilter: (assetId?: string) => void;
  blockHash: string;
}) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [assetId, setAssetId] = useState<string | undefined>(assetFilter);

  const { data: assetList, isLoading: assetListLoading } = api.v0.blocks.uniqAssets.useQuery({ blockHash });

  return (
    <DropdownMenu onOpenChange={setIsOpen} open={isOpen}>
      <DropdownMenuTrigger asChild>
        <div className="flex items-center gap-[4px]">
          <FilterIcon className={cn('cursor-pointer', assetId && 'text-primary')} />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="flex flex-col gap-[16px] bg-[#101215] p-[16px] w-[273px] rounded-[16px]">
        <h2 className="text-[16px] text-foreground ">Filter</h2>
        {assetListLoading || !assetList ? (
          <Skeleton className="w-full h-[48px]" />
        ) : (
          <RadioGroup.Root
            className="flex flex-col gap-[32px]"
            defaultValue={assetId}
            onValueChange={(value) => setAssetId(value)}
          >
            {assetList.map((asset) => (
              <div className="flex justify-between gap-[4px]" key={asset.assetId}>
                <label className="Label" htmlFor={asset.name ?? ''}>
                  {asset.name ?? ''}
                </label>
                <RadioGroup.Item
                  className="w-[20px] h-[20px] border-[1.33px] border-[#E5FF5A] rounded-[100%]"
                  id={asset.assetId}
                  value={asset.assetId}
                >
                  <RadioGroup.Indicator className="flex items-center w-[100%] h-[100%] justify-center after:rounded-[50%] after:w-[10.67px] after:h-[11px] after:content-[''] after:bg-[#E5FF5A]" />
                </RadioGroup.Item>
              </div>
            ))}
          </RadioGroup.Root>
        )}
        <Button
          className="w-full h-[48px] rounded-[12px] font-[800] text-[16px]"
          onClick={() => {
            setAssetFilter(assetId);
          }}
          type="submit"
        >
          Apply
        </Button>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
