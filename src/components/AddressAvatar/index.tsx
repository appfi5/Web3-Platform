import BoringAvatar, { type AvatarProps } from 'boring-avatars';
import Image from 'next/image';
import React, { type FC } from 'react';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';
import { useToast } from '~/hooks';
import { cn } from '~/lib/utils';
import { type NetworkInput } from '~/server/api/routers/zod-helper/network';

const colorSet = ['#FFAD08', '#EDD75A', '#73B06F', '#0C8F8F', '#405059'];
const networkList = ['BTC', 'CKB', 'ckb', 'btc'];

const AddressAvatar: FC<
  {
    address?: string;
    network?: NetworkInput;
    networkIconUrl?: string | null;
    networkClassName?: string;
  } & AvatarProps
> = ({ address, network, networkClassName, networkIconUrl, className, ...props }) => {
  const { toast } = useToast();

  const onCopy = () => {
    if (!address) return;
    void navigator.clipboard.writeText(address);
    toast({ title: 'Copied' });
  };

  const avatar = (
    <BoringAvatar
      className={cn('rounded-full size-5', className)}
      colors={colorSet}
      name={address?.toLowerCase()}
      size="100%"
      square
      variant="beam"
      {...props}
    />
  );

  if (!networkList.includes(network ?? '') && !networkIconUrl) {
    return avatar;
  }
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center justify-center relative">
            {avatar}
            <Image
              alt={address ?? ''}
              className={cn(
                'rounded-full size-3 border border-[#23272C] absolute -bottom-1 -right-1 z-1',
                networkClassName,
              )}
              height={20}
              src={networkIconUrl ?? (['BTC', 'btc'].includes(network ?? '') ? '/img/btc.png' : '/img/nervos.png')}
              width={20}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-[300px] break-all cursor-pointer" onClick={onCopy}>
            {address}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default AddressAvatar;
