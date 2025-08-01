'use client';
import { type ComponentProps } from 'react';

import { Skeleton } from '~/components/ui/skeleton';
import { cn } from '~/lib/utils';

type AssetInventory = {
  id: string;
  owner: string;
  picture?: string;
};

// random data
const mockData: AssetInventory[] = Array(15)
  .fill(' ')
  .map(() => ({
    id: '8e7456f8...4811a2fi0',
    owner: '1As24x1H.....Eqp203ax',
  }));

const AssetInventory = ({ inventory }: { inventory: AssetInventory }) => {
  return (
    <div className="bg-[#101215] rounded-md p-2 flex flex-col gap-4">
      <Skeleton className="w-full h-[88px]" />
      <div className="flex gap-2 items-center">
        <span className="w-12 text-muted-foreground">ID</span>
        <span className="overflow-hidden">{inventory.id}</span>
      </div>
      <div className="flex gap-2 items-center">
        <span className="w-12 text-muted-foreground">Owner</span>
        <span className="text-primary overflow-hidden">{inventory.owner}</span>
      </div>
    </div>
  );
};

export const AssetInventoryPanel = ({ uid, className, ...props }: ComponentProps<'div'> & { uid: string }) => {
  const inventories = mockData;
  return (
    <div className={cn('rounded-lg bg-muted p-3 flex flex-col gap-4', className)} {...props}>
      <div className="grid grid-cols-4 gap-6">
        {inventories.map((i, index) => (
          <AssetInventory inventory={i} key={index} />
        ))}
      </div>
    </div>
  );
};
