import type { AppointmentStatus } from '@lubyvet/contracts';
import { useTranslations } from 'next-intl';

/** StatusBadge: a situação sempre escrita, no par de cor da situação (README do design system). */
const TONE: Record<AppointmentStatus | 'pending', string> = {
  scheduled: 'bg-status-scheduled-bg text-status-scheduled-fg',
  done: 'bg-status-done-bg text-status-done-fg',
  cancelled: 'bg-status-cancelled-bg text-status-cancelled-fg',
  no_show: 'bg-status-noshow-bg text-status-noshow-fg',
  pending: 'bg-status-pending-bg text-status-pending-fg',
};

export function StatusBadge({
  status,
  pendingRecord,
}: {
  status: AppointmentStatus;
  pendingRecord: boolean;
}) {
  const t = useTranslations();
  // D11: "pendente de registro" é derivado na leitura e substitui o selo de Agendada.
  const tone = pendingRecord ? 'pending' : status;
  return (
    <span className={`inline-flex h-6 items-center rounded-full px-2 text-xs font-semibold ${TONE[tone]}`}>
      {t(`appointmentStatus.${tone}`)}
    </span>
  );
}
