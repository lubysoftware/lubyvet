'use client';

import { LoginInput, type SessionOutput } from '@lubyvet/contracts';
import { useTranslations } from 'next-intl';
import { FailureMessage } from '@/components/ui/failure-message';
import { buttonClass } from '@/components/ui/button';
import { apiSend } from '@/lib/api-client';
import { Field } from '@/features/forms/components/field';
import { formValues } from '@/features/forms/form-values';
import { useApiForm } from '@/features/forms/use-api-form';

/** 007/US-1: login e senha; a recusa é uma só para login e senha (não diz qual dos dois errou). */
export function LoginForm({ onDone = () => window.location.assign('/owners') }: { onDone?: () => void }) {
  const t = useTranslations('login');
  const form = useApiForm(
    LoginInput,
    (input) => apiSend<SessionOutput>('POST', '/api/session', input),
    onDone,
  );
  return (
    <form
      noValidate
      aria-label={t('title')}
      onSubmit={(e) => void form.submit(formValues(e))}
      className="grid gap-4"
    >
      <FailureMessage failure={form.failure} />
      <Field name="login" label={t('login')} errors={form.errors} />
      <Field name="password" label={t('password')} type="password" errors={form.errors} />
      <button type="submit" disabled={form.pending} className={buttonClass()}>
        {t('submit')}
      </button>
    </form>
  );
}
