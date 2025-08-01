import { currentUser } from '@clerk/nextjs/server';

import { Card, CardContent } from '~/components/ui/card';
import { redirect } from '~/i18n/navigation';

import { AccountAssetTable } from './AccountAssetTable';
import { AccountTransactions } from './AccountTransactions';
import { TransactionCountCard } from './TransactionCountCard';
import { WalletsManage } from './WalletsManage';

type Props = {
  params: { locale: string };
};

export default async function AccountPage({ params: { locale } }: Props) {
  const user = await currentUser();

  if (!user) return redirect({ href: '/signin', locale });

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 md:grid md:grid-cols-5 gap-4">
        <Card className="md:col-span-2">
          <CardContent className="md:p-4 p-2 gap-2 flex-wrap flex-col flex w-full">
            <div className="bg-[#171A1F] rounded-md flex w-full p-3">
              <div className="font-bold">{user.username ?? 'UserName'}</div>

              <WalletsManage className="ml-auto" />
            </div>

            <AccountAssetTable />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4 md:col-span-3">
          <Card>
            <CardContent className="md:p-4 p-2 gap-2 flex-wrap flex-col flex w-full">
              <TransactionCountCard />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="md:p-4 p-2 gap-2 flex-wrap flex-col flex w-full">
              <AccountTransactions />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
