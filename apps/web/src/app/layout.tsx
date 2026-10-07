import type { ReactNode } from 'react';
import { Figtree } from 'next/font/google';
import { cookies } from 'next/headers';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages, getTranslations } from 'next-intl/server';
import { THEME_COOKIE, resolveTheme } from '@/features/shell/theme';
import './globals.css';

// D37: Figtree servida pelo próprio app, nos pesos 400 a 700 (010/T012, CA-2.2).
const figtree = Figtree({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-figtree',
});

export async function generateMetadata() {
  const t = await getTranslations('app');
  return { title: t('name') };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  // 010/T011: tema do cookie aplicado no primeiro render, sem piscar.
  const theme = resolveTheme((await cookies()).get(THEME_COOKIE)?.value);
  return (
    <html lang={locale} data-theme={theme === 'system' ? undefined : theme} className={figtree.variable}>
      <body>
        <NextIntlClientProvider messages={await getMessages()}>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
