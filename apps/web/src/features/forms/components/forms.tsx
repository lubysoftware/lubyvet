'use client';

import { useTranslations } from 'next-intl';
import type { FormEvent } from 'react';
import { buttonClass } from '@/components/ui/button';
import { formValues } from '../form-values';
import type { FieldErrors } from '../field-errors';
import { CheckboxField, Field, SelectField, TextAreaField } from './field';

type Submit = (data: Record<string, string>) => void;
type Defaults = Record<string, string | undefined>;
interface FormProps {
  errors: FieldErrors;
  onSubmit: Submit;
  defaults?: Defaults;
  pending?: boolean;
}
export interface Option {
  value: string;
  label: string;
}

function Form({
  label,
  submit,
  pending,
  onSubmit,
  children,
}: {
  label: string;
  submit: string;
  pending: boolean | undefined;
  onSubmit: Submit;
  children: React.ReactNode;
}) {
  return (
    <form
      noValidate
      aria-label={label}
      onSubmit={(e: FormEvent<HTMLFormElement>) => onSubmit(formValues(e))}
      className="grid gap-4"
    >
      {children}
      <div>
        <button type="submit" disabled={pending} className={buttonClass()}>
          {submit}
        </button>
      </div>
    </form>
  );
}

/** Os quatro formulários (010/T008): o mesmo componente de campo, o mesmo destaque de erro. */
export function OwnerForm({
  errors,
  onSubmit,
  defaults = {},
  pending,
  mode = 'create',
}: FormProps & { mode?: 'create' | 'edit' }) {
  const t = useTranslations('owners');
  // O CPF identifica o dono e não muda na alteração de contato (ChangeOwnerContactInput).
  const fields = ['firstName', 'lastName', 'address', 'city', 'telephone', 'cpf', 'email'] as const;
  const action = mode === 'create' ? t('register') : t('save');
  return (
    <Form label={action} submit={action} pending={pending} onSubmit={onSubmit}>
      {fields
        .filter((f) => mode === 'create' || f !== 'cpf')
        .map((f) => (
          <Field
            key={f}
            name={f}
            label={t(f)}
            type={f === 'email' ? 'email' : f === 'telephone' ? 'tel' : 'text'}
            errors={errors}
            defaultValue={defaults[f]}
          />
        ))}
      <CheckboxField
        name="messagingConsent"
        label={t('messagingConsent')}
        defaultChecked={defaults.messagingConsent === 'on'}
      />
    </Form>
  );
}

export function PetForm({
  errors,
  onSubmit,
  defaults = {},
  pending,
  species = [],
  statuses,
}: FormProps & { species?: Option[]; statuses?: Option[] }) {
  const t = useTranslations('pets');
  return (
    <Form label={t('save')} submit={t('save')} pending={pending} onSubmit={onSubmit}>
      <Field name="name" label={t('name')} errors={errors} defaultValue={defaults.name} />
      <Field
        name="birthDate"
        label={t('birthDate')}
        type="date"
        errors={errors}
        defaultValue={defaults.birthDate}
      />
      <SelectField
        name="speciesId"
        label={t('species')}
        errors={errors}
        options={species}
        empty={t('chooseSpecies')}
        defaultValue={defaults.speciesId}
      />
      {statuses && (
        <SelectField
          name="status"
          label={t('status')}
          errors={errors}
          options={statuses}
          defaultValue={defaults.status}
        />
      )}
    </Form>
  );
}

/** 004/T006: `min` e a data sugerida vêm da mesma regra que a API aplica (@lubyvet/contracts). */
export function AppointmentForm({
  errors,
  onSubmit,
  defaults = {},
  pending,
  min,
}: FormProps & { min?: string }) {
  const t = useTranslations('visits');
  return (
    <Form label={t('schedule')} submit={t('schedule')} pending={pending} onSubmit={onSubmit}>
      <Field
        name="scheduledAt"
        label={t('scheduledAt')}
        type="datetime-local"
        min={min}
        errors={errors}
        defaultValue={defaults.scheduledAt}
      />
      <Field
        name="description"
        label={t('description')}
        errors={errors}
        defaultValue={defaults.description}
      />
    </Form>
  );
}

export function EncounterForm({
  errors,
  onSubmit,
  defaults = {},
  pending,
  vets = [],
  today,
  firstReturn,
}: FormProps & { vets?: Option[]; today?: string; firstReturn?: string }) {
  const t = useTranslations('visits');
  return (
    <Form label={t('record')} submit={t('record')} pending={pending} onSubmit={onSubmit}>
      <Field
        name="date"
        label={t('date')}
        type="date"
        max={today}
        errors={errors}
        defaultValue={defaults.date ?? today}
      />
      <TextAreaField
        name="chiefComplaint"
        label={t('chiefComplaint')}
        errors={errors}
        defaultValue={defaults.chiefComplaint}
      />
      <Field name="weightKg" label={t('weightKg')} type="number" step="0.01" errors={errors} />
      <TextAreaField name="diagnosis" label={t('diagnosis')} errors={errors} />
      <TextAreaField name="conduct" label={t('conduct')} errors={errors} />
      <Field name="returnDate" label={t('returnDate')} type="date" min={firstReturn} errors={errors} />
      <SelectField name="vetId" label={t('vet')} errors={errors} options={vets} empty={t('noVet')} />
    </Form>
  );
}
