import { render } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactElement } from 'react';
import en from '@/i18n/messages/en.json';
import pt from '@/i18n/messages/pt-BR.json';

export function renderWithIntl(ui: ReactElement, locale: 'pt-BR' | 'en' = 'pt-BR') {
  return render(
    <NextIntlClientProvider locale={locale} messages={locale === 'en' ? en : pt} timeZone="America/Sao_Paulo">
      {ui}
    </NextIntlClientProvider>,
  );
}
