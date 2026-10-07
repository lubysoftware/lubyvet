'use client';

import { Settings, Stethoscope, Users, type LucideIcon } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

export interface NavItem {
  href: string;
  key: 'owners' | 'vets' | 'admin';
}
const ICONS: Record<NavItem['key'], LucideIcon> = { owners: Users, vets: Stethoscope, admin: Settings };

/** Item ativo em primary-soft e primary; a rota atual também é anunciada (aria-current). */
export function NavLinks({
  items,
  label,
  horizontal,
}: {
  items: NavItem[];
  label: string;
  horizontal?: boolean;
}) {
  const t = useTranslations('nav');
  const path = usePathname();
  return (
    <nav aria-label={label} className={horizontal ? 'flex gap-1 overflow-x-auto' : 'grid gap-1'}>
      {items.map((i) => {
        const Icon = ICONS[i.key];
        const active = path === i.href || path.startsWith(`${i.href}/`);
        return (
          <a
            key={i.href}
            href={i.href}
            aria-current={active ? 'page' : undefined}
            className={`flex h-11 shrink-0 items-center gap-2 rounded-md px-3 font-medium hover:bg-primary-soft ${
              active ? 'bg-primary-soft text-primary' : ''
            }`}
          >
            <Icon size={18} aria-hidden />
            {t(i.key)}
          </a>
        );
      })}
    </nav>
  );
}
