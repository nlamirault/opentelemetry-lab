// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { metrics } from "@opentelemetry/api";
import { OTLPMetricExporter as GRPCOTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-grpc";
import { OTLPMetricExporter as HTTPOTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";

export function initializeMeter(otelEndpoint: string) {
  const metricExporter = process.env.OTEL_EXPORTER_OTLP_PROTOCOL === "HTTP"
    ? new HTTPOTLPMetricExporter({ url: otelEndpoint + "/v1/metrics", keepAlive: true })
    : new GRPCOTLPMetricExporter({ url: otelEndpoint });
  
  const metricReader = new PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 5000,
  });

  return metricReader;
}

export function createBuildInfoMetric(serviceName: string) {
  const meter = metrics.getMeter("otel-ts");
  const buildInfo = meter.createCounter("opentelemetry_lab_build_info");
  buildInfo.add(1, {
    language: "typescript",
    version: "v1.0.0",
    service: serviceName,
  });
}