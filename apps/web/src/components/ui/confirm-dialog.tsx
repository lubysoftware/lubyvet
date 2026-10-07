'use client';

import { useTranslations } from 'next-intl';
import { useRef } from 'react';
import { Button, type Variant } from './button';

/** Dialog: confirma o que não se desfaz (README do design system: navegação). */
export function ConfirmDialog({
  trigger,
  title,
  body,
  confirm,
  variant = 'danger',
  disabled,
  onConfirm,
}: {
  trigger: string;
  title: string;
  body: string;
  confirm: string;
  variant?: Variant;
  disabled?: boolean;
  onConfirm: () => void;
}) {
  const t = useTranslations('common');
  const ref = useRef<HTMLDialogElement>(null);
  const close = () => ref.current?.close();
  return (
    <>
      <Button variant="secondary" disabled={disabled} onClick={() => ref.current?.showModal()}>
        {trigger}
      </Button>
      <dialog
        ref={ref}
        aria-labelledby={`${title}-t`}
        className="m-auto max-w-[480px] rounded-lg border border-border bg-surface-raised p-6 text-foreground backdrop:bg-foreground/40"
      >
        <h2 id={`${title}-t`} className="mb-2 text-lg font-semibold">
          {title}
        </h2>
        <p className="mb-6">{body}</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={close}>
            {t('back')}
          </Button>
          <Button
            variant={variant}
            onClick={() => {
              close();
              onConfirm();
            }}
          >
            {confirm}
          </Button>
        </div>
      </dialog>
    </>
  );
}
