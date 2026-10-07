import type { OwnerSearchOutput } from '@lubyvet/contracts';
import { useTranslations } from 'next-intl';
import { LinkButton } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { ownerRecordUrl, ownersSearchUrl } from '@/lib/url-state';

/** 002/T006: todo link de página carrega o termo buscado. */
export const pageHref = (lastName: string, page: number, pageSize: number): string =>
  ownersSearchUrl('/owners', { lastName, page, pageSize });

/** 002/T009: um resultado só, de uma busca com termo, leva direto à ficha. */
export const singleResultTarget = (data: OwnerSearchOutput): string | null =>
  data.lastName !== '' && data.total === 1 && data.items[0]
    ? ownerRecordUrl(`/owners/${data.items[0].id}`, {})
    : null;

/** Lista de donos (design system: DataTable) com busca por sobrenome e paginação. */
export function OwnersSearchView({
  data,
  canWrite = false,
}: {
  data: OwnerSearchOutput;
  canWrite?: boolean;
}) {
  const t = useTranslations('owners');
  const tn = useTranslations('nav');
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  // 002/T003: busca sem resultado volta ao formulário com erro no campo.
  const notFound = data.lastName !== '' && data.total === 0;
  return (
    <section className="grid gap-4">
      <PageHeader
        title={tn('owners')}
        actions={canWrite && <LinkButton href="/owners/new">{t('register')}</LinkButton>}
      />
      <form action="/owners" className="flex flex-wrap items-end gap-2">
        <div className="grid gap-2">
          <label htmlFor="lastName" className="text-sm font-semibold">
            {t('search')}
          </label>
          <input
            id="lastName"
            name="lastName"
            defaultValue={data.lastName}
            aria-invalid={notFound}
            aria-describedby={notFound ? 'lastName-error' : undefined}
            className="h-11 rounded-md border border-input bg-surface-raised px-3 aria-invalid:border-2 aria-invalid:border-destructive"
          />
          {notFound && (
            <p id="lastName-error" className="text-sm font-semibold text-destructive">
              {t('notFound')}
            </p>
          )}
        </div>
        <button
          type="submit"
          className="h-11 rounded-md bg-primary px-4 font-semibold text-primary-foreground"
        >
          {t('searchAction')}
        </button>
      </form>
      <div className="overflow-x-auto rounded-md border border-border bg-surface-raised">
        <table className="w-full min-w-[640px]">
          <thead className="bg-surface text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2">{t('lastName')}</th>
              <th className="px-3 py-2">{t('city')}</th>
              <th className="px-3 py-2">{t('telephone')}</th>
              <th className="px-3 py-2">{t('pets')}</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((o) => (
              <tr key={o.id} className="h-11 border-t border-border">
                <td className="px-3">
                  <a href={`/owners/${o.id}`} className="font-semibold text-primary underline">
                    {o.firstName} {o.lastName}
                  </a>
                </td>
                <td className="px-3">{o.city}</td>
                <td className="tabular px-3">{o.telephone}</td>
                <td className="px-3">{o.petNames.join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <nav
        className="flex items-center justify-between text-sm text-muted-foreground"
        aria-label={t('page', { page: data.page, pages })}
      >
        <span>{t('page', { page: data.page, pages })}</span>
        <span className="flex gap-2">
          {data.page > 1 && (
            <a href={pageHref(data.lastName, data.page - 1, data.pageSize)}>{t('previous')}</a>
          )}
          {data.page < pages && (
            <a href={pageHref(data.lastName, data.page + 1, data.pageSize)}>{t('next')}</a>
          )}
        </span>
      </nav>
    </section>
  );
}
