import type { AppointmentOutput, EncounterOutput } from '@lubyvet/contracts';
import { useTranslations } from 'next-intl';

/** 004/T010, T015: o rótulo de cada seção corresponde ao recorte que ela aplica. */
export function VisitHistory({
  appointments,
  encounters,
}: {
  appointments: AppointmentOutput[];
  encounters: EncounterOutput[];
}) {
  const t = useTranslations('visits');
  const scheduled = appointments.filter((a) => a.status === 'scheduled');
  return (
    <div className="grid gap-4">
      <section aria-labelledby="h-scheduled">
        <h2 id="h-scheduled" className="font-semibold">
          {t('scheduledSection')}
        </h2>
        <ul>
          {scheduled.map((a) => (
            <li key={a.id} className="tabular">
              {a.scheduledAt.slice(0, 10)} · {a.description}
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="h-attended">
        <h2 id="h-attended" className="font-semibold">
          {t('attendedSection')}
        </h2>
        <ul>
          {encounters.map((e) => (
            <li key={e.id} className="tabular">
              {e.date} · {e.chiefComplaint}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
