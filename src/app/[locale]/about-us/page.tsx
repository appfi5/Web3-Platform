import { getTranslations } from 'next-intl/server';
import React from 'react';

import Detail from './Detail';
import DetailFeatures from './DetailFeatures';
import Hero from './Hero';
import KeyFeatures from './KeyFeatures';
import Summary from './Summary';

type PageProps = {
  params: { locale: string };
};

export async function generateMetadata({ params: { locale } }: PageProps) {
  const t = await getTranslations({ locale, namespace: 'metadata' });

  return {
    title: t('aboutUs.title'),
    description: t('aboutUs.description'),
    openGraph: {
      images: [
        {
          url: `/${locale}/about-us/opengraph-image`,
          width: 1200,
          height: 630,
          alt: 'aboutUs',
        },
      ],
    },
  };
}

const AboutUsPage = (): JSX.Element => {
  return (
    <div className="w-full max-w-full md:max-w-7xl mx-auto flex flex-col items-center">
      <Hero />
      <KeyFeatures />
      <Detail />
      <DetailFeatures />
      <Summary />
    </div>
  );
};

export default AboutUsPage;
