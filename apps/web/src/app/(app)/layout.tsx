import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { AppShell } from '@/features/shell/components/app-shell';
import { THEME_COOKIE, resolveTheme } from '@/features/shell/theme';
import { currentSession } from '@/lib/api';

/** Telas da equipe: exigem sessão (D04); sem ela, o `load` leva ao login. */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await currentSession();
  const theme = resolveTheme((await cookies()).get(THEME_COOKIE)?.value);
  return (
    <AppShell session={session} theme={theme}>
      {children}
    </AppShell>
  );
}
