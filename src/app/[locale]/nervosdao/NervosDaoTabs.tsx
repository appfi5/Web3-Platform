'use client';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { Card, CardContent } from '~/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';

import { NervosDaoDepositors } from './NervosDaoDepositors';
import { NervosDaoTransactions } from './NervosDaoTransactions';

export const NervosDaoTabs = ({ initialTab }: { initialTab?: string }) => {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState(initialTab ?? 'faq');

  const updateTab = (value: string) => {
    setTab(value);
    const params = new URLSearchParams(searchParams?.toString());
    params.set('tab', value);
    router.push(pathname + '?' + params.toString(), { scroll: false });
  };

  return (
    <Tabs
      className="md:space-y-4 space-y-1"
      defaultValue="overview"
      onValueChange={(value) => updateTab(value)}
      value={tab}
    >
      <Card>
        <CardContent className="md:p-4 p-2">
          <TabsList className="md:mb-4 mb-2 overflow-x-scroll justify-start max-w-full overflow-y-hidden">
            <TabsTrigger value="faq">FAQ</TabsTrigger>
            {/* <TabsTrigger value="transactions">Transactions</TabsTrigger> */}
            <TabsTrigger value="depositors">Depositors</TabsTrigger>
          </TabsList>

          <TabsContent className="w-full flex flex-col gap-4" value="faq">
            <div className="space-y-4">
              <div className="bg-[#171A1F] py-4 px-3 space-y-2 leading-loose">
                <span>What is Nervos DAO?</span>
                <div className="text-sm leading-loose text-muted-foreground">
                  Nervos DAO is a smart contract on the Nervos CKB blockchain that allows CKByte holders to deposit
                  their CKBytes and earn proportional secondary issuance rewards. The DAO helps protect holdings from
                  the dilution caused by secondary issuance.
                </div>
              </div>
              <div className="bg-[#171A1F] py-4 px-3 space-y-2 leading-loose">
                <span>Why should I deposit in Nervos DAO?</span>
                <div className="text-sm leading-loose text-muted-foreground">
                  Depositing in Nervos DAO provides a way to protect your CKBytes from dilution caused by secondary
                  issuance. By locking your CKBytes in Nervos DAO, you receive proportional compensation through
                  secondary issuance rewards, ensuring that the value of your holdings is maintained over time, even as
                  more CKBytes are issued. Additionally, this is an excellent long-term investment strategy for CKByte
                  holders, as it minimizes the need for frequent interaction and guarantees your holdings grow alongside
                  network issuance.
                </div>
              </div>
              <div className="bg-[#171A1F] py-4 px-3 space-y-2 leading-loose">
                <span>How can I deposit CKBytes into Nervos DAO?</span>
                <div className="text-sm leading-loose text-muted-foreground">
                  To deposit CKBytes, users must create a transaction with a specific output called a deposit cell:
                  <ul className="list-disc list-inside">
                    <li>The transaction must include the Nervos DAO type script.</li>
                    <li>The deposit cell must have 8 bytes of data filled with zeros.</li>
                    <li>The Nervos DAO type script must be referenced in the transaction’s cell_deps.</li>
                  </ul>
                  A single transaction can include multiple deposit cells if needed.
                </div>
              </div>
            </div>
          </TabsContent>
          <TabsContent className="w-full flex flex-col gap-4" value="transactions">
            <NervosDaoTransactions />
          </TabsContent>

          <TabsContent className="w-full flex flex-col gap-4" value="depositors">
            <NervosDaoDepositors />
          </TabsContent>
        </CardContent>
      </Card>
    </Tabs>
  );
};
