import type { OwnerOutput, PetOutput } from '@lubyvet/contracts';
import { getTranslations } from 'next-intl/server';
import { load } from '@/lib/api';

/** Dono e animal da URL, lidos pelo caminho do dono (P1), com o Breadcrumb de nomes reais. */
export async function petContext(ownerId: string, petId: string) {
  const t = await getTranslations();
  const [owner, pet] = await Promise.all([
    load<OwnerOutput>(`/api/owners/${ownerId}`),
    load<PetOutput>(`/api/owners/${ownerId}/pets/${petId}`),
  ]);
  const crumbs = [
    { href: '/owners', label: t('nav.owners') },
    { href: `/owners/${owner.id}`, label: `${owner.firstName} ${owner.lastName}` },
    { href: `/owners/${owner.id}?pet=${pet.id}`, label: pet.name },
  ];
  return { owner, pet, crumbs, crumbsLabel: t('common.breadcrumb') };
}
