import type {
  AuthorshipOutput,
  OwnerOutput,
  OwnerRecordOutput,
  PetVisitsOutput,
  VetCatalogOutput,
} from '@lubyvet/contracts';
import { getTranslations } from 'next-intl/server';
import { LinkButton } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { type ResultCode, ResultMessage } from '@/features/forms/components/result-message';
import { AnonymizeOwner } from '@/features/owners/components/anonymization';
import { OwnerContact, PetList } from '@/features/owners/components/owner-record-view';
import { VisitHistory } from '@/features/visits/components/visit-history';
import { currentSession, load } from '@/lib/api';

const RESULTS: readonly ResultCode[] = ['ownerSaved', 'petSaved', 'appointmentSaved', 'encounterSaved'];

/** 001/US-6: a ficha do dono. P1: animal e visita só se alcançam por aqui. */
export default async function OwnerRecordPage({
  params,
  searchParams,
}: {
  params: Promise<{ ownerId: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { ownerId } = await params;
  const sp = await searchParams;
  const t = await getTranslations();
  const [session, owner, record, authorship] = await Promise.all([
    currentSession(),
    load<OwnerOutput>(`/api/owners/${ownerId}`),
    load<OwnerRecordOutput>(`/api/owners/${ownerId}/record`),
    load<AuthorshipOutput>(`/api/owners/${ownerId}/authorship`),
  ]);
  const canWrite = session.role !== 'reader';
  const pet = record.pets.find((p) => String(p.id) === sp.pet) ?? record.pets[0] ?? null;
  const [visits, vets] = pet
    ? await Promise.all([
        load<PetVisitsOutput>(`/api/owners/${owner.id}/pets/${pet.id}/visits`),
        load<VetCatalogOutput>('/api/vets?page=1&pageSize=50'),
      ])
    : [null, null];
  const vetNames = Object.fromEntries((vets?.items ?? []).map((v) => [v.id, `${v.firstName} ${v.lastName}`]));
  const basePath = pet ? `/owners/${owner.id}/pets/${pet.id}` : '';
  // D09: animal Falecido ou Transferido não aceita agendamento novo; o botão some, a API recusa.
  const canSchedule = canWrite && pet?.status === 'active';
  const saved = RESULTS.find((r) => r === sp.saved) ?? null;
  return (
    <>
      <PageHeader
        title={`${owner.firstName} ${owner.lastName}`}
        crumbsLabel={t('common.breadcrumb')}
        crumbs={[{ href: '/owners', label: t('nav.owners') }]}
        actions={
          canWrite && (
            <>
              {session.role === 'admin' && <AnonymizeOwner ownerId={owner.id} />}
              <LinkButton variant="secondary" href={`/owners/${owner.id}/edit`}>
                {t('owners.edit')}
              </LinkButton>
              <LinkButton href={`/owners/${owner.id}/pets/new`}>{t('pets.register')}</LinkButton>
            </>
          )
        }
      />
      <ResultMessage code={saved} />
      <OwnerContact owner={owner} authorship={authorship} />
      <section aria-labelledby="h-pets" className="grid gap-4 md:grid-cols-[280px_1fr]">
        <div className="grid content-start gap-2">
          <h2 id="h-pets" className="text-lg font-semibold">
            {t('owners.pets')}
          </h2>
          <PetList ownerId={owner.id} pets={record.pets} selected={pet?.id ?? null} />
        </div>
        <div className="grid min-w-0 content-start gap-4">
          {pet && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">{pet.name}</h2>
              <div className="flex flex-wrap gap-2">
                {canWrite && (
                  <LinkButton variant="secondary" href={`${basePath}/edit`}>
                    {t('pets.edit')}
                  </LinkButton>
                )}
                {canWrite && (
                  <LinkButton variant="secondary" href={`${basePath}/encounters/new`}>
                    {t('visits.record')}
                  </LinkButton>
                )}
                {canSchedule && (
                  <LinkButton href={`${basePath}/appointments/new`}>{t('visits.schedule')}</LinkButton>
                )}
              </div>
            </div>
          )}
          {visits && (
            <VisitHistory
              appointments={visits.appointments}
              encounters={visits.encounters}
              basePath={basePath}
              canWrite={canWrite}
              vetNames={vetNames}
            />
          )}
        </div>
      </section>
    </>
  );
}
