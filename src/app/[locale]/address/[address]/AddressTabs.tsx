'use client';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

import { Card, CardContent } from '~/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { usePathname, useRouter } from '~/i18n/navigation';
import { getAddressNetwork } from '~/lib/address';

import { AddressOverview } from './AddressOverview';
import { AddressProtocol } from './AddressProtocols';
import { AddressTransactions } from './AddressTransactions';
import { AssetTable } from './AssetTable';
import { TransactionCountCard } from './TransactionCountCard';
import { TreeMapChart } from './TreeMapChart';

const CKBAddressInfo = dynamic(() => import('./AddressUTXOInfo'), { ssr: false });

export const AddressTabs = ({ tab, address }: { tab?: string; address: string }) => {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const addressNetwork = getAddressNetwork(address);

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams?.toString());
      params.set(name, value);

      return params.toString();
    },
    [searchParams],
  );

  return (
    <Tabs
      className="md:space-y-4 space-y-1"
      defaultValue="overview"
      onValueChange={(tab) => router.push(pathname + '?' + createQueryString('tab', tab))}
      value={tab}
    >
      <Card>
        <CardContent className="md:p-4 p-2">
          <TabsList className="md:mb-4 mb-2 overflow-x-scroll justify-start max-w-full overflow-y-hidden">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            {addressNetwork === 'CKB' && <TabsTrigger value="protocols">Protocols</TabsTrigger>}
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            {addressNetwork === 'CKB' && <TabsTrigger value="utxo">UTXO Info</TabsTrigger>}
          </TabsList>

          <TabsContent className="w-full flex flex-col gap-4" value="overview">
            <AddressOverview address={address} />
            <TransactionCountCard address={address} />
          </TabsContent>
          {addressNetwork === 'CKB' && (
            <TabsContent className="w-full flex flex-col gap-4" value="protocols">
              <AddressProtocol address={address} />
            </TabsContent>
          )}
          <TabsContent className="w-full flex flex-col gap-4" value="transactions">
            <AddressTransactions address={address} />
          </TabsContent>
          {addressNetwork === 'CKB' && (
            <TabsContent className="w-full flex flex-col gap-4" value="utxo">
              <CKBAddressInfo address={address} />
            </TabsContent>
          )}
        </CardContent>
      </Card>

      <TabsContent className="grid md:grid-cols-2 md:gap-4 gap-1 grid-cols-1 items-start" value="overview">
        <Card>
          <CardContent className="md:p-4 p-2">
            <TreeMapChart address={address} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-0 h-full">
            <AssetTable address={address} className="w-full h-full" />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};
