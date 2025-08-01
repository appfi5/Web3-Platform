import { useEffect, useState } from 'react';

import { cn } from '~/lib/utils';

type SortTypes = 'asc' | 'desc' | 'default';
export const SortSwitch = ({ onChange }: { onChange?: (sort: SortTypes) => void }) => {
  const [order, setOrder] = useState<SortTypes>('default');

  useEffect(() => {
    onChange?.(order);
  }, [order]);

  return (
    <div
      className="flex flex-col pl-1 cursor-pointer"
      onClick={() => setOrder(order === 'default' ? 'desc' : order === 'desc' ? 'asc' : 'default')}
      role="button"
    >
      <span className={cn({ 'text-primary': order === 'asc' }, 'text-[8px] -mb-[10px]')}>▲</span>
      <span className={cn({ 'text-primary': order === 'desc' }, 'text-[8px]')}>▼</span>
    </div>
  );
};
