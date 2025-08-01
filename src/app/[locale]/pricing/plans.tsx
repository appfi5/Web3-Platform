'use client';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { FollowerPointerCard } from '~/components/ui/following-pointer';
import { MagicCard } from '~/components/ui/magic-card';
import { cn } from '~/lib/utils';

const HIGHLIGHTED_PLAN = 'Premium Plan';

const UpgradeButton = ({ isHighlighted = false, plan }: { isHighlighted?: boolean; plan: string }) => {
  return (
    <Button
      className={cn(
        'h-12 text-sm font-bold rounded-xl  hover:text-primary hover:border hover:border-primary hover:bg-[#222]',
        isHighlighted ? '' : 'bg-[#222]',
      )}
      variant={isHighlighted ? 'default' : 'outline'}
    >
      {plan === 'entreprise' ? 'Contact Sales' : 'Upgrade'}
    </Button>
  );
};

const Plans = () => {
  const [isAnnually, setIsAnnually] = useState(true);
  const t = useTranslations('PricingPage');

  const plans: Array<Array<{ label: string; value: React.ReactNode }>> = [
    [
      { label: 'Free Plan', value: 'Ideal for testing and side projects' },
      { label: t('plan.price'), value: '$0/month' },
      { label: t('plan.projects'), value: '1' },
      { label: t('plan.credits'), value: '10,000/month' },
      { label: t('plan.rate-limit'), value: '50 requests/sec' },
      { label: t('plan.support'), value: 'Community Support' },
      { label: t('plan.workflow'), value: 'Public Only' },
      {
        label: 'action',
        value: <UpgradeButton plan="free" />,
      },
    ],
    [
      { label: 'Individual Plan', value: 'For solo builders needing more flexibility' },
      { label: t('plan.price'), value: `$${isAnnually ? 39 : 49}/month` },
      { label: t('plan.projects'), value: 'Up to 5' },
      { label: t('plan.credits'), value: '50,000/month' },
      { label: t('plan.rate-limit'), value: '50 requests/sec' },
      { label: t('plan.support'), value: 'Email' },
      { label: t('plan.workflow'), value: 'Private & Public Workflows' },
      {
        label: 'action',
        value: <UpgradeButton plan="individual" />,
      },
    ],
    [
      { label: 'Premium Plan', value: 'Scalable power for growing businesses' },
      { label: t('plan.price'), value: `$${isAnnually ? 199 : 249}/month` },
      { label: t('plan.projects'), value: 'Unlimited' },
      { label: t('plan.credits'), value: '500,000/month' },
      { label: t('plan.rate-limit'), value: '100 requests/sec' },
      { label: t('plan.support'), value: 'Dedicated Account Manager' },
      { label: t('plan.workflow'), value: 'Private & Public Workflows' },
      {
        label: 'action',
        value: <UpgradeButton isHighlighted plan="premium" />,
      },
    ],
    [
      { label: 'Enterprise Plan', value: 'Enterprise-grade features with full control' },
      { label: t('plan.price'), value: 'Contact us' },
      { label: t('plan.projects'), value: 'Unlimited' },
      { label: t('plan.credits'), value: 'Custom' },
      { label: t('plan.rate-limit'), value: 'Unlimited' },
      { label: t('plan.support'), value: '24/7 premium support' },
      { label: t('plan.workflow'), value: 'Versioning Included' },
      {
        label: 'action',
        value: <UpgradeButton plan="entreprise" />,
      },
    ],
  ];

  return (
    <div className="flex flex-col items-center">
      <div
        className={cn(
          'flex items-center gap-1 mt-8 mb-9 rounded-full border-[#222] border h-12 bg-[#101214] cursor-pointer',
          'lg:mt-10 lg:mb-14',
        )}
      >
        <span
          className={cn(
            'w-40 flex justify-center items-center rounded-full px-6 h-full gap-2 border border-transparent',
            isAnnually ? 'text-theme-primary border-theme-primary' : '',
          )}
          onClick={() => setIsAnnually(true)}
        >
          {t('plan.annually')}
          <span className="flex items-center text-theme-primary text-[10px] leading-none px-1 py-0.5 rounded-full bg-[#E5FF5A1A] whitespace-nowrap">
            OFF-20%
          </span>
        </span>
        <span
          className={cn(
            'w-40 flex justify-center items-center rounded-full px-6 h-full border border-transparent',
            !isAnnually ? 'text-theme-primary border-theme-primary' : '',
          )}
          onClick={() => setIsAnnually(false)}
        >
          {t('plan.monthly')}
        </span>
      </div>
      <div className={cn('flex flex-nowrap z-0 flex-col gap-4 w-full', 'lg:flex-row lg:gap-0 lg:w-auto')}>
        {plans.map((plan, i) => {
          const p = plan[0];
          if (!p) return null;
          const isHighlighted = plan[0]?.label === HIGHLIGHTED_PLAN;
          return (
            <Card
              className={cn(
                !i ? '-mr-[1px]' : '',
                isHighlighted
                  ? 'rounded-xl lg:-mt-3 lg:-mx-[1px] lg:z-10'
                  : 'rounded-xl lg:rounded-none lg:first:rounded-l-2xl lg:last:rounded-r-2xl',
                'bg-transparent border-none cursor-default overflow-hidden',
              )}
              key={p.label}
            >
              <MagicCard background="bg-[#101214]" gradientFrom="#FFD700" gradientTo="var(--theme-primary)">
                <CardContent
                  className={cn(
                    'p-0',
                    isHighlighted ? 'pt-[0.1px] bg-gradient-to-b from-theme-primary to-[#171a1f]' : '',
                  )}
                >
                  <FollowerPointerCard title="Coming Soon">
                    <div
                      className={cn(
                        'flex flex-col gap-6 px-4 lg:px-6',
                        isHighlighted
                          ? 'py-4 lg:py-11 rounded-xl bg-gradient-to-b from-[#2c3026] to-[#171A1F] m-[1px]'
                          : 'py-4 lg:py-8 ',
                      )}
                    >
                      {plan.map((item) => {
                        if (item.label === 'action') return item.value;
                        return (
                          <div className="flex flex-col" key={item.label}>
                            <span className="text-base text-white">{item.label}</span>
                            <span className="text-sm text-[#fafafa]">{item.value}</span>
                          </div>
                        );
                      })}
                    </div>
                  </FollowerPointerCard>
                </CardContent>
              </MagicCard>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default Plans;
