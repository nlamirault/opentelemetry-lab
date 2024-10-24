import {
  diag,
  // Context,
  DiagConsoleLogger,
  DiagLogLevel,
} from "@opentelemetry/api";
import { NodeSDK } from "@opentelemetry/sdk-node";
import process from "process";
// import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPLogExporter as GRPCOTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-grpc";
import { OTLPLogExporter as HTTPOTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { OTLPMetricExporter as GRPCOTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-grpc";
import { OTLPMetricExporter as HTTPOTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPTraceExporter as GRPCOTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc";
import { OTLPTraceExporter as HTTPOTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { NetInstrumentation } from "@opentelemetry/instrumentation-net";
import {
  envDetectorSync,
  hostDetectorSync,
  osDetectorSync,
  processDetectorSync,
  Resource,
} from "@opentelemetry/resources";
import {
  BatchLogRecordProcessor,
  ConsoleLogRecordExporter,
  LoggerProvider,
  SimpleLogRecordProcessor,
} from "@opentelemetry/sdk-logs";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import {
  BatchSpanProcessor,
  ConsoleSpanExporter,
  SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";

// Init

export function initializeOpenTelemetry() {
  // OpenTelemetry debug
  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);

  const serviceName = process.env.OTEL_SERVICE_NAME || "otel-react";
  const resource = Resource.default().merge(
    new Resource({
      [ATTR_SERVICE_NAME]: serviceName,
      [ATTR_SERVICE_VERSION]: "1.0.0",
    }),
  );

  const otelEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://otel_collector:4317";

  const logExporter = process.env.OTEL_EXPORTER_OTLP_PROTOCOL === "HTTP"
    ? new HTTPOTLPLogExporter({ url: otelEndpoint, keepAlive: true })
    : new GRPCOTLPLogExporter({ url: otelEndpoint });

  const logRecordProcessor = new BatchLogRecordProcessor(logExporter);
  const loggerProvider = new LoggerProvider({
    resource,
  });
  loggerProvider.addLogRecordProcessor(logRecordProcessor);

  const metricExporter = process.env.OTEL_EXPORTER_OTLP_PROTOCOL === "HTTP"
    ? new HTTPOTLPMetricExporter({ url: otelEndpoint, keepAlive: true })
    : new GRPCOTLPMetricExporter({ url: otelEndpoint });
  const metricReader = new PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 5000,
  });

  const traceExporter = process.env.OTEL_EXPORTER_OTLP_PROTOCOL === "HTTP"
    ? new HTTPOTLPTraceExporter({ url: otelEndpoint, keepAlive: true })
    : new GRPCOTLPTraceExporter({ url: otelEndpoint });
  const spanProcessor = new BatchSpanProcessor(traceExporter);

  const sdk = new NodeSDK({
    instrumentations: [
      // getNodeAutoInstrumentations({
      //   // only instrument fs if it is part of another trace
      //   "@opentelemetry/instrumentation-fs": {
      //     requireParentSpan: true,
      //   },
      // }),
      new HttpInstrumentation(),
      new NetInstrumentation(),
    ],
    spanProcessors: [
      spanProcessor,
      new SimpleSpanProcessor(new ConsoleSpanExporter()),
    ],
    logRecordProcessors: [
      logRecordProcessor,
      new SimpleLogRecordProcessor(new ConsoleLogRecordExporter()),
    ],
    metricReader: metricReader,
    resource: resource,
    resourceDetectors: [
      envDetectorSync,
      hostDetectorSync,
      osDetectorSync,
      processDetectorSync,
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
