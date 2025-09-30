// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { OTLPLogExporter as GRPCOTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-grpc";
import { OTLPLogExporter as HTTPOTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import {
  BatchLogRecordProcessor,
  ConsoleLogRecordExporter,
  LoggerProvider,
  SimpleLogRecordProcessor,
} from "@opentelemetry/sdk-logs";
import { Resource } from "@opentelemetry/resources";

export function initializeLogger(resource: Resource, otelEndpoint: string) {
  const logExporter = process.env.OTEL_EXPORTER_OTLP_PROTOCOL === "HTTP"
    ? new HTTPOTLPLogExporter({ url: otelEndpoint + "/v1/logs", keepAlive: true })
    : new GRPCOTLPLogExporter({ url: otelEndpoint });

  const logRecordProcessor = new BatchLogRecordProcessor(logExporter);
  const loggerProvider = new LoggerProvider({
    resource,
  });
  loggerProvider.addLogRecordProcessor(logRecordProcessor);

  return {
    logRecordProcessor,
    consoleLogRecordProcessor: new SimpleLogRecordProcessor(new ConsoleLogRecordExporter()),
  };
}