// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { diag, DiagConsoleLogger, DiagLogLevel } from "@opentelemetry/api";
import { NodeSDK } from "@opentelemetry/sdk-node";
import process from "process";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { NetInstrumentation } from "@opentelemetry/instrumentation-net";
import {
  defaultResource,
  detectResources,
  envDetector,
  hostDetector,
  osDetector,
  processDetector,
  resourceFromAttributes,
} from "@opentelemetry/resources";
import { containerDetector } from "@opentelemetry/resource-detector-container";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import { initializeLogger } from "./logger";
import { initializeMeter, createBuildInfoMetric } from "./meter";
import { initializeTracer } from "./tracer";
import { setLoggerProvider } from "./logging";

// Init

export function initializeOpenTelemetry() {
  // OpenTelemetry debug
  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);

  const serviceName = process.env.OTEL_SERVICE_NAME || "otel-ts";

  // Create resource with detected and custom attributes like JavaScript implementation
  const detectedResources = detectResources({
    detectors: [
      envDetector,
      processDetector,
      hostDetector,
      osDetector,
      containerDetector,
    ],
  });
  const customResource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: serviceName,
    [ATTR_SERVICE_VERSION]: "v1.0.0",
  });

  const resource = defaultResource()
    .merge(detectedResources)
    .merge(customResource);

  const otelEndpoint =
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://otel_collector:4318";

  // Initialize components using split modules
  const { loggerProvider, logRecordProcessor, consoleLogRecordProcessor } =
    initializeLogger(resource, otelEndpoint);
  const metricReader = initializeMeter(otelEndpoint);
  const { spanProcessor, consoleSpanProcessor } =
    initializeTracer(otelEndpoint);

  // Set the logging logger provider
  setLoggerProvider(loggerProvider);

  const sdk = new NodeSDK({
    instrumentations: [new HttpInstrumentation(), new NetInstrumentation()],
    resource: resource,
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
