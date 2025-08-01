import React, { type FC } from 'react';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';
import { cn } from '~/lib/utils';

const HashViewer: FC<{
  value: string;
  formattedValue?: string;
  type?: 'hash' | 'address';
  network?: 'BTC' | 'CKB' | 'btc' | 'ckb';
  className?: string;
}> = ({ value, formattedValue, type, network, className }) => {
  let finalFormattedValue = formattedValue || value;

  if (type === 'hash') {
    if (network === 'BTC' || network === 'btc') {
      finalFormattedValue = value.slice(0, 8) + '...' + value.slice(-8);
    } else {
      finalFormattedValue = value.slice(0, 8) + '...' + value.slice(-8);
    }
  } else if (type === 'address') {
    finalFormattedValue = value.slice(0, 4) + '...' + value.slice(-4);
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn('text-inherit hover:opacity-80 active:opacity-60', className)}>
            {finalFormattedValue}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-[300px] break-all">{value}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default HashViewer;
