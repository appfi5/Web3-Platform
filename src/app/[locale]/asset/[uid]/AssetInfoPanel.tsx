'use client';
import { type ComponentProps } from 'react';

import { cn } from '~/lib/utils';

export const AssetInfoPanel = ({
  description,
  className,
  ...props
}: ComponentProps<'div'> & { description: string }) => {
  return (
    <div className={cn('rounded-lg bg-muted p-3 flex flex-col gap-4', className)} {...props}>
      <div className="flex flex-col gap-2">
        <div className="font-medium">Description</div>
        <div className="bg-[#1C2024] py-2 px-1 rounded-sm font-normal">{description}</div>
      </div>
    </div>
  );
};
