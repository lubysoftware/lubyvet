import { type NextRequest, NextResponse } from 'next/server';
import { LOCALE_COOKIE, localeFromUrl } from '@/i18n/config';

/** 006/CA-3.2: ?lang= grava o mesmo cookie que o seletor de idioma e volta ao endereço limpo. */
export function proxy(request: NextRequest) {
  const found = localeFromUrl(request.nextUrl);
  if (!found) return NextResponse.next();
  const res = NextResponse.redirect(found.cleanUrl);
  res.cookies.set(LOCALE_COOKIE, found.locale, { path: '/', maxAge: 31_536_000, sameSite: 'lax' });
  return res;
}

export const config = { matcher: ['/((?!api|_next|favicon.ico).*)'] };
