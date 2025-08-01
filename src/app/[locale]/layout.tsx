import '~/styles/globals.css';

import { IconoirProvider } from 'iconoir-react';
import dynamic from 'next/dynamic';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import type react from 'react';

import { Footer } from '~/components/Footer';
import { Toaster } from '~/components/ui/toaster';
import { TooltipProvider } from '~/components/ui/tooltip';
import { routing } from '~/i18n/routing';
import { cn } from '~/lib/utils';

const Header = dynamic(() => import('~/components/Header'), { ssr: false });

type Props = {
  children: react.ReactNode;
  params: { locale: string };
};

export async function generateMetadata({ params: { locale } }: Omit<Props, 'children'>) {
  const t = await getTranslations({ locale, namespace: 'metadata' });

  return {
    title: t('title'),
    keywords: 'BTC,BTC Explorer,CKB,Block,Transaction,Token,BTC Address,blockchain,Web3',
    viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
  };
}

export default async function LocaleLayout({ children, params: { locale } }: Props) {
  // Enable static rendering
  setRequestLocale(locale);

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages();

  return (
    <div className={cn('magickbase', 'min-h-screen grid grid-rows-[auto_1fr_auto]')}>
      <NextIntlClientProvider messages={messages}>
        <IconoirProvider
          iconProps={{
            color: '#999999',
          }}
        >
          <TooltipProvider>
            <Header />
            <div className="px-3 md:px-[60px] py-1 md:py-4 max-w-[100vw]">{children}</div>
            <Footer />
          </TooltipProvider>
        </IconoirProvider>
      </NextIntlClientProvider>
      <Toaster />
    </div>
  );
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
