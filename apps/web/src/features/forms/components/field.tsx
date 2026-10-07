'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import type { FieldErrors } from '../field-errors';

const control =
  'rounded-md border border-input bg-surface-raised px-3 aria-invalid:border-2 aria-invalid:border-destructive';

interface Common {
  name: string;
  label: string;
  errors: FieldErrors;
  defaultValue?: string | undefined;
  required?: boolean | undefined;
}

/** Rótulo acima, erro no próprio campo (design system: Field). O valor digitado nunca se perde. */
function Shell({ name, label, errors, children }: Common & { children: (a11y: A11y) => ReactNode }) {
  const t = useTranslations('fields');
  const code = errors[name];
  const id = `f-${name}`;
  return (
    <div className="grid max-w-[420px] gap-2">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      {children({
        id,
        name,
        'aria-invalid': code ? true : undefined,
        'aria-describedby': code ? `${id}-error` : undefined,
      })}
      {code && (
        <p id={`${id}-error`} className="text-sm font-semibold text-destructive">
          {t(code)}
        </p>
      )}
    </div>
  );
}

interface A11y {
  id: string;
  name: string;
  'aria-invalid': true | undefined;
  'aria-describedby': string | undefined;
}

export function Field(props: Common & { type?: string; step?: string }) {
  const { type = 'text', step, defaultValue, required } = props;
  return (
    <Shell {...props}>
      {(a) => (
        <input
          {...a}
          type={type}
          step={step}
          required={required}
          defaultValue={defaultValue}
          className={`h-11 ${control}`}
        />
      )}
    </Shell>
  );
}

export function TextAreaField(props: Common) {
  return (
    <Shell {...props}>
      {(a) => <textarea {...a} rows={3} defaultValue={props.defaultValue} className={`py-2 ${control}`} />}
    </Shell>
  );
}

export function SelectField(props: Common & { options: { value: string; label: string }[]; empty?: string }) {
  return (
    <Shell {...props}>
      {(a) => (
        <select {...a} defaultValue={props.defaultValue ?? ''} className={`h-11 ${control}`}>
          {props.empty !== undefined && <option value="">{props.empty}</option>}
          {props.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </Shell>
  );
}

export function CheckboxField({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex min-h-11 items-center gap-2">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="size-5 accent-primary" />
      <span>{label}</span>
    </label>
  );
}
