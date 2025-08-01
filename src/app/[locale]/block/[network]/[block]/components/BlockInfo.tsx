'use client';
import { useTranslations } from 'next-intl';
import { type ComponentProps } from 'react';

import { cn } from '~/lib/utils';

export const BlockInfo = ({
  info,
  className,
}: ComponentProps<'div'> & { info: Record<string, string | null | JSX.Element> }) => {
  const t = useTranslations('BlockPage');
  return (
    <div
      className={cn(
        'flex flex-col max-w-full space-between flex-1 p-3 gap-[10px] rounded-lg bg-muted bg-[#171A1F]',
        className,
      )}
    >
      {Object.keys(info).map(
        (key) =>
          info[key] && (
            <div className="flex w-full" key={key}>
              <div className="basis-1/3 whitespace-nowrap text-[#999]">
                {
                  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                  t(`info.${key}` as any)
                }
              </div>
              {key === 'merkleTree' ? (
                <div className="basis-2/3 break-all line-clamp-2">{info[key]}</div>
              ) : (
                <div className="basis-2/3 truncate">{info[key]}</div>
              )}
            </div>
          ),
      )}
    </div>
  );
};
