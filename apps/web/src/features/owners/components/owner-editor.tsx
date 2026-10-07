'use client';

import {
  ChangeOwnerContactInput,
  type OwnerOutput,
  RegisterOwnerInput,
  SimilarOwner,
} from '@lubyvet/contracts';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { FailureMessage } from '@/components/ui/failure-message';
import { apiSend } from '@/lib/api-client';
import { optional } from '@/features/forms/form-values';
import { OwnerForm } from '@/features/forms/components/forms';
import { useApiForm } from '@/features/forms/use-api-form';
import { ownerRecordUrl } from '@/lib/url-state';

type Raw = Record<string, string>;
const go = (href: string) => window.location.assign(href);

/** Texto do formulário para o contrato: opcional vazio some; a caixa marcada vira booleano. */
export function ownerInput(raw: Raw, mode: 'create' | 'edit', version?: number) {
  const base = {
    firstName: raw.firstName,
    lastName: raw.lastName,
    address: raw.address,
    city: raw.city,
    telephone: raw.telephone,
    messagingConsent: raw.messagingConsent === 'on',
  };
  // Na alteração, e-mail vazio limpa o campo (Pergunta 22); no cadastro, é ausência.
  if (mode === 'edit') return { ...base, version, email: raw.email ?? '' };
  return { ...base, cpf: raw.cpf, email: optional(raw.email) };
}

/**
 * 001/US-1 e US-4: cadastro e alteração do dono. D14: celular de outro dono pede confirmação
 * antes de gravar; US-5: versão vencida mostra a recusa e os valores atuais ficam a um recarregar.
 */
export function OwnerEditor({ owner }: { owner?: OwnerOutput }) {
  const t = useTranslations('owners');
  const mode = owner ? 'edit' : 'create';
  const [last, setLast] = useState<Raw | null>(null);
  const schema = owner ? ChangeOwnerContactInput : RegisterOwnerInput;
  const form = useApiForm(
    schema as z.ZodType<Record<string, unknown>>,
    (input, key) =>
      owner
        ? apiSend<OwnerOutput>('PATCH', `/api/owners/${owner.id}`, input, key)
        : apiSend<OwnerOutput>('POST', '/api/owners', input, key),
    (saved) => go(ownerRecordUrl(`/owners/${saved.id}`, { saved: 'ownerSaved' })),
  );
  const similar =
    form.failure?.code === 'similar_owner' ? z.array(SimilarOwner).safeParse(form.failure.current) : null;

  const submit = (raw: Raw, confirmSimilar = false) => {
    setLast(raw);
    void form.submit({ ...ownerInput(raw, mode, owner?.version), confirmSimilar });
  };

  const defaults = owner
    ? {
        firstName: owner.firstName,
        lastName: owner.lastName,
        address: owner.address,
        city: owner.city,
        telephone: owner.telephone,
        email: owner.email ?? '',
        messagingConsent: owner.messagingConsentAt ? 'on' : undefined,
      }
    : (last ?? {});

  return (
    <div className="grid gap-4">
      {similar?.success ? (
        <div role="alert" className="grid gap-3 rounded-md border border-attention bg-surface-raised p-4">
          <p className="font-semibold">{t('similarFound')}</p>
          <ul className="grid gap-1">
            {similar.data.map((s) => (
              <li key={s.id}>
                <a href={`/owners/${s.id}`} className="text-primary underline">
                  {s.firstName} {s.lastName}
                </a>{' '}
                · {s.city}
              </li>
            ))}
          </ul>
          <div>
            <Button variant="secondary" disabled={form.pending} onClick={() => last && submit(last, true)}>
              {t('saveAnyway')}
            </Button>
          </div>
        </div>
      ) : (
        <FailureMessage failure={form.failure} />
      )}
      {form.failure?.code === 'stale_version' && (
        <div>
          <Button variant="secondary" onClick={() => window.location.reload()}>
            {t('reloadCurrent')}
          </Button>
        </div>
      )}
      <OwnerForm
        mode={mode}
        errors={form.errors}
        pending={form.pending}
        defaults={defaults}
        onSubmit={(raw) => submit(raw)}
      />
    </div>
  );
}
