// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import {
  diag,
  DiagConsoleLogger,
  DiagLogLevel,
} from "@opentelemetry/api";
import { NodeSDK } from "@opentelemetry/sdk-node";
import process from "process";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { NetInstrumentation } from "@opentelemetry/instrumentation-net";
import {
  envDetectorSync,
  hostDetectorSync,
  osDetectorSync,
  processDetectorSync,
  Resource,
} from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";
import { initializeLogger } from "./logger";
import { initializeMeter, createBuildInfoMetric } from "./meter";
import { initializeTracer } from "./tracer";

// Init

export function initializeOpenTelemetry() {
  // OpenTelemetry debug
  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);

  const serviceName = process.env.OTEL_SERVICE_NAME || "otel-ts";
  const resource = Resource.default().merge(
    new Resource({
      [ATTR_SERVICE_NAME]: serviceName,
      [ATTR_SERVICE_VERSION]: "1.0.0",
    }),
  );

  const otelEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://otel_collector:4318";

  // Initialize components using split modules
  const { logRecordProcessor, consoleLogRecordProcessor } = initializeLogger(resource, otelEndpoint);
  const metricReader = initializeMeter(otelEndpoint);
  const { spanProcessor, consoleSpanProcessor } = initializeTracer(otelEndpoint);

  const sdk = new NodeSDK({
    instrumentations: [
      new HttpInstrumentation(),
      new NetInstrumentation(),
    ],
    spanProcessors: [
      spanProcessor,
      consoleSpanProcessor,
    ],
    logRecordProcessors: [
      logRecordProcessor,
      consoleLogRecordProcessor,
    ],
    metricReader: metricReader,
    resource: resource,
    resourceDetectors: [
      envDetectorSync,
      hostDetectorSync,
      osDetectorSync,
      processDetectorSync,
    ],
  });
  sdk.start();

  // Create build info metric
  createBuildInfoMetric(serviceName);

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
