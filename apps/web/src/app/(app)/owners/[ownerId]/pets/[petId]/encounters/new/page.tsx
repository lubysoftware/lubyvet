import {
  businessToday,
  firstReturnDate,
  type PetVisitsOutput,
  type VetCatalogOutput,
} from '@lubyvet/contracts';
import { getFormatter, getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/ui/page-header';
import { EncounterEditor } from '@/features/visits/components/visit-editors';
import { petContext } from '@/features/visits/server/pet-context';
import { load } from '@/lib/api';
import { loadFromAppointment, vetCatalogApiUrl } from '@/lib/url-state';

export default async function NewEncounterPage({
  params,
  searchParams,
}: {
  params: Promise<{ ownerId: string; petId: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { ownerId, petId } = await params;
  const sp = await loadFromAppointment(searchParams);
  const t = await getTranslations('visits');
  const format = await getFormatter();
  const { owner, pet, crumbs, crumbsLabel } = await petContext(ownerId, petId);
  const [vets, visits] = await Promise.all([
    load<VetCatalogOutput>(vetCatalogApiUrl('/api/vets', { page: 1, pageSize: 50 })),
    sp.appointment !== null ? load<PetVisitsOutput>(`/api/owners/${owner.id}/pets/${pet.id}/visits`) : null,
  ]);
  const appointment = visits?.appointments.find((a) => a.id === sp.appointment);
  return (
    <>
      <PageHeader title={t('record')} crumbs={crumbs} crumbsLabel={crumbsLabel} />
      {appointment && (
        <p className="text-muted-foreground">
          {t('fromAppointment', {
            when: format.dateTime(new Date(appointment.scheduledAt), {
              dateStyle: 'short',
              timeStyle: 'short',
            }),
            description: appointment.description,
          })}
        </p>
      )}
      <EncounterEditor
        ownerId={owner.id}
        petId={pet.id}
        appointment={appointment && { id: appointment.id, version: appointment.version }}
        dates={{ today: businessToday(new Date()), firstReturn: firstReturnDate(new Date()) }}
        vets={vets.items.map((v) => ({ value: String(v.id), label: `${v.firstName} ${v.lastName}` }))}
      />
    </>
  );
}
