import type { VetCatalogOutput, VetPatientsOutput } from '@lubyvet/contracts';
import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/ui/page-header';
import { VetPatients } from '@/features/vets/components/vets-view';
import { load } from '@/lib/api';

export default async function VetPatientsPage({ params }: { params: Promise<{ vetId: string }> }) {
  const { vetId } = await params;
  const t = await getTranslations();
  const [patients, catalog] = await Promise.all([
    load<VetPatientsOutput>(`/api/vets/${vetId}/patients`),
    load<VetCatalogOutput>('/api/vets?page=1&pageSize=50'),
  ]);
  const vet = catalog.items.find((v) => String(v.id) === vetId);
  return (
    <>
      <PageHeader
        title={vet ? t('vets.patientsOf', { name: `${vet.firstName} ${vet.lastName}` }) : t('vets.patients')}
        crumbsLabel={t('common.breadcrumb')}
        crumbs={[{ href: '/vets', label: t('nav.vets') }]}
      />
      <VetPatients patients={patients} />
    </>
  );
}
