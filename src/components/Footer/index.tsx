'use client';

import { useTranslations } from 'next-intl';

import { Link, usePathname } from '~/i18n/navigation';
import { cn } from '~/lib/utils';

import DiscordLogo from './discord.svg';
import GithubLogo from './github.svg';
import Logo from './logo.svg';
import MailLogo from './mail.svg';
import XLogo from './x.svg';

export function Footer() {
  const route = usePathname();
  const t = useTranslations('common');

  const linksConfig: { title: string; href: string }[] = [
    {
      title: t('About_Us'),
      href: '/about-us',
    },
    {
      title: t('Privacy_Policy'),
      href: '/privacy-policy',
    },
    {
      title: t('Terms_of_Services'),
      href: '/terms-of-services',
    },
    {
      title: t('Docs'),
      href: 'https://docs.magickbase.com',
    },
    {
      title: t('Pricing'),
      href: '/pricing',
    },
  ];

  const links = linksConfig.map(({ title, href }) => (
    <Link
      className={cn('whitespace-nowrap hover:text-primary', route?.includes(href) ? 'text-primary' : 'text-secondary')}
      href={href}
      key={title}
    >
      {title}
    </Link>
  ));

  const poweredBy = (
    <p className="text-sm text-[#999] pb-2">
      &copy;
      {` ${new Date().getFullYear()} `}
      <Link
        className="relative after:h-[1px] after:content-['_'] after:w-full after:absolute after:bottom-0 after:left-0 after:bg-[#999]"
        href="https://www.magickbase.com/"
      >
        Magickbase
      </Link>
      {' All Rights Reserved.'}
    </p>
  );

  return (
    <footer className="flex flex-col items-center justify-center relative pt-6 lg:pt-0">
      <div className="w-full flex lg:flex-row flex-col items-center justify-center relative px-6 lg:px-[60px] lg:p-3 gap-6">
        <div className="flex-[1_1_auto] w-full flex items-center justify-start gap-2">
          <Logo width={32} />
          <span className="text-base text-neutral-50 lg:hidden">Platform</span>
        </div>
        <div className="flex-[5_1_auto] w-full grid grid-cols-2 lg:flex items-center justify-center gap-6 lg:gap-8 text-sm pb-6 lg:pb-0 border-b lg:border-none">
          {links}
        </div>
        <div className="block lg:hidden w-full">{poweredBy}</div>
        <div className="flex-[1_1_auto] flex gap-8 w-full pb-6 lg:pb-0 justify-start lg:justify-end">
          <Link className="hover:opacity-80" href="https://x.com/magickbase" rel="noopener noreferrer" target="_blank">
            <XLogo height={20} width={20} />
          </Link>
          <Link
            className="hover:opacity-80"
            href="https://discord.gg/YJVb7D747b"
            rel="noopener noreferrer"
            target="_blank"
          >
            <DiscordLogo height={20} width={20} />
          </Link>
          <Link
            className="hover:opacity-80"
            href="https://github.com/Magickbase"
            rel="noopener noreferrer"
            target="_blank"
          >
            <GithubLogo height={20} width={20} />
          </Link>
          <Link className="hover:opacity-80" href="mailto:platform@magickbase.com">
            <MailLogo height={20} width={20} />
          </Link>
        </div>
      </div>
      <div className="hidden lg:block">{poweredBy}</div>
    </footer>
  );
}
