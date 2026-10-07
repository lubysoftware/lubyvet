import type { OwnerOutput } from '@lubyvet/contracts';
import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/ui/page-header';
import { OwnerEditor } from '@/features/owners/components/owner-editor';
import { load } from '@/lib/api';

export default async function EditOwnerPage({ params }: { params: Promise<{ ownerId: string }> }) {
  const { ownerId } = await params;
  const t = await getTranslations();
  const owner = await load<OwnerOutput>(`/api/owners/${ownerId}`);
  const name = `${owner.firstName} ${owner.lastName}`;
  return (
    <>
      <PageHeader
        title={t('owners.edit')}
        crumbsLabel={t('common.breadcrumb')}
        crumbs={[
          { href: '/owners', label: t('nav.owners') },
          { href: `/owners/${owner.id}`, label: name },
        ]}
      />
      <OwnerEditor owner={owner} />
    </>
  );
}
