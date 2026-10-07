'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button, type Variant } from './button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from './base/dialog';

/** Dialog do shadcn/ui (Radix): confirma o que não se desfaz (README do design system: navegação). */
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
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" disabled={disabled}>
          {trigger}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[480px] text-foreground">
        <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
        <DialogDescription className="text-foreground">{body}</DialogDescription>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">{t('back')}</Button>
          </DialogClose>
          <Button
            variant={variant}
            onClick={() => {
              setOpen(false);
              onConfirm();
            }}
          >
            {confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
