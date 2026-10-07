import type { SessionOutput } from '@lubyvet/contracts';
import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import type { Theme } from '../theme';
import { Brand } from './brand';
import { LogoutButton } from './logout-button';
import { NavLinks, type NavItem } from './nav-links';
import { Preferences } from './preferences';

/** Itens do menu por papel (D18): só o Administrador vê a administração. */
export function navItems(role: SessionOutput['role']): NavItem[] {
  const items: NavItem[] = [
    { href: '/owners', key: 'owners' },
    { href: '/vets', key: 'vets' },
  ];
  if (role === 'admin') items.push({ href: '/admin', key: 'admin' });
  return items;
}

/** Casca do app (design system: Sidebar). No celular o menu vira uma faixa no topo. */
export async function AppShell({
  children,
  session,
  theme,
}: {
  children: ReactNode;
  session: SessionOutput;
  theme: Theme;
}) {
  const t = await getTranslations();
  const items = navItems(session.role);
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
        <NavLinks items={items} label={t('nav.label')} />
      </aside>
      <div className="min-w-0">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2">
          <div className="w-full min-w-0 md:hidden">
            <NavLinks items={items} label={t('nav.label')} horizontal />
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-3">
            <Preferences theme={theme} />
            <span className="text-sm text-muted-foreground">
              {t('session.signedInAs', { name: session.name, role: t(`roles.${session.role}`) })}
            </span>
            <LogoutButton />
          </div>
        </header>
        <main id="conteudo" className="mx-auto grid max-w-[1200px] gap-6 px-5 py-6 max-md:px-4">
          {children}
        </main>
      </div>
    </div>
  );
}
