'use client';

import {
  ChangeSpeciesInput,
  ChangeVetInput,
  SpeciesInput,
  type SpecialtyOutput,
  VetInput,
} from '@lubyvet/contracts';
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
/** 009/CA-2.1: inclusão com nome, sobrenome e nenhuma, uma ou várias especialidades. */
function VetCreateForm({ specialties }: { specialties: SpecialtyOutput[] }) {
  const t = useTranslations('admin');
  const form = useApiForm(VetInput, (input, key) => apiSend('POST', '/api/admin/vets', input, key), reload);
  return (
    <form
      noValidate
      aria-label={t('addVet')}
      onSubmit={(e) => {
        const ids = new FormData(e.currentTarget).getAll('specialtyIds').map(Number);
        const raw = formValues(e);
        void form.submit({ firstName: raw.firstName, lastName: raw.lastName, specialtyIds: ids });
      }}
      className="grid gap-3"
    >
      <FailureMessage failure={form.failure} />
      <div className="flex flex-wrap items-end gap-2">
        <Field name="firstName" label={t('firstName')} errors={form.errors} />
        <Field name="lastName" label={t('lastName')} errors={form.errors} />
      </div>
      {specialties.length > 0 && (
        <fieldset className="flex flex-wrap gap-4">
          <legend className="mb-2 text-sm font-semibold">{t('specialties')}</legend>
          {specialties.map((s) => (
            <label key={s.id} className="flex min-h-11 items-center gap-2">
              <input type="checkbox" name="specialtyIds" value={s.id} className="size-5 accent-primary" />
              {s.name}
            </label>
          ))}
        </fieldset>
      )}
      <div>
        <button type="submit" disabled={form.pending} className={buttonClass()}>
          {t('addVet')}
        </button>
      </div>
    </form>
  );
}

/** 009/CA-2.2: acrescentar uma especialidade a um veterinário já cadastrado, com a versão lida. */
function AddSpecialty({
  vet,
  specialties,
  change,
  pending,
}: {
  vet: VetRow;
  specialties: SpecialtyOutput[];
  change: (path: string, schema: z.ZodType, body: unknown) => Promise<void>;
  pending: boolean;
}) {
  const t = useTranslations('admin');
  const options = specialties.filter((s) => !vet.specialtyIds.includes(s.id));
  const [chosen, setChosen] = useState('');
  if (options.length === 0) return null;
  const name = `${vet.firstName} ${vet.lastName}`;
  return (
    <span className="inline-flex gap-2">
      <select
        aria-label={t('specialtyFor', { name })}
        value={chosen}
        onChange={(e) => setChosen(e.target.value)}
        className="h-11 rounded-md border border-input bg-surface-raised px-2"
      >
        <option value="">{t('chooseSpecialty')}</option>
        {options.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <Button
        variant="secondary"
        disabled={pending || chosen === ''}
        onClick={() =>
          void change(`/api/admin/vets/${vet.id}`, ChangeVetInput, {
            version: vet.version,
            addSpecialtyId: Number(chosen),
          })
        }
      >
        {t('addSpecialty')}
      </Button>
    </span>
  );
}

/** 009/US-2: o quadro de veterinários; desligar tira do catálogo sem apagar o histórico (P2). */
export function VetsAdmin({ rows, specialties }: { rows: VetRow[]; specialties: SpecialtyOutput[] }) {
  const t = useTranslations('admin');
  const tr = useTranslations();
  const row = useRowChange();
  const specialtyNames = Object.fromEntries(specialties.map((s) => [s.id, s.name]));
  return (
    <div className="grid gap-4">
      <VetCreateForm specialties={specialties} />
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
                  <td className="flex flex-wrap justify-end gap-2 px-3 py-1">
                    <AddSpecialty
                      vet={v}
                      specialties={specialties}
                      change={row.change}
                      pending={row.pending}
                    />
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
