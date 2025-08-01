'use client';

import { TooltipContent } from '@radix-ui/react-tooltip';
import { useEffect, useState } from 'react';

import { Tooltip, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';
import { dayjs } from '~/utils/utility';

export const FromNow = ({ timestamp }: { timestamp: dayjs.ConfigType }) => {
  const [currentTime, setCurrentTime] = useState(dayjs());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(dayjs());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="text-nowrap">{dayjs.utc(timestamp).local().from(currentTime)}</div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="p-2 bg-secondary bg-opacity-25 border rounded">
            {dayjs.utc(timestamp).local().format('YYYY-MM-DD HH:mm:ss')}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
