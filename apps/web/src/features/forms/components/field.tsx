'use client';

import { useTranslations } from 'next-intl';
import type { FieldErrors } from '../field-errors';

/** Campo do design system (Field): rótulo acima, erro no próprio campo, valor preservado. */
export function Field({
  name,
  label,
  errors,
  type = 'text',
  defaultValue,
}: {
  name: string;
  label: string;
  errors: FieldErrors;
  type?: string;
  defaultValue?: string;
}) {
  const t = useTranslations('fields');
  const code = errors[name];
  const id = `f-${name}`;
  return (
    <div className="grid max-w-[420px] gap-2">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        defaultValue={defaultValue}
        aria-invalid={code ? true : undefined}
        aria-describedby={code ? `${id}-error` : undefined}
        className="h-11 rounded-md border border-input bg-surface-raised px-3 aria-invalid:border-2 aria-invalid:border-destructive"
      />
      {code && (
        <p id={`${id}-error`} className="text-sm font-semibold text-destructive">
          {t(code)}
        </p>
      )}
    </div>
  );
}
