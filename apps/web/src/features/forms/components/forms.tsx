'use client';

import { useTranslations } from 'next-intl';
import type { FormEvent } from 'react';
import type { FieldErrors } from '../field-errors';
import { Field } from './field';

type Submit = (data: Record<string, string>) => void;
const collect = (e: FormEvent<HTMLFormElement>): Record<string, string> => {
  e.preventDefault();
  return Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string, string>;
};

/** Os quatro formulários (010/T008): o mesmo componente de campo, o mesmo destaque de erro. */
export function OwnerForm({ errors, onSubmit }: { errors: FieldErrors; onSubmit: Submit }) {
  const t = useTranslations('owners');
  return (
    <form aria-label={t('register')} onSubmit={(e) => onSubmit(collect(e))} className="grid gap-4">
      {(['firstName', 'lastName', 'address', 'city', 'telephone', 'cpf', 'email'] as const).map((f) => (
        <Field key={f} name={f} label={t(f)} errors={errors} />
      ))}
      <button className="h-11 rounded-md bg-primary px-4 font-semibold text-primary-foreground">
        {t('register')}
      </button>
    </form>
  );
}

export function PetForm({ errors, onSubmit }: { errors: FieldErrors; onSubmit: Submit }) {
  const t = useTranslations('pets');
  return (
    <form aria-label={t('save')} onSubmit={(e) => onSubmit(collect(e))} className="grid gap-4">
      <Field name="name" label={t('name')} errors={errors} />
      <Field name="birthDate" label={t('birthDate')} type="date" errors={errors} />
      <Field name="speciesId" label={t('species')} errors={errors} />
      <button className="h-11 rounded-md bg-primary px-4 font-semibold text-primary-foreground">
        {t('save')}
      </button>
    </form>
  );
}

export function AppointmentForm({ errors, onSubmit }: { errors: FieldErrors; onSubmit: Submit }) {
  const t = useTranslations('visits');
  return (
    <form aria-label={t('schedule')} onSubmit={(e) => onSubmit(collect(e))} className="grid gap-4">
      <Field name="scheduledAt" label={t('scheduledAt')} type="datetime-local" errors={errors} />
      <Field name="description" label={t('description')} errors={errors} />
      <button className="h-11 rounded-md bg-primary px-4 font-semibold text-primary-foreground">
        {t('schedule')}
      </button>
    </form>
  );
}

export function EncounterForm({ errors, onSubmit }: { errors: FieldErrors; onSubmit: Submit }) {
  const t = useTranslations('visits');
  return (
    <form aria-label={t('record')} onSubmit={(e) => onSubmit(collect(e))} className="grid gap-4">
      <Field name="date" label={t('date')} type="date" errors={errors} />
      <Field name="chiefComplaint" label={t('chiefComplaint')} errors={errors} />
      <button className="h-11 rounded-md bg-primary px-4 font-semibold text-primary-foreground">
        {t('record')}
      </button>
    </form>
  );
}
