import type { VetCatalogOutput } from '@lubyvet/contracts';
import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/ui/page-header';
import { VetCatalog } from '@/features/vets/components/vets-view';
import { load } from '@/lib/api';

export default async function VetsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const t = await getTranslations('nav');
  const page = /^\d+$/.test(sp.page ?? '') ? sp.page : '1';
  const data = await load<VetCatalogOutput>(`/api/vets?page=${page}&pageSize=10`);
  return (
    <>
      <PageHeader title={t('vets')} />
      <VetCatalog data={data} />
    </>
  );
}
