import { useTranslations } from 'next-intl';
import React from 'react';

const Detail = (): JSX.Element => {
  const t = useTranslations('AboutUsPage');

  return (
    <section className="flex-[0_0_480px] mb-6 md:mb-[128px] flex flex-col w-full items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <h2 className="font-semibold text-primary text-2xl text-center">
          <span className="block md:inline">{t('detail.title')}</span>
          <span className="hidden md:inline"> - </span>
          <span className="block md:inline">{t('detail.subtitle')}</span>
        </h2>
        <p className="font-normal px-6 md:px-0 text-neutral-50 text-sm text-center">{t('detail.description')}</p>
      </div>
      <video autoPlay loop muted src="/video/aboutus/p-2.mp4" />
    </section>
  );
};

export default Detail;
