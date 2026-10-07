import type { OwnerOutput, PetOutput, SpeciesOutput } from '@lubyvet/contracts';
import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/ui/page-header';
import { PetEditor } from '@/features/pets/components/pet-editor';
import { load } from '@/lib/api';
import { ownerRecordUrl } from '@/lib/url-state';

export default async function EditPetPage({
  params,
}: {
  params: Promise<{ ownerId: string; petId: string }>;
}) {
  const { ownerId, petId } = await params;
  const t = await getTranslations();
  // P1: o animal só se lê pelo dono; animal de outro dono responde 404.
  const [owner, pet, species] = await Promise.all([
    load<OwnerOutput>(`/api/owners/${ownerId}`),
    load<PetOutput>(`/api/owners/${ownerId}/pets/${petId}`),
    load<SpeciesOutput[]>('/api/species'),
  ]);
  return (
    <>
      <PageHeader
        title={t('pets.edit')}
        crumbsLabel={t('common.breadcrumb')}
        crumbs={[
          { href: '/owners', label: t('nav.owners') },
          { href: `/owners/${owner.id}`, label: `${owner.firstName} ${owner.lastName}` },
          { href: ownerRecordUrl(`/owners/${owner.id}`, { pet: pet.id }), label: pet.name },
        ]}
      />
      <PetEditor ownerId={owner.id} species={species} pet={pet} />
    </>
  );
}
