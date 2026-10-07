import type { AuthorshipOutput, OwnerOutput, OwnerRecordOutput } from '@lubyvet/contracts';
import { getTranslations } from 'next-intl/server';
import { LinkButton } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { type ResultCode, ResultMessage } from '@/features/forms/components/result-message';
import { OwnerContact, PetList } from '@/features/owners/components/owner-record-view';
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
        <div className="min-w-0">{pet && <h2 className="text-lg font-semibold">{pet.name}</h2>}</div>
      </section>
    </>
  );
}
