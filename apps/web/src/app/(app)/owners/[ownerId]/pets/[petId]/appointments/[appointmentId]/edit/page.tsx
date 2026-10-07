import type { PetVisitsOutput } from '@lubyvet/contracts';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/ui/page-header';
import { AppointmentEditor } from '@/features/visits/components/visit-editors';
import { petContext } from '@/features/visits/server/pet-context';
import { load } from '@/lib/api';
import { toBusinessInput } from '@/lib/format';

export default async function RescheduleAppointmentPage({
  params,
}: {
  params: Promise<{ ownerId: string; petId: string; appointmentId: string }>;
}) {
  const { ownerId, petId, appointmentId } = await params;
  const t = await getTranslations('visits');
  const { owner, pet, crumbs, crumbsLabel } = await petContext(ownerId, petId);
  // O agendamento só existe dentro das visitas do animal (P1); não há leitura por id solto.
  const visits = await load<PetVisitsOutput>(`/api/owners/${owner.id}/pets/${pet.id}/visits`);
  const appointment = visits.appointments.find((a) => String(a.id) === appointmentId);
  if (!appointment) notFound();
  return (
    <>
      <PageHeader title={t('reschedule')} crumbs={crumbs} crumbsLabel={crumbsLabel} />
      <AppointmentEditor
        ownerId={owner.id}
        petId={pet.id}
        appointment={appointment}
        limits={{ min: toBusinessInput(new Date()) }}
      />
    </>
  );
}
