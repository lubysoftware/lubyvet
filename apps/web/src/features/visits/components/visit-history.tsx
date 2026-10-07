import type { AppointmentOutput, EncounterOutput } from '@lubyvet/contracts';
import { useFormatter, useTranslations } from 'next-intl';
import { LinkButton } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { dateOnly } from '@/lib/format';
import { AppointmentActions } from './appointment-actions';
import { fromAppointmentUrl } from '@/lib/url-state';

const th = 'px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground';

/**
 * 004/T010, T015 e CA-4.3: a ficha do animal separa o agendado do atendido, e o rótulo de cada
 * seção corresponde ao recorte que ela aplica. Agendamento passado sem registro aparece como
 * pendente de registro (D11), com a linha destacada.
 */
export function VisitHistory({
  appointments,
  encounters,
  basePath = '',
  canWrite = false,
  vetNames = {},
}: {
  appointments: AppointmentOutput[];
  encounters: EncounterOutput[];
  /** /owners/:ownerId/pets/:petId, para as ações de cada agendamento. */
  basePath?: string;
  canWrite?: boolean;
  vetNames?: Record<number, string>;
}) {
  const t = useTranslations('visits');
  const format = useFormatter();
  const scheduled = appointments.filter((a) => a.status === 'scheduled');
  const closed = appointments.filter((a) => a.status !== 'scheduled');
  const when = (iso: string) => format.dateTime(new Date(iso), { dateStyle: 'short', timeStyle: 'short' });
  const day = (d: string) => format.dateTime(dateOnly(d), { dateStyle: 'short', timeZone: 'UTC' });
  return (
    <div className="grid gap-6">
      <section aria-labelledby="h-scheduled" className="grid gap-2">
        <h3 id="h-scheduled" className="font-semibold">
          {t('scheduledSection')}
        </h3>
        {scheduled.length === 0 ? (
          <p className="text-muted-foreground">{t('noneScheduled')}</p>
        ) : (
          <ul className="grid gap-2">
            {scheduled.map((a) => (
              <li
                key={a.id}
                className={`grid gap-2 rounded-md border border-border p-3 ${
                  a.pendingRecord ? 'bg-status-pending-row' : 'bg-surface-raised'
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="tabular font-semibold">{when(a.scheduledAt)}</span>
                  <StatusBadge status={a.status} pendingRecord={a.pendingRecord} />
                  <span>{a.description}</span>
                </div>
                {canWrite && (
                  <div className="flex flex-wrap gap-2">
                    <LinkButton
                      variant="secondary"
                      href={fromAppointmentUrl(`${basePath}/encounters/new`, {
                        appointment: a.id,
                        version: a.version,
                      })}
                    >
                      {t('record')}
                    </LinkButton>
                    {!a.pendingRecord && (
                      <LinkButton variant="secondary" href={`${basePath}/appointments/${a.id}/edit`}>
                        {t('reschedule')}
                      </LinkButton>
                    )}
                    <AppointmentActions path={`/api${basePath}/appointments/${a.id}`} version={a.version} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section aria-labelledby="h-attended" className="grid gap-2">
        <h3 id="h-attended" className="font-semibold">
          {t('attendedSection')}
        </h3>
        {encounters.length === 0 ? (
          <p className="text-muted-foreground">{t('noneAttended')}</p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border bg-surface-raised">
            <table className="w-full min-w-[640px]">
              <thead className="bg-surface">
                <tr>
                  <th className={th}>{t('date')}</th>
                  <th className={th}>{t('chiefComplaint')}</th>
                  <th className={th}>{t('diagnosis')}</th>
                  <th className={th}>{t('conduct')}</th>
                  <th className={th}>{t('weightKg')}</th>
                  <th className={th}>{t('vet')}</th>
                </tr>
              </thead>
              <tbody>
                {encounters.map((e) => (
                  <tr key={e.id} className="border-t border-border align-top">
                    <td className="tabular px-3 py-2">{day(e.date)}</td>
                    <td className="px-3 py-2">{e.chiefComplaint}</td>
                    <td className="px-3 py-2">{e.diagnosis}</td>
                    <td className="px-3 py-2">
                      {e.conduct}
                      {e.returnDate && (
                        <span className="block text-sm text-muted-foreground">
                          {t('returnOn', { date: day(e.returnDate) })}
                        </span>
                      )}
                    </td>
                    <td className="tabular px-3 py-2">
                      {e.weightKg !== null && format.number(e.weightKg, { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-2">{e.vetId !== null && vetNames[e.vetId]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {closed.length > 0 && (
        <section aria-labelledby="h-closed" className="grid gap-2">
          <h3 id="h-closed" className="font-semibold">
            {t('closedSection')}
          </h3>
          <ul className="grid gap-1">
            {closed.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-2">
                <span className="tabular">{when(a.scheduledAt)}</span>
                <StatusBadge status={a.status} pendingRecord={false} />
                <span>{a.description}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
