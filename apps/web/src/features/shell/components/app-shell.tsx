import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { Brand } from './brand';
import { Preferences } from './preferences';

/** Casca do app (design system: Sidebar). Menu lateral com os itens de D18. */
export async function AppShell({ children }: { children: ReactNode }) {
  const t = await getTranslations();
  const items = [
    ['/owners', t('nav.owners')],
    ['/schedule', t('nav.schedule')],
    ['/vets', t('nav.vets')],
    ['/admin', t('nav.admin')],
  ] as const;
  return (
    <div className="grid min-h-screen grid-cols-[256px_1fr] max-md:grid-cols-1">
      <a href="#conteudo" className="sr-only focus:not-sr-only">
        {t('app.skipToContent')}
      </a>
      <aside className="border-r border-border bg-surface p-3 max-md:hidden">
        <Brand
          clinicName={process.env.CLINIC_NAME ?? ''}
          logoUrl={process.env.CLINIC_LOGO_URL || undefined}
        />
        <nav className="grid gap-1">
          {items.map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="flex h-10 items-center rounded-md px-3 font-medium hover:bg-primary-soft"
            >
              {label}
            </a>
          ))}
        </nav>
      </aside>
      <div className="min-w-0">
        <header className="flex h-14 items-center justify-end border-b border-border px-4">
          <Preferences />
        </header>
        <main id="conteudo" className="p-5">
          {children}
        </main>
      </div>
    </div>
  );
}
