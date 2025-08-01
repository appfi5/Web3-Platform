import { useTranslations } from 'next-intl';
import React from 'react';

import { cn } from '~/lib/utils';

const DetailFeatures = () => {
  const t = useTranslations('AboutUsPage');

  return (
    <section className="w-full mb-[50px] md:mb-[90px] flex flex-col md:flex-row justify-center items-stretch border-b md:border-t border-[#374111]">
      <div
        className={cn(
          'flex-1 flex flex-col items-center justify-between p-0 md:p-[100px] gap-6 md:border-[#374111] md:border-r',
        )}
      >
        <div className="flex flex-col gap-6">
          <h2 className="text-2xl font-bold text-primary text-center md:text-left">
            <span className="block md:inline">{t('detailFeatures.0.title')}</span>
            <span className="hidden md:inline"> - </span>
            <span className="block md:inline">{t('detailFeatures.0.subtitle')}</span>
          </h2>
          <p className="text-sm text-neutral-50 px-6 md:px-0">{t('detailFeatures.0.description')}</p>
        </div>
        <video autoPlay className="w-full flex-1" loop muted src="/video/aboutus/p-3.mp4" />
      </div>

      <div
        className={cn(
          'flex-1 flex flex-col items-center justify-between p-0 md:p-[100px] gap-6 md:border-[#374111] md:border-l',
        )}
      >
        <div className="flex flex-col gap-6">
          <h2 className="text-2xl font-bold text-primary text-center md:text-left">
            <span className="block md:inline">{t('detailFeatures.1.title')}</span>
            <span className="hidden md:inline"> - </span>
            <span className="block md:inline">{t('detailFeatures.1.subtitle')}</span>
          </h2>
          <p className="text-sm text-neutral-50 px-6 md:px-0">{t('detailFeatures.1.description')}</p>
        </div>
        <video autoPlay className="w-full flex-1" loop muted src="/video/aboutus/p-4.mp4" />
      </div>
    </section>
  );
};

export default DetailFeatures;
