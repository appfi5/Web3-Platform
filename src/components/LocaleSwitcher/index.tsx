import { useLocale, useTranslations } from 'next-intl';

import { routing } from '~/i18n/routing';

import LocaleSwitcherSelect from './LocaleSwitcherSelect';

export default function LocaleSwitcher() {
  const t = useTranslations('common');
  const locale = useLocale();

  return (
    <LocaleSwitcherSelect defaultValue={locale} label={t('Change_language')}>
      {routing.locales.map((cur) => (
        <option key={cur} value={cur}>
          {t('locale', { locale: cur })}
        </option>
      ))}
    </LocaleSwitcherSelect>
  );
}
