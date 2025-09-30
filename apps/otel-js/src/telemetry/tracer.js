// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

const {
  CompositePropagator,
  W3CBaggagePropagator,
  W3CTraceContextPropagator,
} = require("@opentelemetry/core");
const otlpTraceGrpc = require("@opentelemetry/exporter-trace-otlp-grpc");
const otlpTraceHttp = require("@opentelemetry/exporter-trace-otlp-http");
const {
  BatchSpanProcessor,
  ConsoleSpanExporter,
  SimpleSpanProcessor,
} = require("@opentelemetry/sdk-trace-base");
const { NodeTracerProvider } = require("@opentelemetry/sdk-trace-node");

function setupTracer(resource, otelEndpoint, otlpProtocol) {
  let traceExporter;
  switch (otlpProtocol) {
    case "grpc":
      traceExporter = new otlpTraceGrpc.OTLPTraceExporter({
        url: otelEndpoint,
      });
      break;
    case "http":
      traceExporter = new otlpTraceHttp.OTLPTraceExporter({
        url: otelEndpoint,
        keepAlive: true,
      });
      break;
    default:
      console.log("OpenTelemetry traces invalid protocol: " + otlpProtocol);
  }
  const otlpSpanProcessor = new BatchSpanProcessor(traceExporter);

  const consoleSpanExporter = new ConsoleSpanExporter();
  const consoleSpanProcessor = new SimpleSpanProcessor(consoleSpanExporter);

  const tracerProvider = new NodeTracerProvider({
    resource: resource,
    forceFlushTimeoutMillis: 10000,
  });
  tracerProvider.addSpanProcessor(consoleSpanProcessor);
  tracerProvider.addSpanProcessor(otlpSpanProcessor);
  tracerProvider.register({
    propagator: new CompositePropagator({
      propagators: [
        new W3CBaggagePropagator(),
        new W3CTraceContextPropagator(),
      ],
    }),
  });

  return tracerProvider;
}

module.exports = { setupTracer };