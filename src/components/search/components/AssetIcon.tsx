import { type FC } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';

const AssetIcon: FC<{ icon?: string | null; symbol?: string | null }> = ({ icon, symbol }) => {
  return (
    <Avatar className="w-5 h-5 text-[8px]">
      {icon ? <AvatarImage alt="icon" src={icon} /> : null}
      <AvatarFallback>{symbol}</AvatarFallback>
    </Avatar>
  );
};

export default AssetIcon;
