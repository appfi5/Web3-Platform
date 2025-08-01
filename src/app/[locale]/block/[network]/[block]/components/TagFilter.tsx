'use client';
import { useMemo, useState } from 'react';

import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '~/components/ui/dropdown-menu';
import { cn } from '~/lib/utils';
import { type NetworkInput } from '~/server/api/routers/zod-helper';
import { api } from '~/trpc/react';

import FilterIcon from './filter.svg';

export default function TagFilter({
  blockNumber,
  tagFilter,
  setTagFilter,
  network,
}: {
  blockNumber: number;
  tagFilter: string[];
  setTagFilter: (tag: string[]) => void;
  network: NetworkInput;
}) {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  // const TAGS = [
  //   { groupName: 'Protocol', tags: ['RGB++', 'Spore'] },
  //   { groupName: 'Script', tags: ['xUDT', 'sUDT'] },
  //   { groupName: 'Category', tags: ['NFT', 'FT', 'Inscription'] },
  //   { groupName: 'Network', tags: ['Layer1', 'Layer2'] },
  // ];

  const { data } = api.v0.blocks.uniqTags.useQuery({ blockNumber, network });
  const tags = useMemo(() => data?.map((tag) => tag.label), [data]);

  // const filteredTags = TAGS.map((group) => ({
  //   ...group,
  //   tags: group.tags.filter((tag) => tags?.includes(tag)),
  // })).filter((group) => group.tags.length > 0);

  return (
    <DropdownMenu onOpenChange={setIsOpen} open={isOpen}>
      <DropdownMenuTrigger asChild>
        <div className="cursor-pointer">
          <FilterIcon className={cn('cursor-pointer', tagFilter.length > 0 ? 'text-primary' : '')} />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="flex flex-col gap-[16px] bg-[#101215] p-[16px] w-[94vw] ml-[3vw] mr-[3vw] md:w-[273px] rounded-[16px]">
        <div className="flex gap-[8px] flex-wrap">
          {tags?.map((tag) => {
            const activity = tagFilter.includes(tag);
            return (
              <div
                className={cn(
                  'bg-[#23272C] text-sm py-0.5 px-2 inline-block text-white rounded-md mr-2',
                  activity && ['text-primary', 'border-primary', 'border'],
                )}
                key={tag}
                onClick={() => setTagFilter(activity ? tagFilter.filter((v) => v !== tag) : tagFilter.concat(tag))}
                role="button"
              >
                {tag}
              </div>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
