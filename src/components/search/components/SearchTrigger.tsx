import React, { type FC } from 'react';

import { DialogTrigger } from '~/components/ui/dialog';
import { cn } from '~/lib/utils';

import SearchSvg from '../icon/search.svg';

const SearchTrigger: FC<{
  isMobileStyle: boolean;
}> = ({ isMobileStyle }) => {
  if (isMobileStyle) {
    return (
      <DialogTrigger className="bg-transparent">
        <SearchSvg className="fill-white size-4" />
      </DialogTrigger>
    );
  }

  return (
    <DialogTrigger
      className={cn(
        'h-11 rounded-[40px] w-56 flex justify-between items-center p-3 border-[#515151] border',
        'bg-transparent px-2 py-0 shadow-none outline-none',
      )}
    >
      <SearchSvg className="size-4" />
      <div className="flex items-center gap-1 text-primary [&>kbd]:bg-[#515151]">
        <kbd className="w-5 h-5 leading-5 text-xl rounded border">⌘</kbd>
        <kbd className="w-5 h-5 leading-5 rounded border">K</kbd>
      </div>
    </DialogTrigger>
  );
};

export default SearchTrigger;
