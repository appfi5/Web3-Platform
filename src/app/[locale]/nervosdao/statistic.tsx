import { HelpCircleIcon } from 'lucide-react';
import type { ComponentProps, PropsWithChildren, ReactNode } from 'react';

import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip';
import { cn } from '~/lib/utils';

type FAQItemProps = {
  header?: string;
  suffix?: ReactNode;
  tooltip?: string;
} & ComponentProps<'div'>;

export function Statistic({ header, suffix, tooltip, children, className, ...props }: PropsWithChildren<FAQItemProps>) {
  return (
    <div className={cn('bg-[#171A1F] p-3 space-y-2 rounded-md', className)} {...props}>
      <div className="flex">
        <span className="text-muted-foreground flex items-center gap-2">
          {header}
          {tooltip ? (
            <Tooltip delayDuration={200} key="tooltip">
              <TooltipTrigger asChild>
                <HelpCircleIcon className="cursor-pointer hidden md:block" size={16} />
              </TooltipTrigger>

              <TooltipContent>
                <p className="max-w-96">
                  {tooltip.split('\\n').map((item, index) => (index === 0 ? item : [<br key={index} />, item]))}
                </p>
              </TooltipContent>
            </Tooltip>
          ) : null}
        </span>
        {suffix ? <div className="ml-auto">{suffix}</div> : null}
      </div>
      {children}
    </div>
  );
}
