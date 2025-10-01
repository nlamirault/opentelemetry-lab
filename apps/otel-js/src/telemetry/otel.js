// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

const opentelemetry = require("@opentelemetry/sdk-node");
const { DiagConsoleLogger, DiagLogLevel, diag } = require("@opentelemetry/api");
const { HttpInstrumentation } = require("@opentelemetry/instrumentation-http");
const { NetInstrumentation } = require("@opentelemetry/instrumentation-net");
const {
  ExpressInstrumentation,
} = require("@opentelemetry/instrumentation-express");
const { PinoInstrumentation } = require("@opentelemetry/instrumentation-pino");
const {
  containerDetector,
} = require("@opentelemetry/resource-detector-container");
// const {alibabaCloudEcsDetector} = require('@opentelemetry/resource-detector-alibaba-cloud')
// const {awsEc2Detector, awsEksDetector} = require('@opentelemetry/resource-detector-aws')
// const {gcpDetector} = require('@opentelemetry/resource-detector-gcp')
const {
  envDetector,
  hostDetector,
  osDetector,
  processDetector,
  Resource,
} = require("@opentelemetry/resources");
const {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} = require("@opentelemetry/semantic-conventions");

const { setupLogger } = require("./logger");
const { setupMeter } = require("./meter");
const { setupTracer } = require("./tracer");

function createResource(serviceName) {
  return Resource.default().merge(
    new Resource({
      [ATTR_SERVICE_NAME]: serviceName,
      [ATTR_SERVICE_VERSION]: "v1.0.0",
    }),
  );
}

const setup_opentelemetry = function () {
  const otlpProtocol = process.env.OTEL_EXPORTER_OTLP_PROTOCOL || "grpc";
  const otlpEndpoint =
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://127.0.0.1:4317";
  const serviceName = process.env.OTEL_SERVICE_NAME || "otel-js";

  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);

  const res = createResource(serviceName);
  const loggerProvider = setupLogger(res, otlpEndpoint, otlpProtocol);
  const tracerProvider = setupTracer(res, otlpEndpoint, otlpProtocol);
  const meterProvider = setupMeter(res, otlpEndpoint, otlpProtocol);

  const sdk = new opentelemetry.NodeSDK({
    instrumentations: [
      // getNodeAutoInstrumentations({
      //   // only instrument fs if it is part of another trace
      //   "@opentelemetry/instrumentation-fs": {
      //     requireParentSpan: true,
      //   },
      // }),
      new HttpInstrumentation(),
      new ExpressInstrumentation(),
      new NetInstrumentation(),
      // new PinoInstrumentation(),
      new PinoInstrumentation({
        logHook: (_span, record) => {
          record["service.name"] =
            tracerProvider.resource.attributes["service.name"];
        },
      }),
    ],
    loggerProvider: loggerProvider,
    meterProvider: meterProvider,
    tracerProvider: tracerProvider,
    resource: res,
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
};

module.exports = { setup_opentelemetry };
