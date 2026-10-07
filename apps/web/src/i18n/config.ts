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

export const LOCALE_PARAM = 'lang';

/**
 * 006/CA-3.2: o idioma pelo parâmetro de endereço passa pelo mesmo ponto que o seletor de tela, o
 * cookie. Devolve o cookie a gravar e o endereço sem o parâmetro, ou null quando não há parâmetro.
 */
export function localeFromUrl(url: URL): { locale: Locale; cleanUrl: URL } | null {
  const value = url.searchParams.get(LOCALE_PARAM);
  if (value === null) return null;
  const cleanUrl = new URL(url);
  cleanUrl.searchParams.delete(LOCALE_PARAM);
  return { locale: resolveLocale(value), cleanUrl };
}
