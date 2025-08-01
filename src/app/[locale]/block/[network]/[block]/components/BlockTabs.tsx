'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

import { Tabs, TabsList, TabsTrigger } from '~/components/ui/tabs';

export function BlockTabs({ tab }: { tab: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams?.toString());
      params.set(name, value);

      return params.toString();
    },
    [searchParams],
  );

  const activeTab = ['addresses', 'assets'].includes(tab) ? 'addresses' : 'overview';

  return (
    <Tabs
      defaultValue="overview"
      onValueChange={(tab) => router.push(pathname + '?' + createQueryString('tab', tab))}
      value={activeTab}
    >
      <TabsList className="mb-4 w-full md:w-auto">
        <TabsTrigger className="w-full" value="overview">
          Transactions
        </TabsTrigger>
        <TabsTrigger className="w-full" value="addresses">
          Statistic
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
