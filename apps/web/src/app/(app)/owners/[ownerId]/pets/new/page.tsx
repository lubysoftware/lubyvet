import type { OwnerOutput, SpeciesOutput } from '@lubyvet/contracts';
import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/ui/page-header';
import { PetEditor } from '@/features/pets/components/pet-editor';
import { load } from '@/lib/api';

export default async function NewPetPage({ params }: { params: Promise<{ ownerId: string }> }) {
  const { ownerId } = await params;
  const t = await getTranslations();
  const [owner, species] = await Promise.all([
    load<OwnerOutput>(`/api/owners/${ownerId}`),
    load<SpeciesOutput[]>('/api/species'),
  ]);
  return (
    <>
      <PageHeader
        title={t('pets.register')}
        crumbsLabel={t('common.breadcrumb')}
        crumbs={[
          { href: '/owners', label: t('nav.owners') },
          { href: `/owners/${owner.id}`, label: `${owner.firstName} ${owner.lastName}` },
        ]}
      />
      <PetEditor ownerId={owner.id} species={species} />
    </>
  );
}
