// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { OTLPTraceExporter as GRPCOTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc";
import { OTLPTraceExporter as HTTPOTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import {
  BatchSpanProcessor,
  ConsoleSpanExporter,
  SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-base";

export function initializeTracer(otelEndpoint: string) {
  const traceExporter = process.env.OTEL_EXPORTER_OTLP_PROTOCOL === "HTTP"
    ? new HTTPOTLPTraceExporter({ url: otelEndpoint + "/v1/traces", keepAlive: true })
    : new GRPCOTLPTraceExporter({ url: otelEndpoint });
  
  const spanProcessor = new BatchSpanProcessor(traceExporter);

  return {
    spanProcessor,
    consoleSpanProcessor: new SimpleSpanProcessor(new ConsoleSpanExporter()),
  };
}