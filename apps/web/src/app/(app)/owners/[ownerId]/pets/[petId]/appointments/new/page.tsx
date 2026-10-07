import { suggestedAppointment } from '@lubyvet/contracts';
import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/ui/page-header';
import { AppointmentEditor } from '@/features/visits/components/visit-editors';
import { petContext } from '@/features/visits/server/pet-context';
import { toBusinessInput } from '@/lib/format';

export default async function NewAppointmentPage({
  params,
}: {
  params: Promise<{ ownerId: string; petId: string }>;
}) {
  const { ownerId, petId } = await params;
  const t = await getTranslations('visits');
  const { owner, pet, crumbs, crumbsLabel } = await petContext(ownerId, petId);
  const now = new Date();
  return (
    <>
      <PageHeader title={t('schedule')} crumbs={crumbs} crumbsLabel={crumbsLabel} />
      <AppointmentEditor
        ownerId={owner.id}
        petId={pet.id}
        limits={{ min: toBusinessInput(now), suggested: toBusinessInput(suggestedAppointment(now)) }}
      />
    </>
  );
}
