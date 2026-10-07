import type { VetCatalogOutput } from '@lubyvet/contracts';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/ui/page-header';
import { type Metrics, Indicators } from '@/features/admin/components/indicators';
import {
  type SpeciesRow,
  type VetRow,
  SpeciesAdmin,
  VetsAdmin,
} from '@/features/admin/components/vocabulary-admin';
import { currentSession, load } from '@/lib/api';
import { ADMIN_TABS, adminUrl, loadAdmin, vetCatalogApiUrl } from '@/lib/url-state';

/** D18 e D03: a superfície de gestão é só do Administrador; a aba fica na URL. */
export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await currentSession();
  if (session.role !== 'admin') notFound();
  const { tab } = await loadAdmin(searchParams);
  const t = await getTranslations();
  return (
    <>
      <PageHeader title={t('nav.admin')} />
      <nav aria-label={t('admin.sections')} className="flex gap-4 border-b border-border">
        {ADMIN_TABS.map((x) => (
          <a
            key={x}
            href={adminUrl('/admin', { tab: x })}
            aria-current={x === tab ? 'page' : undefined}
            className={`-mb-px flex h-11 items-center border-b-2 px-1 font-semibold ${
              x === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
            }`}
          >
            {t(`adminTabs.${x}`)}
          </a>
        ))}
      </nav>
      {tab === 'indicators' && <Indicators metrics={await load<Metrics>('/api/admin/metrics')} />}
      {tab === 'species' && <SpeciesAdmin rows={await load<SpeciesRow[]>('/api/admin/species')} />}
      {tab === 'vets' && <VetsTab />}
    </>
  );
}

async function VetsTab() {
  const [rows, catalog] = await Promise.all([
    load<VetRow[]>('/api/admin/vets'),
    load<VetCatalogOutput>(vetCatalogApiUrl('/api/vets', { page: 1, pageSize: 50 })),
  ]);
  // Não há rota de especialidades; os nomes vêm das especialidades que o catálogo já mostra.
  const specialtyNames = Object.fromEntries(
    catalog.items.flatMap((v) => v.specialties.map((s) => [s.id, s.name])),
  );
  return <VetsAdmin rows={rows} specialtyNames={specialtyNames} />;
}
