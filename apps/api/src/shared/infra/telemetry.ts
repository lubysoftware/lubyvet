import { metrics } from '@opentelemetry/api';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';

/**
 * P-16, D36: com OTEL_EXPORTER_OTLP_ENDPOINT definido (o Collector do cluster), as métricas saem
 * por OTLP a cada 30 s. Sem ele, nada é exportado e o processo segue normalmente.
 */
export function startTelemetry(service: string): MeterProvider | null {
  if (!process.env.OTEL_EXPORTER_OTLP_ENDPOINT) return null;
  const provider = new MeterProvider({
    resource: resourceFromAttributes({ 'service.name': service }),
    readers: [
      new PeriodicExportingMetricReader({ exporter: new OTLPMetricExporter(), exportIntervalMillis: 30_000 }),
    ],
  });
  metrics.setGlobalMeterProvider(provider);
  return provider;
}
