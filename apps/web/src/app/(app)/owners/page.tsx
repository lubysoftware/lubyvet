import type { OwnerSearchOutput } from '@lubyvet/contracts';
import { redirect } from 'next/navigation';
import { OwnersSearchView, singleResultTarget } from '@/features/owners/components/owners-search-view';
import { currentSession, load } from '@/lib/api';
import { loadOwnersSearch, ownersSearchUrl } from '@/lib/url-state';

export default async function OwnersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const query = await loadOwnersSearch(searchParams);
  const [session, body] = await Promise.all([
    currentSession(),
    load<OwnerSearchOutput>(ownersSearchUrl('/api/owners', query)),
  ]);
  const target = singleResultTarget(body);
  if (target) redirect(target);
  return <OwnersSearchView data={body} canWrite={session.role !== 'reader'} />;
}
