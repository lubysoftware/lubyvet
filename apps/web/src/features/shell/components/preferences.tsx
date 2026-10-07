'use client';

import { useLocale, useTranslations } from 'next-intl';
import { LOCALE_COOKIE, LOCALES } from '@/i18n/config';
import { THEME_COOKIE, THEMES, type Theme } from '../theme';

const setCookie = (name: string, value: string) => {
  document.cookie = `${name}=${value}; path=/; max-age=31536000; samesite=lax`;
  window.location.reload();
};

/** 006/T007: troca de idioma ligada ao mesmo cookie que a resolução lê (P-04). 010/T011: troca de tema. */
export function Preferences({ theme = 'system' }: { theme?: Theme }) {
  const t = useTranslations();
  const locale = useLocale();
  return (
    <div className="flex items-center gap-2">
      <label className="text-sm" htmlFor="lv-locale">
        {t('language.label')}
      </label>
      <select
        id="lv-locale"
        className="h-11 rounded-md border border-input bg-surface-raised px-2"
        value={locale}
        onChange={(e) => setCookie(LOCALE_COOKIE, e.target.value)}
      >
        {LOCALES.map((l) => (
          <option key={l} value={l}>
            {t(`language.${l}`)}
          </option>
        ))}
      </select>
      <label className="text-sm" htmlFor="lv-theme">
        {t('theme.label')}
      </label>
      <select
        id="lv-theme"
        className="h-11 rounded-md border border-input bg-surface-raised px-2"
        defaultValue={theme}
        onChange={(e) => setCookie(THEME_COOKIE, e.target.value)}
      >
        {THEMES.map((th) => (
          <option key={th} value={th}>
            {t(`theme.${th}`)}
          </option>
        ))}
      </select>
    </div>
  );
}
