import type { VetCatalogOutput, VetPatientsOutput } from '@lubyvet/contracts';
import { useTranslations } from 'next-intl';
import { catalogUrl, ownerRecordUrl } from '@/lib/url-state';

const th = 'px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground';

/** 005: o quadro de veterinários com as especialidades em ordem alfabética (CA-1.2). */
export function VetCatalog({ data }: { data: VetCatalogOutput }) {
  const t = useTranslations('vets');
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  return (
    <div className="grid gap-4">
      <div className="overflow-x-auto rounded-md border border-border bg-surface-raised">
        <table className="w-full min-w-[480px]">
          <thead className="bg-surface">
            <tr>
              <th className={th}>{t('name')}</th>
              <th className={th}>{t('specialties')}</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((v) => (
              <tr key={v.id} className="h-11 border-t border-border">
                <td className="px-3">
                  <a href={`/vets/${v.id}`} className="font-semibold text-primary underline">
                    {v.firstName} {v.lastName}
                  </a>
                </td>
                <td className="px-3">
                  {/* CA-1.3: sem especialidade, a célula diz isso em vez de ficar vazia. */}
                  {v.specialties.length ? v.specialties.map((s) => s.name).join(', ') : t('noSpecialty')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <nav
        aria-label={t('pagination')}
        className="flex items-center justify-between text-sm text-muted-foreground"
      >
        <span>{t('page', { page: data.page, pages })}</span>
        <span className="flex gap-2">
          {data.page > 1 && <a href={catalogUrl('/vets', { page: data.page - 1 })}>{t('previous')}</a>}
          {data.page < pages && <a href={catalogUrl('/vets', { page: data.page + 1 })}>{t('next')}</a>}
        </span>
      </nav>
    </div>
  );
}

/** 004/CA-4.4: os animais que o veterinário atendeu; cada um abre pela ficha do dono (P1). */
export function VetPatients({ patients }: { patients: VetPatientsOutput }) {
  const t = useTranslations('vets');
  if (patients.length === 0) return <p className="text-muted-foreground">{t('noPatients')}</p>;
  return (
    <ul className="grid gap-2">
      {patients.map((p) => (
        <li
          key={p.petId}
          className="flex min-h-11 flex-wrap items-center gap-2 rounded-md border border-border bg-surface-raised px-3"
        >
          <a
            href={ownerRecordUrl(`/owners/${p.ownerId}`, { pet: p.petId })}
            className="font-semibold text-primary underline"
          >
            {p.petName}
          </a>
          <span className="text-sm text-muted-foreground">{t('encounters', { count: p.encounters })}</span>
        </li>
      ))}
    </ul>
  );
}
