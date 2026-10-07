import { cookies } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import { LoginForm } from '@/features/identity/components/login-form';
import { Brand } from '@/features/shell/components/brand';
import { Preferences } from '@/features/shell/components/preferences';
import { THEME_COOKIE, resolveTheme } from '@/features/shell/theme';

export async function generateMetadata() {
  const t = await getTranslations('login');
  return { title: t('title') };
}

/** 007/US-1: entrada da equipe. Fora da casca, sem dado nenhum antes da sessão. */
export default async function LoginPage() {
  const t = await getTranslations('login');
  const theme = resolveTheme((await cookies()).get(THEME_COOKIE)?.value);
  return (
    <main id="conteudo" className="grid min-h-screen place-items-center px-4 py-8">
      <div className="grid w-full max-w-[400px] gap-6 rounded-lg border border-border bg-surface-raised p-6">
        <Brand
          clinicName={process.env.CLINIC_NAME ?? ''}
          logoUrl={process.env.CLINIC_LOGO_URL || undefined}
        />
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <LoginForm />
        <Preferences theme={theme} />
      </div>
    </main>
  );
}
