// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

const otlpMetricGrpc = require("@opentelemetry/exporter-metrics-otlp-grpc");
const otlpMetricHttp = require("@opentelemetry/exporter-metrics-otlp-http");
const {
  MeterProvider,
  PeriodicExportingMetricReader,
  ConsoleMetricExporter,
} = require("@opentelemetry/sdk-metrics");

function setupMeter(resource, otelEndpoint, otlpProtocol) {
  let otlpMetricExporter;
  switch (otlpProtocol) {
    case "grpc":
      otlpMetricExporter = new otlpMetricGrpc.OTLPMetricExporter({
        url: otelEndpoint,
      });
      break;
    case "http":
      otlpMetricExporter = new otlpMetricHttp.OTLPMetricExporter({
        url: otelEndpoint + "/v1/metrics",
        keepAlive: true,
      });
      break;
    default:
      console.log("OpenTelemetry metrics invalid protocol: " + otlpProtocol);
  }
  const otlpMetricReader = new PeriodicExportingMetricReader({
    exporter: otlpMetricExporter,
    exportIntervalMillis: 5000,
  });

  const consoleMetricExporter = new ConsoleMetricExporter();
  const consoleMetricReader = new PeriodicExportingMetricReader({
    exporter: consoleMetricExporter,
    exportIntervalMillis: 5000,
  });

  const meterProvider = new MeterProvider({
    resource: resource,
    readers: [consoleMetricReader, otlpMetricReader],
  });
  return meterProvider;
}

module.exports = { setupMeter };
