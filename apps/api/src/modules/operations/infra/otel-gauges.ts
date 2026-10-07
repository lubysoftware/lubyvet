import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { metrics } from '@opentelemetry/api';
import { METER_NAME } from '../../../shared/infra/otel-metrics';
import { OPS_READER, type OpsReader } from '../application/ports/ops.port';

/**
 * D27: os medidores que são estado, não evento (pendentes de registro, taxa de não comparecimento
 * e fila do WhatsApp), lidos do banco a cada coleta do OpenTelemetry. Só agregados, sem rótulo.
 */
@Injectable()
export class OtelGauges implements OnModuleInit {
  constructor(@Inject(OPS_READER) private readonly ops: OpsReader) {}

  onModuleInit(): void {
    const meter = metrics.getMeter(METER_NAME);
    const pending = meter.createObservableGauge('lubyvet_appointments_pending_record');
    const noShow = meter.createObservableGauge('lubyvet_no_show_rate_percent');
    const queue = meter.createObservableGauge('lubyvet_whatsapp_queue_size');
    meter.addBatchObservableCallback(
      async (result) => {
        const m = await this.ops.metrics();
        const n = (k: string) => (typeof m[k] === 'number' ? m[k] : 0);
        result.observe(pending, n('pendingRecord'));
        result.observe(noShow, n('noShowRate'));
        result.observe(queue, n('whatsappQueue'));
      },
      [pending, noShow, queue],
    );
  }
}
