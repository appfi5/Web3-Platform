import { useTranslations } from 'next-intl';
import React from 'react';

const Summary = () => {
  const t = useTranslations('AboutUsPage');

  return (
    <section className="md:flex-[0_0_568px] flex flex-col w-full items-center justify-center gap-14 relative">
      <div className="w-full flex flex-col items-center justify-center gap-12">
        <h2 className="w-fit font-semibold text-primary text-2xl text-center">{t('summary.title')}</h2>
      </div>

      <video
        autoPlay
        className="flex-[0_0_320px] md:flex-[0_0_531px] object-cover"
        loop
        muted
        src="/video/aboutus/p-5-1.mp4"
      />
    </section>
  );
};

export default Summary;
