import '~/styles/globals.css';

import { ClerkProvider } from '@clerk/nextjs';
import { type Metadata } from 'next';
import { Inconsolata, Montserrat } from 'next/font/google';

import { TRPCReactProvider } from '~/trpc/react';

const montserrat = Montserrat({ subsets: ['cyrillic'], display: 'swap' });
const inconsolata = Inconsolata({ subsets: ['latin'], display: 'swap', variable: '--inconsolata', weight: '400' });

export const metadata: Metadata = {
  title: 'Web3',
  description: 'Web3 Platform',
  icons: [
    {
      rel: 'icon',
      type: 'image/x-icon',
      url: '/favicon.ico',
      media: '(prefers-color-scheme: light)',
    },
    {
      rel: 'icon',
      type: 'image/x-icon',
      url: '/favicon-dark.ico',
      media: '(prefers-color-scheme: dark)',
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode; params: { lng: string } }) {
  return (
    // TODO: change theme to variable
    <ClerkProvider>
      <html
        className={`${montserrat.className} ${inconsolata.variable} scrollbar scrollbar-thumb-[#333] scrollbar-track-[#101214]`}
        data-theme={'magickbase'}
      >
        <TRPCReactProvider>
          <body>{children}</body>
        </TRPCReactProvider>
      </html>
    </ClerkProvider>
  );
}
