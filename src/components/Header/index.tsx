'use client';

import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import { MoneySquare } from 'iconoir-react';
import { ChartAreaIcon, User2Icon } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { type ComponentProps, useState } from 'react';

import LocaleSwitcher from '~/components/LocaleSwitcher';
import Search from '~/components/search';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '~/components/ui/dropdown-menu';
import { useIsMobile } from '~/hooks';
import { Link, usePathname } from '~/i18n/navigation';
import { cn } from '~/lib/utils';

import { Button } from '../ui/button';
import AssetsIcon from './assets.svg';
import CloseIcon from './close.svg';
import HomeIcon from './home.svg';
import MenuIcon from './menu.svg';
import NervosdaoIcon from './nervosdao.svg';

export default function Header() {
  const route = usePathname();
  const t = useTranslations('common');
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const isMobile = useIsMobile();

  const links: { title: string; href: string; icon: React.FC<ComponentProps<'svg'>> }[] = [
    {
      title: t('Home'),
      href: '/home',
      icon: (props) => <HomeIcon {...props} />,
    },
    {
      title: t('Assets'),
      href: '/asset',
      icon: (props) => <AssetsIcon {...props} />,
    },
    {
      title: t('Nervos_DAO'),
      href: '/nervosdao',
      icon: (props) => <NervosdaoIcon {...props} />,
    },
    {
      title: t('Charts'),
      href: '/charts',
      icon: (props) => <ChartAreaIcon {...props} />,
    },
    {
      title: t('Pricing'),
      href: '/pricing',
      icon: () => <MoneySquare color="currentcolor" />,
    },
  ];

  if (isMobile) {
    return (
      <header className="sticky top-0 bg-background z-10 flex h-[56px] items-center justify-between px-3 border-b border-border">
        <Link href="/home">
          <Image alt="logo" height={32} src="/img/logo.svg" width={32} />
        </Link>

        <div className="flex items-center gap-4">
          <Search />
          <DropdownMenu onOpenChange={setIsOpen} open={isOpen}>
            <DropdownMenuTrigger>
              {isOpen ? <CloseIcon className="cursor-pointer" /> : <MenuIcon className="cursor-pointer" />}
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[100vw] h-[100vh] mt-4 bg-background border-none px-8 py-10">
              <div>
                {links.map(({ title, href }) => (
                  <Link
                    className="flex gap-1 items-center h-8 mb-6"
                    href={href}
                    key={title}
                    onClick={() => setIsOpen(false)}
                  >
                    <p className={`text-[16px] font-bold text-${route?.includes(href) ? 'primary' : 'secondary'}`}>
                      {title}
                    </p>
                  </Link>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          <LocaleSwitcher />
        </div>
      </header>
    );
  }
  return (
    <header className="sticky top-0 bg-background z-10 flex h-[72px] items-center px-[60px] border-b border-border gap-2">
      <Link href="/home">
        <Image alt="logo" height={44} src="/img/logo.svg" width={44} />
      </Link>

      <div className="flex flex-1 gap-3 ml-12">
        {links.map(({ title, href, icon: Icon }) => (
          <Link
            className={cn(
              'flex gap-1 items-center px-4 hover:text-primary text-secondary transition-all duration-200',
              { 'text-primary': route?.includes(href) },
            )}
            href={href}
            key={href}
          >
            <Icon height={24} width={24} />
            <p className={cn(`text-[16px] font-bold`)}>{title}</p>
          </Link>
        ))}
      </div>
      <div className="flex items-center">
        <Search />
        {/* <LocaleSwitcher /> */}
      </div>

      <SignedIn>
        <UserButton>
          <UserButton.MenuItems>
            <UserButton.Link href="/account" label="Account" labelIcon={<User2Icon size={16} />} />
          </UserButton.MenuItems>
        </UserButton>
      </SignedIn>
      <SignedOut>
        <Link href="/signin">
          <Button className="bg-accent text-accent-foreground hover:text-primary rounded-full" variant="ghost">
            Sign In
          </Button>
        </Link>
      </SignedOut>
    </header>
  );
}
