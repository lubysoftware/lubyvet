import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Junta classes e resolve conflito de utilitário do Tailwind (padrão do shadcn/ui, D35). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
