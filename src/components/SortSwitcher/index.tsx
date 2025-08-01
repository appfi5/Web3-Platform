import { useState } from 'react';

import { cn } from '~/lib/utils';

import { Button, type ButtonProps } from '../ui/button';

type SortTypes = 'asc' | 'desc';
export const SortSwitcher = ({
  onChange,
  order,
  children,
  className,
  ...props
}: Omit<ButtonProps, 'onChange' | 'onClick'> & { onChange?: (sort?: SortTypes) => void; order?: SortTypes }) => {
  const [_order, _setOrder] = useState<SortTypes | undefined>(order);

  const onChangeOrder = (order?: SortTypes) => {
    if (onChange) onChange(order);
    else _setOrder(order);
  };

  const activeOrder = order ?? _order;

  return (
    <Button
      className={cn('flex gap-2', className)}
      onClick={() => onChangeOrder(activeOrder === undefined ? 'desc' : activeOrder === 'desc' ? 'asc' : undefined)}
      {...props}
    >
      {children}
      <div className="flex flex-col">
        <span className={cn({ 'text-primary': activeOrder === 'asc' }, 'text-[8px] -mb-[10px]')}>▲</span>
        <span className={cn({ 'text-primary': activeOrder === 'desc' }, 'text-[8px]')}>▼</span>
      </div>
    </Button>
  );
};
