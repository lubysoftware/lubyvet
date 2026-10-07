import { APPOINTMENT_STATUS } from '@lubyvet/contracts';
import { useFormatter, useTranslations } from 'next-intl';

export type Metrics = Record<string, number | Record<string, number>>;
const num = (m: Metrics, k: string): number => (typeof m[k] === 'number' ? m[k] : 0);

const SEGMENT: Record<(typeof APPOINTMENT_STATUS)[number], string> = {
  scheduled: 'bg-status-scheduled-fg',
  done: 'bg-status-done-fg',
  cancelled: 'bg-status-cancelled-fg',
  no_show: 'bg-status-noshow-fg',
};

/**
 * 008/T021, D27: indicadores sem dado pessoal. Os painéis completos ficam no Grafana; aqui só o
 * que decide algo no balcão. A barra de situações tem legenda escrita e aria-label (README).
 */
export function Indicators({ metrics }: { metrics: Metrics }) {
  const t = useTranslations('admin');
  const ts = useTranslations('appointmentStatus');
  const format = useFormatter();
  const byStatus = (
    typeof metrics.appointmentsByStatus === 'object' ? metrics.appointmentsByStatus : {}
  ) as Record<string, number>;
  const total = APPOINTMENT_STATUS.reduce((n, s) => n + (byStatus[s] ?? 0), 0);
  const tiles = [
    ['owners', num(metrics, 'owners')],
    ['pets', num(metrics, 'pets')],
    ['encountersTotal', num(metrics, 'encounters')],
    ['pendingRecord', num(metrics, 'pendingRecord')],
    ['anonymizations', num(metrics, 'anonymizations')],
  ] as const;
  const summary = APPOINTMENT_STATUS.map((s) => `${ts(s)}: ${byStatus[s] ?? 0}`).join(', ');
  return (
    <div className="grid gap-6">
      <dl className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4">
        {tiles.map(([k, v]) => (
          <div key={k} className="grid gap-1 rounded-md border border-border bg-surface-raised p-4">
            <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t(k)}</dt>
            <dd className="tabular text-2xl font-semibold">{format.number(v)}</dd>
          </div>
        ))}
        <div className="grid gap-1 rounded-md border border-border bg-surface-raised p-4">
          <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t('noShowRate')}
          </dt>
          <dd className="tabular text-2xl font-semibold">
            {format.number(num(metrics, 'noShowRate') / 100, { style: 'percent', maximumFractionDigits: 1 })}
          </dd>
        </div>
      </dl>
      <section
        aria-labelledby="h-status"
        className="grid gap-3 rounded-md border border-border bg-surface-raised p-4"
      >
        <h2 id="h-status" className="font-semibold">
          {t('appointmentsByStatus')}
        </h2>
        {total > 0 && (
          <div role="img" aria-label={summary} className="flex h-6 gap-0.5 overflow-hidden rounded-md">
            {APPOINTMENT_STATUS.filter((s) => byStatus[s]).map((s) => (
              <span key={s} className={SEGMENT[s]} style={{ flexGrow: byStatus[s] }} />
            ))}
          </div>
        )}
        <ul className="flex flex-wrap gap-4 text-sm">
          {APPOINTMENT_STATUS.map((s) => (
            <li key={s} className="flex items-center gap-2">
              <span aria-hidden className={`size-3 rounded-full ${SEGMENT[s]}`} />
              {ts(s)} <span className="tabular font-semibold">{byStatus[s] ?? 0}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
