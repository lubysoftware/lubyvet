import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { Button as BaseButton, buttonVariants } from './base/button';

/**
 * Botão do design system sobre o shadcn/ui (D35): primário marca a ação principal da tela;
 * secundário e perigo nas demais. Os nomes de variante são os do design system.
 */
export type Variant = 'primary' | 'secondary' | 'danger';
const BASE: Record<Variant, 'default' | 'outline' | 'destructive'> = {
  primary: 'default',
  secondary: 'outline',
  danger: 'destructive',
};
export const buttonClass = (variant: Variant = 'primary'): string =>
  buttonVariants({ variant: BASE[variant] });

export function Button({
  variant = 'primary',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <BaseButton type="button" variant={BASE[variant]} className={className} {...props} />;
}

export function LinkButton({
  variant,
  className,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: Variant }) {
  return <a {...props} className={cn(buttonClass(variant), className)} />;
}
