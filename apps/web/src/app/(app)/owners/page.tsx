import type { OwnerSearchOutput } from '@lubyvet/contracts';
import { redirect } from 'next/navigation';
import { OwnersSearchView, singleResultTarget } from '@/features/owners/components/owners-search-view';
import { currentSession, load } from '@/lib/api';

export default async function OwnersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const qs = new URLSearchParams({
    lastName: sp.lastName ?? '',
    page: sp.page ?? '1',
    pageSize: sp.pageSize ?? '10',
  });
  const [session, body] = await Promise.all([
    currentSession(),
    load<OwnerSearchOutput>(`/api/owners?${qs.toString()}`),
  ]);
  const target = singleResultTarget(body);
  if (target) redirect(target);
  return <OwnersSearchView data={body} canWrite={session.role !== 'reader'} />;
}
