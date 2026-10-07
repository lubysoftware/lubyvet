'use client';

import { ChangeSpeciesInput, ChangeVetInput, SpeciesInput, VetInput } from '@lubyvet/contracts';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { z } from 'zod';
import { Button, buttonClass } from '@/components/ui/button';
import { FailureMessage } from '@/components/ui/failure-message';
import { Field } from '@/features/forms/components/field';
import { formValues } from '@/features/forms/form-values';
import { useApiForm } from '@/features/forms/use-api-form';
import { type ApiError, apiSend, newIdempotencyKey } from '@/lib/api-client';

export interface SpeciesRow {
  id: number;
  name: string;
  status: string;
  version: number;
  petsCount: number;
}
export interface VetRow {
  id: number;
  firstName: string;
  lastName: string;
  status: string;
  version: number;
  specialtyIds: number[];
}

const th = 'px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground';
const reload = () => window.location.reload();

/** Uma mudança de linha (ativar, inativar, desligar): versão lida e Idempotency-Key próprias. */
function useRowChange() {
  const [failure, setFailure] = useState<ApiError | null>(null);
  const [pending, setPending] = useState(false);
  const change = async (path: string, schema: z.ZodType, body: unknown) => {
    const parsed = schema.safeParse(body);
    if (!parsed.success) return;
    setPending(true);
    const r = await apiSend('PATCH', path, parsed.data, newIdempotencyKey());
    setPending(false);
    if (r.ok) reload();
    else setFailure(r.error);
  };
  return { failure, pending, change };
}

/** Formulário curto de inclusão, em linha, acima da tabela. */
function CreateForm<S extends z.ZodType>({
  label,
  schema,
  path,
  fields,
  toInput,
}: {
  label: string;
  schema: S;
  path: string;
  fields: { name: string; label: string }[];
  toInput: (raw: Record<string, string>) => unknown;
}) {
  const form = useApiForm(schema, (input, key) => apiSend('POST', path, input, key), reload);
  return (
    <form
      noValidate
      aria-label={label}
      onSubmit={(e) => void form.submit(toInput(formValues(e)))}
      className="grid gap-2"
    >
      <FailureMessage failure={form.failure} />
      <div className="flex flex-wrap items-end gap-2">
        {fields.map((f) => (
          <Field key={f.name} name={f.name} label={f.label} errors={form.errors} />
        ))}
        <button type="submit" disabled={form.pending} className={buttonClass()}>
          {label}
        </button>
      </div>
    </form>
  );
}

/** 009/US-1: espécies. Inativar tira da lista do cadastro; os animais antigos continuam com ela (P-10). */
export function SpeciesAdmin({ rows }: { rows: SpeciesRow[] }) {
  const t = useTranslations('admin');
  const tr = useTranslations();
  const row = useRowChange();
  return (
    <div className="grid gap-4">
      <CreateForm
        label={t('addSpecies')}
        schema={SpeciesInput}
        path="/api/admin/species"
        fields={[{ name: 'name', label: t('speciesName') }]}
        toInput={(raw) => ({ name: raw.name })}
      />
      <FailureMessage failure={row.failure} />
      <div className="overflow-x-auto rounded-md border border-border bg-surface-raised">
        <table className="w-full min-w-[520px]">
          <thead className="bg-surface">
            <tr>
              <th className={th}>{t('speciesName')}</th>
              <th className={th}>{t('status')}</th>
              <th className={th}>{t('petsCount')}</th>
              <th className={th}>
                <span className="sr-only">{t('actions')}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => {
              const next = s.status === 'active' ? 'inactive' : 'active';
              return (
                <tr key={s.id} className="h-11 border-t border-border">
                  <td className="px-3 font-semibold">{s.name}</td>
                  <td className="px-3">{tr(`vocabularyStatus.${s.status as 'active'}`)}</td>
                  <td className="tabular px-3">{s.petsCount}</td>
                  <td className="px-3 py-1 text-right">
                    <Button
                      variant="secondary"
                      disabled={row.pending}
                      aria-label={t(next === 'inactive' ? 'deactivateNamed' : 'activateNamed', {
                        name: s.name,
                      })}
                      onClick={() =>
                        void row.change(`/api/admin/species/${s.id}`, ChangeSpeciesInput, {
                          version: s.version,
                          status: next,
                        })
                      }
                    >
                      {t(next === 'inactive' ? 'deactivate' : 'activate')}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** 009/US-2: o quadro de veterinários; desligar tira do catálogo sem apagar o histórico (P2). */
export function VetsAdmin({
  rows,
  specialtyNames,
}: {
  rows: VetRow[];
  specialtyNames: Record<number, string>;
}) {
  const t = useTranslations('admin');
  const tr = useTranslations();
  const row = useRowChange();
  return (
    <div className="grid gap-4">
      <CreateForm
        label={t('addVet')}
        schema={VetInput}
        path="/api/admin/vets"
        fields={[
          { name: 'firstName', label: t('firstName') },
          { name: 'lastName', label: t('lastName') },
        ]}
        toInput={(raw) => ({ firstName: raw.firstName, lastName: raw.lastName })}
      />
      <FailureMessage failure={row.failure} />
      <div className="overflow-x-auto rounded-md border border-border bg-surface-raised">
        <table className="w-full min-w-[560px]">
          <thead className="bg-surface">
            <tr>
              <th className={th}>{t('vetName')}</th>
              <th className={th}>{t('specialties')}</th>
              <th className={th}>{t('status')}</th>
              <th className={th}>
                <span className="sr-only">{t('actions')}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((v) => {
              const next = v.status === 'active' ? 'dismissed' : 'active';
              const name = `${v.firstName} ${v.lastName}`;
              return (
                <tr key={v.id} className="h-11 border-t border-border">
                  <td className="px-3 font-semibold">{name}</td>
                  <td className="px-3">
                    {v.specialtyIds.map((id) => specialtyNames[id] ?? `#${id}`).join(', ')}
                  </td>
                  <td className="px-3">{tr(`vocabularyStatus.${v.status as 'active'}`)}</td>
                  <td className="px-3 py-1 text-right">
                    <Button
                      variant="secondary"
                      disabled={row.pending}
                      aria-label={t(next === 'dismissed' ? 'dismissNamed' : 'activateNamed', { name })}
                      onClick={() =>
                        void row.change(`/api/admin/vets/${v.id}`, ChangeVetInput, {
                          version: v.version,
                          status: next,
                        })
                      }
                    >
                      {t(next === 'dismissed' ? 'dismiss' : 'activate')}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
