import Image from 'next/image';
import { useTranslations } from 'next-intl';
import React from 'react';

import { CardBody, CardContainer, CardItem } from '~/components/ui/3d-card';
import image11 from '~~/public/img/aboutus/1-1.webp';
import image12 from '~~/public/img/aboutus/1-2.webp';
import image13 from '~~/public/img/aboutus/1-3.webp';

const KeyFeatures = () => {
  const t = useTranslations('AboutUsPage');
  const abstractionCards = [
    {
      id: 1,
      image: image11,
      title: t('keyFeatures.features.0.title'),
      description: t('keyFeatures.features.0.description'),
    },
    {
      id: 2,
      image: image12,
      title: t('keyFeatures.features.1.title'),
      description: t('keyFeatures.features.1.description'),
    },
    {
      id: 3,
      image: image13,
      title: t('keyFeatures.features.2.title'),
      description: t('keyFeatures.features.2.description'),
    },
  ];

  return (
    <section className="w-full flex-1 md:flex-[0_0_728px] flex flex-col justify-center items-center mb-[63px] md:mb-[104px] relative">
      <div
        className="absolute inset-0 w-[95vw] left-1/2 -translate-x-1/2 z-[-1] -m-[1px] rounded-2xl"
        style={{
          backgroundImage:
            'linear-gradient(to bottom right, rgba(197, 227, 33, 0.15) 0%, rgba(197, 227, 33, 0) 10%, rgba(197, 227, 33, 0) 90%, rgba(197, 227, 33, 0.15) 100%)',
        }}
      />
      <div className="flex flex-col items-center gap-6 p-6 md:p-0 md:gap-[72px] w-full">
        <h2 className="font-semibold text-primary text-2xl text-center">
          <span className="block md:inline">{t('keyFeatures.title')}</span>
          <span className="hidden md:inline"> - </span>
          <span className="block md:inline">{t('keyFeatures.subtitle')}</span>
        </h2>

        <div className="flex flex-col md:flex-row items-start justify-center gap-10 w-full">
          {abstractionCards.map((card) => (
            <CardContainer
              className="flex-1"
              containerClassName="flex-1 h-full flex flex-col items-stretch p-0"
              key={card.id}
            >
              <CardBody className="h-full w-full flex-1 flex flex-col items-stretch">
                <CardItem className="flex-1 flex flex-col items-stretch">
                  <div className="flex-1 flex flex-col items-stretch gap-2 px-6 py-4 relative rounded-2xl bg-background bg-clip-padding border border-transparent">
                    <Image alt={`Abstraction concept ${card.id}`} className="w-auto object-cover" src={card.image} />
                    <h3 className="self-stretch font-semibold text-neutral-50 text-base text-center">{card.title}</h3>
                    <p className="font-normal text-neutral-50 text-sm">{card.description}</p>
                    <div
                      className="absolute inset-0 z-[-1] -m-[1px] rounded-2xl"
                      style={{
                        backgroundImage:
                          'linear-gradient(to bottom right, rgba(197, 227, 33, 0.5) 0%, rgba(197, 227, 33, 0.15) 50%, rgba(197, 227, 33, 0.5) 100%)',
                      }}
                    />
                  </div>
                </CardItem>
              </CardBody>
            </CardContainer>
          ))}
        </div>
      </div>
    </section>
  );
};

export default KeyFeatures;
