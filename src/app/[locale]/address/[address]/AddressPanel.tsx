'use client';
import { Copy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ComponentProps } from 'react';

import AddressAvatar from '~/components/AddressAvatar';
import { Button } from '~/components/ui/button';
import { useToast } from '~/hooks/use-toast';
import { getAddressNetwork } from '~/lib/address';
import { cn } from '~/lib/utils';

import { NetworkIcon } from './utils';

export const AddressPanel = ({ address, className, ...props }: ComponentProps<'div'> & { address: string }) => {
  const t = useTranslations('AddressPage');
  const { toast } = useToast();
  const onCopy = () => {
    void navigator.clipboard.writeText(address);
    toast({ title: 'Copied' });
  };

  const addressNetwork = getAddressNetwork(address);

  return (
    <div className={cn(`flex-1 p-3 rounded-lg bg-muted px-2 md:px-3`, className)}>
      <div className="flex items-center space-x-2 mb-2">
        <AddressAvatar
          address={address}
          className="size-10"
          networkClassName="size-5"
          networkIconUrl={NetworkIcon[addressNetwork ?? 'CKB'] ?? '/img/nervos.png'}
        />
        <h2 className="text-xl font-semibold">{t('Address')}</h2>
      </div>
      <p className="text-sm mt-1 md:flex items-center gap-4 text-muted-foreground break-all inline">
        {address}
        <Button asChild className="w-4 h-4 ml-2" onClick={onCopy} size="icon" variant="ghost">
          <span className="hover:text-primary cursor-pointer relative">
            <Copy className="h-4 w-4 absolute -bottom-1 md:block md:-bottom-0" />
          </span>
        </Button>
      </p>
      {/* <div className="flex space-x-2 mt-2">
      <Button variant="secondary" size="sm" className="text-xs">
        Platform&apos;s
      </Button>
      <Button variant="secondary" size="sm" className="text-xs">
        Interacted Dapp
      </Button>
      <Button variant="secondary" size="sm" className="text-xs">
        Bot participated
      </Button>
    </div> */}
    </div>
  );
};
