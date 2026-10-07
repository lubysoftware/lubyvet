/** 006/T005, P-01, P-02: idiomas suportados e o padrão, legíveis pela aplicação inteira. */
export const LOCALES = ['pt-BR', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'pt-BR';
export const LOCALE_COOKIE = 'lv_locale';

/** 006/T002: resolução do idioma num único ponto: cookie válido, senão o padrão. */
export function resolveLocale(cookieValue: string | undefined): Locale {
  return (LOCALES as readonly string[]).includes(cookieValue ?? '')
    ? (cookieValue as Locale)
    : DEFAULT_LOCALE;
}
