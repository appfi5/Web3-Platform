import numbro from 'numbro';
import React, { type FC } from 'react';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

const NumberTooltip: FC<{
  value: number | string | bigint;
  className?: string;
  tooltipClassName?: string;
}> = ({ value, className, tooltipClassName }) => {
  let formattedValue = numbro(value)
    .format({
      thousandSeparated: true,
      mantissa: 2,
      average: true,
    })
    .toUpperCase();
  if (formattedValue === 'NAN') {
    formattedValue = '-';
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={className}>{formattedValue}</span>
        </TooltipTrigger>
        <TooltipContent className={tooltipClassName}>{value}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default NumberTooltip;
