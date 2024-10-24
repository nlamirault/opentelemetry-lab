// Copyright (c) Nicolas Lamirault <nicolas.lamirault@gmail.com>
//
// SPDX-License-Identifier: Apache-2.0

const opentelemetry = require("@opentelemetry/sdk-node");
// const {
//   getNodeAutoInstrumentations,
// } = require("@opentelemetry/auto-instrumentations-node");
const { DiagConsoleLogger, DiagLogLevel, diag } = require("@opentelemetry/api");
// const { W3CTraceContextPropagator } = require("@opentelemetry/core");
const logsAPI = require("@opentelemetry/api-logs");
const otlpLogGrpc = require("@opentelemetry/exporter-logs-otlp-grpc");
const otlpLogHttp = require("@opentelemetry/exporter-logs-otlp-http");
const otlpMetricGrpc = require("@opentelemetry/exporter-metrics-otlp-grpc");
const otlpMetricHttp = require("@opentelemetry/exporter-metrics-otlp-http");
const otlpTraceGrpc = require("@opentelemetry/exporter-trace-otlp-grpc");
const otlpTraceHttp = require("@opentelemetry/exporter-trace-otlp-http");
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
  SemanticResourceAttributes,
} = require("@opentelemetry/semantic-conventions");
const {
  BatchLogRecordProcessor,
  LoggerProvider,
  LogRecordProcessor,
  // SimpleLogRecordProcessor
} = require("@opentelemetry/sdk-logs");
const {
  BasicTracerProvider,
  BatchSpanProcessor,
  ConsoleSpanExporter,
  SimpleSpanProcessor,
} = require("@opentelemetry/sdk-trace-base");
const {
  MeterProvider,
  PeriodicExportingMetricReader,
} = require("@opentelemetry/sdk-metrics");

const express = require("express");
const axios = require("axios");

// OpenTelemetry debug
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);

const serviceName = process.env.OTEL_SERVICE_NAME || "otel-js";
const resource = Resource.default().merge(
  new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
    [SemanticResourceAttributes.SERVICE_NAMESPACE]: process.env.SERVICE_NAMESPACE || "otel_lab",
  }),
);

const otelEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://otel_collector:4317";

let logExporter;
switch (process.env.OTEL_EXPORTER_OTLP_PROTOCOL) {
  case "grpc":
    logExporter = new otlpLogGrpc.OTLPLogExporter({
      url: otelEndpoint,
    });
    break;
  case "http":
    logExporter = new otlpLogHttp.OTLPLogExporter({
      url: otelEndpoint,
      keepAlive: true,
    });
    break;
  default:
    console.log(
      "OpenTelemetry logs invalid protocol: " + process.env.OTEL_LOGS_EXPORTER,
    );
}

const logRecordProcessor = new BatchLogRecordProcessor({
  exporter: logExporter,
});
// const logRecordProcessor = new SimpleLogRecordProcessor({
//   exporter: logExporter
// })
// use SDK instead
const loggerProvider = new LoggerProvider({
  resource,
});
loggerProvider.addLogRecordProcessor(logRecordProcessor);

let metricExporter;
switch (process.env.OTEL_EXPORTER_OTLP_PROTOCOL) {
  case "grpc":
    metricExporter = new otlpMetricGrpc.OTLPMetricExporter({
      url: otelEndpoint,
    });
    break;
  case "http":
    metricExporter = new otlpMetricHttp.OTLPMetricExporter({
      url: otelEndpoint,
      keepAlive: true,
    });
    break;
  default:
    console.log(
      "OpenTelemetry metrics invalid protocol: "
        + process.env.OTEL_METRICS_EXPORTER,
    );
}
const metricReader = new PeriodicExportingMetricReader({
  exporter: metricExporter,
  exportIntervalMillis: 5000,
});
// use SDK instead
// const meterProvider = new MeterProvider({
//   resource: resource,
// });
// meterProvider.addMetricReader(metricReader);

let traceExporter;
switch (process.env.OTEL_EXPORTER_OTLP_PROTOCOL) {
  case "grpc":
    traceExporter = new otlpTraceGrpc.OTLPTraceExporter({
      url: otelEndpoint,
    });
    break;
  case "http":
    traceExporter = new otlpTraceHttp.OTLPTraceExporter({
      url: otelEndpoint,
      keepAlive: true,
    });
    break;
  default:
    console.log(
      "OpenTelemetry traces invalid protocol: "
        + process.env.OTEL_TRACES_EXPORTER,
    );
}

// const spanProcessor = new SimpleSpanProcessor(traceExporter);
const spanProcessor = new BatchSpanProcessor(traceExporter);
// use SDK instead
// const tracerProvider = new BasicTracerProvider({
//   resource: resource,
// });
// tracerProvider.addSpanProcessor(
//   new SimpleSpanProcessor(new ConsoleSpanExporter()),
// );
// tracerProvider.addSpanProcessor(new SimpleSpanProcessor(traceExporter));
// tracerProvider.register();

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
    new PinoInstrumentation(),
  ],
  spanProcessors: [
    spanProcessor,
    new SimpleSpanProcessor(new ConsoleSpanExporter()),
  ],
  logRecordProcessor: logRecordProcessor,
  metricReader: metricReader,
  resource: resource,
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

const pino = require("pino");
const logger = pino();

process.on("SIGTERM", () => {
  sdk
    .shutdown()
    .then(() => console.log("Tracing terminated"))
    .catch((error) => console.log("Error terminating tracing", error))
    .finally(() => process.exit(0));
});

const loggerOtel = loggerProvider.getLogger(serviceName);
// loggerProvider.shutdown().catch(logger.info)

const app = express();
const port = process.env.EXPOSE_PORT || 3000;

logger.info("Bootstrap the OpenTelemetry application");

loggerOtel.emit({
  severityNumber: logsAPI.SeverityNumber.INFO,
  severityText: "INFO",
  body: "bootstrap",
  attributes: { "log.type": "LogRecord" },
});

const TARGET_ONE_SVC = process.env.TARGET_ONE_SVC || `localhost:${port}`;
const TARGET_TWO_SVC = process.env.TARGET_TWO_SVC || `localhost:${port}`;

app.get("/", (req, res) => {
  logger.info("Hello World");
  res.json({ Hello: "World" });
});

app.get("/items/:item_id", (req, res) => {
  logger.info("items");
  res.json({ item_id: req.params.item_id, q: req.query.q });
});

app.get("/io_task", (req, res) => {
  setTimeout(() => {
    logger.info("io task");
    res.send("IO bound task finish!");
  }, 1000);
});

app.get("/cpu_task", (req, res) => {
  for (let i = 0; i < 1000; i++) {
    _ = i * i * i;
  }
  logger.info("cpu task");
  res.send("CPU bound task finish!");
});

app.get("/random_status", (req, res) => {
  const statusCodes = [200, 200, 300, 400, 500];
  const randomStatusCode = statusCodes[Math.floor(Math.random() * statusCodes.length)];
  res.status(randomStatusCode);
  logger.info("random status");
  res.json({ path: "/random_status" });
});

app.get("/random_sleep", (req, res) => {
  const sleepTime = Math.floor(Math.random() * 6);
  setTimeout(() => {
    logger.info("random sleep");
    res.json({ path: "/random_sleep" });
  }, sleepTime * 1000);
});

app.get("/error_test", (req, res) => {
  logger.info("got error!!!!");
  throw new Error("value error");
});

app.get("/chain", async (req, res) => {
  logger.info("Chain Start");
  await axios.get(`http://${TARGET_ONE_SVC}/`);
  await axios.get(`http://${TARGET_ONE_SVC}/`);
  await axios.get(`http://${TARGET_TWO_SVC}/`);
  logger.info("Chain Finished");
  res.json({ path: "/chain" });
});

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
  loggerOtel.emit({
    severityNumber: logsAPI.SeverityNumber.INFO,
    severityText: "INFO",
    body: "App listening on ${port}",
    attributes: { "log.type": "LogRecord" },
  });
});
