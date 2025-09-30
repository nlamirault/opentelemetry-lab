// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

const otlpLogGrpc = require("@opentelemetry/exporter-logs-otlp-grpc");
const otlpLogHttp = require("@opentelemetry/exporter-logs-otlp-http");
const {
  BatchLogRecordProcessor,
  LoggerProvider,
  ConsoleLogRecordExporter,
  SimpleLogRecordProcessor,
} = require("@opentelemetry/sdk-logs");

function setupLogger(resource, otelEndpoint, otlpProtocol) {
  let otlpLogExporter;
  switch (otlpProtocol) {
    case "grpc":
      otlpLogExporter = new otlpLogGrpc.OTLPLogExporter({
        url: otelEndpoint,
      });
      break;
    case "http":
      otlpLogExporter = new otlpLogHttp.OTLPLogExporter({
        url: otelEndpoint,
        keepAlive: true,
      });
      break;
    default:
      console.log("OpenTelemetry logs invalid protocol: " + otlpProtocol);
  }

  const loggerProvider = new LoggerProvider({
    resource,
  });
  const batchLogRecordProcessor = new BatchLogRecordProcessor({
    exporter: otlpLogExporter,
  });
  loggerProvider.addLogRecordProcessor(batchLogRecordProcessor);

  const consoleLogExporter = new ConsoleLogRecordExporter();
  loggerProvider.addLogRecordProcessor(
    new SimpleLogRecordProcessor(consoleLogExporter),
  );
  return loggerProvider;
}

module.exports = { setupLogger };