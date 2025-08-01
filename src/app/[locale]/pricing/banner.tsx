import { useTranslations } from 'next-intl';

const Banner = () => {
  const t = useTranslations('PricingPage');

  return (
    <div className="text-white text-center">
      <h1 className="text-2xl font-semibold mb-2 leading-none">{t('title')}</h1>
      <p className="text-#fafafa font-normal text-sm leading-none">{t('subtitle')}</p>
    </div>
  );
};

export default Banner;
