// Copyright (c) Nicolas Lamirault <nicolas.lamirault@gmail.com>
//
// SPDX-License-Identifier: Apache-2.0

"use strict";
var __importDefault = (this && this.__importDefault) || function(mod) {
  return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeOpenTelemetry = initializeOpenTelemetry;
var process_1 = __importDefault(require("process"));
var sdk_node_1 = require("@opentelemetry/sdk-node");
var api_1 = require("@opentelemetry/api");
// import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
var exporter_trace_otlp_http_1 = require("@opentelemetry/exporter-trace-otlp-http");
var exporter_trace_otlp_grpc_1 = require("@opentelemetry/exporter-trace-otlp-grpc");
var exporter_logs_otlp_http_1 = require("@opentelemetry/exporter-logs-otlp-http");
var exporter_logs_otlp_grpc_1 = require("@opentelemetry/exporter-logs-otlp-grpc");
var exporter_metrics_otlp_http_1 = require("@opentelemetry/exporter-metrics-otlp-http");
var exporter_metrics_otlp_grpc_1 = require("@opentelemetry/exporter-metrics-otlp-grpc");
var resources_1 = require("@opentelemetry/resources");
var semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
var sdk_logs_1 = require("@opentelemetry/sdk-logs");
var sdk_metrics_1 = require("@opentelemetry/sdk-metrics");
var sdk_trace_base_1 = require("@opentelemetry/sdk-trace-base");
var instrumentation_http_1 = require("@opentelemetry/instrumentation-http");
var instrumentation_net_1 = require("@opentelemetry/instrumentation-net");
// Init
function initializeOpenTelemetry() {
  var _a;
  // OpenTelemetry debug
  api_1.diag.setLogger(new api_1.DiagConsoleLogger(), api_1.DiagLogLevel.DEBUG);
  var serviceName = process_1.default.env.OTEL_SERVICE_NAME || "otel-react";
  var resource = resources_1.Resource.default().merge(
    new resources_1.Resource(
      (_a = {},
        _a[semantic_conventions_1.ATTR_SERVICE_NAME] = serviceName,
        _a[semantic_conventions_1.ATTR_SERVICE_VERSION] = "1.0.0",
        _a),
    ),
  );
  var otelEndpoint = process_1.default.env.OTEL_EXPORTER_OTLP_ENDPOINT
    || "http://otel_collector:4317";
  var logExporter = process_1.default.env.OTEL_EXPORTER_OTLP_PROTOCOL === "HTTP"
    ? new exporter_logs_otlp_http_1.OTLPLogExporter({ url: otelEndpoint, keepAlive: true })
    : new exporter_logs_otlp_grpc_1.OTLPLogExporter({ url: otelEndpoint });
  var logRecordProcessor = new sdk_logs_1.BatchLogRecordProcessor(logExporter);
  var loggerProvider = new sdk_logs_1.LoggerProvider({
    resource: resource,
  });
  loggerProvider.addLogRecordProcessor(logRecordProcessor);
  var metricExporter = process_1.default.env.OTEL_EXPORTER_OTLP_PROTOCOL === "HTTP"
    ? new exporter_metrics_otlp_http_1.OTLPMetricExporter({ url: otelEndpoint, keepAlive: true })
    : new exporter_metrics_otlp_grpc_1.OTLPMetricExporter({ url: otelEndpoint });
  var metricReader = new sdk_metrics_1.PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 5000,
  });
  var traceExporter = process_1.default.env.OTEL_EXPORTER_OTLP_PROTOCOL === "HTTP"
    ? new exporter_trace_otlp_http_1.OTLPTraceExporter({ url: otelEndpoint, keepAlive: true })
    : new exporter_trace_otlp_grpc_1.OTLPTraceExporter({ url: otelEndpoint });
  var spanProcessor = new sdk_trace_base_1.BatchSpanProcessor(traceExporter);
  var sdk = new sdk_node_1.NodeSDK({
    instrumentations: [
      // getNodeAutoInstrumentations({
      //   // only instrument fs if it is part of another trace
      //   "@opentelemetry/instrumentation-fs": {
      //     requireParentSpan: true,
      //   },
      // }),
      new instrumentation_http_1.HttpInstrumentation(),
      new instrumentation_net_1.NetInstrumentation(),
    ],
    spanProcessors: [
      spanProcessor,
      new sdk_trace_base_1.SimpleSpanProcessor(new sdk_trace_base_1.ConsoleSpanExporter()),
    ],
    logRecordProcessors: [
      logRecordProcessor,
      new sdk_logs_1.SimpleLogRecordProcessor(new sdk_logs_1.ConsoleLogRecordExporter()),
    ],
    metricReader: metricReader,
    resource: resource,
    resourceDetectors: [
      resources_1.envDetectorSync,
      resources_1.hostDetectorSync,
      resources_1.osDetectorSync,
      resources_1.processDetectorSync,
      // alibabaCloudEcsDetector,
      // awsEksDetector,
      // awsEc2Detector,
      // gcpDetector
    ],
  });
  sdk.start();
  return;
}
// // gracefully shut down the SDK on process exit
// process.on("SIGTERM", () => {
//   sdk
//     .shutdown()
//     .then(() => diag.info("Tracing and Metrics terminated"))
//     .catch((error: any) =>
//       diag.error("Error terminating tracing and metrics", error),
//     )
//     .finally(() => process.exit(0));
// });
// # sourceMappingURL=initialize.js.map
