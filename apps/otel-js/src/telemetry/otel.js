const opentelemetry = require("@opentelemetry/sdk-node");
const { DiagConsoleLogger, DiagLogLevel, diag } = require("@opentelemetry/api");
const {
  CompositePropagator,
  W3CBaggagePropagator,
  W3CTraceContextPropagator,
} = require("@opentelemetry/core");
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
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} = require("@opentelemetry/semantic-conventions");
const {
  BatchLogRecordProcessor,
  LoggerProvider,
  // LogRecordProcessor,
  ConsoleLogRecordExporter,
  SimpleLogRecordProcessor,
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
  ConsoleMetricExporter,
} = require("@opentelemetry/sdk-metrics");
const { NodeTracerProvider } = require("@opentelemetry/sdk-trace-node");

function createResource(serviceName) {
  return Resource.default().merge(
    new Resource({
      [ATTR_SERVICE_NAME]: serviceName,
      [ATTR_SERVICE_VERSION]: "v1.0.0",
    }),
  );
}

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

function setupMeter(resource, otelEndpoint, otlpProtocol) {
  let otlpMetricExporter;
  switch (otlpProtocol) {
    case "grpc":
      otlpMetricExporter = new otlpMetricGrpc.OTLPMetricExporter({
        url: otelEndpoint,
      });
      break;
    case "http":
      otlpMetricExporter = new otlpMetricHttp.OTLPMetricExporter({
        url: otelEndpoint,
        keepAlive: true,
      });
      break;
    default:
      console.log("OpenTelemetry metrics invalid protocol: " + otlpProtocol);
  }
  const otlpMetricReader = new PeriodicExportingMetricReader({
    exporter: otlpMetricExporter,
    exportIntervalMillis: 5000,
  });

  const consoleMetricExporter = new ConsoleMetricExporter();
  const consoleMetricReader = new PeriodicExportingMetricReader({
    exporter: consoleMetricExporter,
    exportIntervalMillis: 5000,
  });

  const meterProvider = new MeterProvider({
    resource: resource,
    readers: [consoleMetricReader, otlpMetricReader],
  });
  return meterProvider;
}

function setupTracer(resource, otelEndpoint, otlpProtocol) {
  let traceExporter;
  switch (otlpProtocol) {
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
      console.log("OpenTelemetry traces invalid protocol: " + otlpProtocol);
  }
  const otlpSpanProcessor = new BatchSpanProcessor(traceExporter);

  const consoleSpanExporter = new ConsoleSpanExporter();
  const consoleSpanProcessor = new SimpleSpanProcessor(consoleSpanExporter);

  const tracerProvider = new NodeTracerProvider({
    resource: resource,
    forceFlushTimeoutMillis: 10000,
  });
  tracerProvider.addSpanProcessor(consoleSpanProcessor);
  tracerProvider.addSpanProcessor(otlpSpanProcessor);
  tracerProvider.register({
    propagator: new CompositePropagator({
      propagators: [
        new W3CBaggagePropagator(),
        new W3CTraceContextPropagator(),
      ],
    }),
  });

  return tracerProvider;
}

const setup_opentelemetry = function () {
  const otlpProtocol = process.env.OTEL_EXPORTER_OTLP_PROTOCOL || "http";
  const otlpEndpoint =
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://otel_collector:4317";
  const serviceName = process.env.OTEL_SERVICE_NAME || "otel-js";

  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);

  const res = createResource(serviceName);
  const loggerProvider = setupLogger(
    res,
    otlpEndpoint + "/v1/logs",
    otlpProtocol,
  );
  const tracerProvider = setupTracer(
    res,
    otlpEndpoint + "/v1/traces",
    otlpProtocol,
  );
  const meterProvider = setupMeter(
    res,
    otlpEndpoint + "/v1/metrics",
    otlpProtocol,
  );

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
