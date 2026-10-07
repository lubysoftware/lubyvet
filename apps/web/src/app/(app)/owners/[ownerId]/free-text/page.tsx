import type { FreeTextItemOutput, OwnerOutput } from '@lubyvet/contracts';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/ui/page-header';
import { FreeTextReview } from '@/features/owners/components/anonymization';
import { currentSession, load } from '@/lib/api';

export default async function FreeTextReviewPage({ params }: { params: Promise<{ ownerId: string }> }) {
  const { ownerId } = await params;
  const session = await currentSession();
  if (session.role !== 'admin') notFound();
  const t = await getTranslations();
  const [owner, items] = await Promise.all([
    load<OwnerOutput>(`/api/owners/${ownerId}`),
    load<FreeTextItemOutput[]>(`/api/owners/${ownerId}/free-text`),
  ]);
  return (
    <>
      <PageHeader
        title={t('anonymize.reviewTitle')}
        crumbsLabel={t('common.breadcrumb')}
        crumbs={[
          { href: '/owners', label: t('nav.owners') },
          { href: `/owners/${owner.id}`, label: `${owner.firstName} ${owner.lastName}` },
        ]}
      />
      <p className="max-w-[65ch] text-muted-foreground">{t('anonymize.reviewHelp')}</p>
      <FreeTextReview ownerId={owner.id} items={items} />
    </>
  );
}
