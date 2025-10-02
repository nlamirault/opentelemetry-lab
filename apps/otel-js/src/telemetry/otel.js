// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

const opentelemetry = require("@opentelemetry/sdk-node");
const { DiagConsoleLogger, DiagLogLevel, diag } = require("@opentelemetry/api");
const { HttpInstrumentation } = require("@opentelemetry/instrumentation-http");
const { NetInstrumentation } = require("@opentelemetry/instrumentation-net");
const { PinoInstrumentation } = require("@opentelemetry/instrumentation-pino");
const {
  containerDetector,
} = require("@opentelemetry/resource-detector-container");
const {
  defaultResource,
  detectResources,
  envDetector,
  hostDetector,
  osDetector,
  processDetector,
  resourceFromAttributes,
} = require("@opentelemetry/resources");
const {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} = require("@opentelemetry/semantic-conventions");

const { setupLogger } = require("./logger");
const { setupMeter } = require("./meter");
const { setupTracer } = require("./tracer");

function createResource(serviceName) {
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

  return defaultResource().merge(detectedResources).merge(customResource);
}

const setup_opentelemetry = function () {
  const otlpProtocol = process.env.OTEL_EXPORTER_OTLP_PROTOCOL || "grpc";
  const otlpEndpoint =
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://127.0.0.1:4317";
  const serviceName = process.env.OTEL_SERVICE_NAME || "otel-js";

  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);

  // Create base resource with service info and SDK attributes
  const baseResource = createResource(serviceName);

  // The NodeSDK will automatically detect and merge additional resources
  // from the configured resourceDetectors (OS, Process, Host, Container, etc.)
  const loggerProvider = setupLogger(baseResource, otlpEndpoint, otlpProtocol);
  const tracerProvider = setupTracer(baseResource, otlpEndpoint, otlpProtocol);
  const meterProvider = setupMeter(baseResource, otlpEndpoint, otlpProtocol);

  const sdk = new opentelemetry.NodeSDK({
    instrumentations: [
      // getNodeAutoInstrumentations({
      //   // only instrument fs if it is part of another trace
      //   "@opentelemetry/instrumentation-fs": {
      //     requireParentSpan: true,
      //   },
      // }),
      new HttpInstrumentation(),
      new NetInstrumentation(),
      // new PinoInstrumentation(),
      new PinoInstrumentation({
        enabled: true,
        logHook: (_span, record) => {
          record["service.name"] =
            tracerProvider.resource.attributes["service.name"];
        },
      }),
    ],
    loggerProvider: loggerProvider,
    meterProvider: meterProvider,
    tracerProvider: tracerProvider,
    resource: baseResource,
    resourceDetectors: [
      containerDetector,
      envDetector,
      hostDetector,
      osDetector,
      processDetector,
      // alibabaCloudEcsDetector,
      // awsEksDetector,
      // awsEc2Detector,
      // gcpDetector
    ],
  });
  sdk.start();

  return { loggerProvider, tracerProvider, meterProvider };
};

module.exports = { setup_opentelemetry };
