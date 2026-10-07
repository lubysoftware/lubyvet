import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/ui/page-header';
import { OwnerEditor } from '@/features/owners/components/owner-editor';

export default async function NewOwnerPage() {
  const t = await getTranslations();
  return (
    <>
      <PageHeader
        title={t('owners.register')}
        crumbsLabel={t('common.breadcrumb')}
        crumbs={[{ href: '/owners', label: t('nav.owners') }]}
      />
      <OwnerEditor />
    </>
  );
}
