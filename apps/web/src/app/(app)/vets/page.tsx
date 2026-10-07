import type { VetCatalogOutput } from '@lubyvet/contracts';
import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/ui/page-header';
import { VetCatalog } from '@/features/vets/components/vets-view';
import { load } from '@/lib/api';
import { loadCatalog, vetCatalogApiUrl } from '@/lib/url-state';

export default async function VetsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { page } = await loadCatalog(searchParams);
  const t = await getTranslations('nav');
  const data = await load<VetCatalogOutput>(vetCatalogApiUrl('/api/vets', { page, pageSize: 10 }));
  return (
    <>
      <PageHeader title={t('vets')} />
      <VetCatalog data={data} />
    </>
  );
}
