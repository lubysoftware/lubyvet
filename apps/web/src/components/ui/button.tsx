import type { ButtonHTMLAttributes, AnchorHTMLAttributes } from 'react';

/** Botão do design system: primário marca a ação principal da tela; secundário e perigo nas demais. */
export type Variant = 'primary' | 'secondary' | 'danger';
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-primary text-primary-foreground',
  secondary: 'border border-input bg-surface-raised text-foreground hover:bg-primary-soft',
  danger: 'border border-destructive bg-surface-raised text-destructive',
};
export const buttonClass = (variant: Variant = 'primary'): string =>
  `inline-flex h-11 items-center justify-center gap-2 rounded-md px-4 font-semibold disabled:opacity-60 ${VARIANTS[variant]}`;

export function Button({
  variant,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button type="button" {...props} className={`${buttonClass(variant)} ${props.className ?? ''}`} />;
}

export function LinkButton({
  variant,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: Variant }) {
  return <a {...props} className={`${buttonClass(variant)} ${props.className ?? ''}`} />;
}
