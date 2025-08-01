import { useTranslations } from 'next-intl';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '~/components/ui/accordion';
import { cn } from '~/lib/utils';

const FAQ = () => {
  const t = useTranslations('PricingPage');
  const FAQ_LIST = [
    {
      Q: t('faq.how-to-subscribe.q'),
      A: t('faq.how-to-subscribe.a'),
    },
    {
      Q: t('faq.what-is-api-key.q'),
      A: t('faq.what-is-api-key.a'),
    },
    {
      Q: t('faq.usage.q'),
      A: t('faq.usage.a'),
    },
    {
      Q: t('faq.api-error.q'),
      A: t('faq.api-error.a'),
    },
    {
      Q: t('faq.change-plan.q'),
      A: t('faq.change-plan.a'),
    },
  ];

  return (
    <div>
      <h2 className="text-center text-[#fafafa] text-2xl font-semibold mt-[72px] mb-6">FAQ</h2>
      <div className={cn('p-4 bg-[#101214] rounded-xl border border-[#222]', 'lg:px-6 lg:py-8 lg:rounded-2xl')}>
        <Accordion className="flex flex-col gap-6" collapsible type="single">
          {FAQ_LIST.map((faq) => {
            return (
              <AccordionItem
                className={cn('border-[#333] rounded-xl border px-4', 'lg:rounded-2xl')}
                key={faq.Q}
                value={faq.Q}
              >
                <AccordionTrigger className="text-base font-semibold" isChevron={false}>
                  {faq.Q}
                </AccordionTrigger>
                <AccordionContent className="text-[#fafafa] text-sm font-normal">{faq.A}</AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>
    </div>
  );
};

export default FAQ;
