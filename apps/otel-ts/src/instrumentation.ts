// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

// OpenTelemetry SDK bootstrap, preloaded with `node --require ./dist/instrumentation.js`
// so instrumentations patch `http` before fastify loads it. Import only
// OpenTelemetry modules here. Exporters, protocol and endpoint come from the
// standard OTEL_* environment variables (OTEL_TRACES_EXPORTER, ...).

import { FastifyOtelInstrumentation } from "@fastify/otel";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { containerDetector } from "@opentelemetry/resource-detector-container";
import {
  defaultResource,
  envDetector,
  hostDetector,
  osDetector,
  processDetector,
  resourceFromAttributes,
} from "@opentelemetry/resources";
import { NodeSDK } from "@opentelemetry/sdk-node";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";

import { createBuildInfoMetric } from "./otel";

const serviceName = process.env.OTEL_SERVICE_NAME || "otel-ts";

export const sdk = new NodeSDK({
  // Defaults only: detected attributes (OTEL_RESOURCE_ATTRIBUTES included) win.
  resource: defaultResource().merge(
    resourceFromAttributes({
      [ATTR_SERVICE_NAME]: serviceName,
      [ATTR_SERVICE_VERSION]: "v1.0.0",
    }),
  ),
  resourceDetectors: [
    envDetector,
    processDetector,
    hostDetector,
    osDetector,
    containerDetector,
  ],
  instrumentations: [
    getNodeAutoInstrumentations({
      // fastify binds to 0.0.0.0: skip that lookup, a lone root span at startup.
      "@opentelemetry/instrumentation-dns": { ignoreHostnames: ["0.0.0.0"] },
    }),
    new FastifyOtelInstrumentation({ registerOnInitialization: true }),
  ],
});

sdk.start();

createBuildInfoMetric(serviceName);
