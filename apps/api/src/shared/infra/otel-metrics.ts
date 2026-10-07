import { type Counter, type Meter, metrics } from '@opentelemetry/api';
import type { MetricLabels, MetricName, Metrics } from '../domain/metrics';

export const METER_NAME = 'lubyvet';
const LABEL_VALUE = /^[a-z0-9_-]{1,40}$/i;

/**
 * Adaptador OpenTelemetry da porta de métricas. O meter vem do provedor global, que o main
 * configura com o exportador OTLP (P-16); sem provedor, a API do OpenTelemetry não faz nada.
 * O rótulo que não passa no formato fechado é descartado, para nenhum texto livre vazar.
 */
export class OtelMetrics implements Metrics {
  private readonly counters = new Map<MetricName, Counter>();
  private meter(): Meter {
    return metrics.getMeter(METER_NAME);
  }
  increment(name: MetricName, labels: MetricLabels = {}): void {
    let c = this.counters.get(name);
    if (!c) {
      c = this.meter().createCounter(`lubyvet_${name}`);
      this.counters.set(name, c);
    }
    const safe = Object.fromEntries(Object.entries(labels).filter(([, v]) => LABEL_VALUE.test(String(v))));
    c.add(1, safe);
  }
}
